"""FastAPI Todo Application with WebSocket real-time sync and recurring task automation."""
import os
import socket
from datetime import datetime, timezone
from typing import List, Optional, Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import asc, text
from dateutil.relativedelta import relativedelta

from database import engine, get_db, Base
from models import Todo
from schemas import TodoCreate, TodoUpdate, TodoReorder, TodoResponse


# ---------------------------------------------------------------------------
# Database Migration Helper (Safe auto-column addition for SQLite)
# ---------------------------------------------------------------------------

def _ensure_sqlite_columns():
    """Ensure newly added columns exist in the SQLite database without wiping user data."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(todos)"))
        existing_cols = [row[1] for row in result.fetchall()]
        if "recurrence" not in existing_cols:
            conn.execute(text("ALTER TABLE todos ADD COLUMN recurrence VARCHAR DEFAULT 'none'"))
        if "completed_at" not in existing_cols:
            conn.execute(text("ALTER TABLE todos ADD COLUMN completed_at DATETIME NULL"))
        conn.commit()


_ensure_sqlite_columns()


# ---------------------------------------------------------------------------
# WebSocket Real-Time Connection Manager (Cross-Device Sync)
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Manages active WebSockets and broadcasts changes across phone, tablet, and PC."""
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

    @property
    def client_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_sqlite_columns()
    yield


app = FastAPI(
    title="Taskflow Todo API",
    description="Full-featured Todo API with recurring tasks, drag-and-drop, and cross-device sync.",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Serve Frontend Static Build if present
# ---------------------------------------------------------------------------

dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(dist_path, "index.html"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _next_position(db: Session) -> float:
    """Return the next available position value."""
    last = db.query(Todo).order_by(Todo.position.desc()).first()
    return (last.position + 1024.0) if last else 1024.0


def _calculate_next_date(base_dt: datetime, recurrence: str) -> datetime:
    """Calculate the next date based on recurrence pattern."""
    if recurrence == "daily":
        return base_dt + relativedelta(days=1)
    elif recurrence == "weekly":
        return base_dt + relativedelta(weeks=1)
    elif recurrence == "monthly":
        return base_dt + relativedelta(months=1)
    return base_dt


def _handle_recurring_task_completion(todo: Todo, db: Session) -> Optional[Todo]:
    """If a task with recurrence is completed, spawn the next recurrence instance."""
    if not todo.recurrence or todo.recurrence == "none":
        return None

    now = datetime.now(timezone.utc)
    base_reminder = todo.reminder_at or now
    next_reminder = _calculate_next_date(base_reminder, todo.recurrence)

    next_todo = Todo(
        title=todo.title,
        description=todo.description,
        category=todo.category,
        priority=todo.priority,
        reminder_at=next_reminder,
        recurrence=todo.recurrence,
        completed=False,
        position=_next_position(db),
        created_at=now,
    )
    db.add(next_todo)
    return next_todo


# ---------------------------------------------------------------------------
# WebSocket Endpoint (Real-Time Cross-Device Sync)
# ---------------------------------------------------------------------------

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket connection for cross-device sync."""
    await manager.connect(websocket)
    try:
        # Send initial connected confirmation with active count
        await websocket.send_json({
            "type": "connected",
            "active_clients": manager.client_count,
        })
        while True:
            # Keep connection alive & listen for client ping or sync triggers
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({
            "type": "client_count",
            "active_clients": manager.client_count,
        })


# ---------------------------------------------------------------------------
# Network Info (For QR Code & Easy Phone/Tablet Connect)
# ---------------------------------------------------------------------------

@app.get("/api/system/network-info")
def get_network_info():
    """Return local IPv4 address so mobile devices can connect on the same Wi-Fi."""
    ip_list = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and not ip.startswith("169.254"):
                ip_list.append(ip)
    except Exception:
        pass

    primary_ip = ip_list[0] if ip_list else "localhost"
    return {
        "primary_ip": primary_ip,
        "all_ips": ip_list,
        "frontend_port": 5173,
        "backend_port": 8000,
        "frontend_url": f"http://{primary_ip}:5173",
        "backend_url": f"http://{primary_ip}:8000",
        "active_sync_clients": manager.client_count,
    }


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/todos", response_model=List[TodoResponse])
def list_todos(
    completed: Optional[bool] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all todos, optionally filtered by status or category."""
    query = db.query(Todo)
    if completed is not None:
        query = query.filter(Todo.completed == completed)
    if category:
        query = query.filter(Todo.category == category)
    return query.order_by(asc(Todo.position)).all()


@app.post("/api/todos", response_model=TodoResponse, status_code=201)
async def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    """Create a new todo item and notify all devices."""
    todo = Todo(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        reminder_at=payload.reminder_at,
        recurrence=payload.recurrence,
        completed=False,
        position=_next_position(db),
        created_at=datetime.now(timezone.utc),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)

    # Broadcast real-time update to all connected phones/tablets/PCs
    await manager.broadcast({"type": "todo_created", "todo_id": todo.id})
    return todo


@app.get("/api/todos/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    """Retrieve a single todo by ID."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.patch("/api/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(todo_id: int, payload: TodoUpdate, db: Session = Depends(get_db)):
    """Update a todo item, handling recurring completion automatically."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    update_data = payload.model_dump(exclude_unset=True)

    was_completed = todo.completed
    for key, value in update_data.items():
        setattr(todo, key, value)

    # Handle completion status change
    newly_completed = not was_completed and todo.completed
    if newly_completed:
        todo.completed_at = datetime.now(timezone.utc)
        # If recurring, spawn the next repetition
        _handle_recurring_task_completion(todo, db)
    elif was_completed and not todo.completed:
        todo.completed_at = None

    db.commit()
    db.refresh(todo)

    # Broadcast to all connected devices
    await manager.broadcast({"type": "todo_updated", "todo_id": todo.id})
    return todo


@app.delete("/api/todos/{todo_id}", status_code=204)
async def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    """Delete a todo item and notify all devices."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()

    # Broadcast deletion to all connected devices
    await manager.broadcast({"type": "todo_deleted", "todo_id": todo_id})


# ---------------------------------------------------------------------------
# Reorder Endpoint
# ---------------------------------------------------------------------------

@app.put("/api/todos/reorder", response_model=List[TodoResponse])
async def reorder_todos(
    items: List[TodoReorder],
    db: Session = Depends(get_db),
):
    """Bulk-update positions and sync new order to all devices."""
    for item in items:
        todo = db.query(Todo).filter(Todo.id == item.id).first()
        if todo:
            todo.position = item.position
    db.commit()

    await manager.broadcast({"type": "todos_reordered"})
    return db.query(Todo).order_by(asc(Todo.position)).all()


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

@app.get("/api/todos/reminders/upcoming", response_model=List[TodoResponse])
def upcoming_reminders(db: Session = Depends(get_db)):
    """Return todos with future reminders."""
    now = datetime.now(timezone.utc)
    return (
        db.query(Todo)
        .filter(Todo.reminder_at != None, Todo.reminder_at >= now, Todo.completed == False)
        .order_by(asc(Todo.reminder_at))
        .all()
    )


@app.get("/api/todos/reminders/due", response_model=List[TodoResponse])
def due_reminders(db: Session = Depends(get_db)):
    """Return todos whose reminder time has arrived and are not completed."""
    now = datetime.now(timezone.utc)
    return (
        db.query(Todo)
        .filter(Todo.reminder_at != None, Todo.reminder_at <= now, Todo.completed == False)
        .order_by(asc(Todo.reminder_at))
        .all()
    )
