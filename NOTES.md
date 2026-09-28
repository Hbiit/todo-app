# 📝 Taskflow Todo App — Beginner's Guide & Project Notes

Welcome to the **Taskflow Todo Application**! This guide is written specifically for you to understand how every part of the app works, how the technologies connect, and how you can run, customize, and maintain it.

---

## 📌 1. Project Overview

This is a **full-stack web application**:
- **Backend (Python + FastAPI)**: Runs on your computer in the background, manages the database, saves tasks, and handles scheduling logic.
- **Frontend (React + Vite)**: Runs in your web browser, displays the dark-mode user interface, handles button clicks, drag-and-drop animations, and alerts.
- **Database (SQLite)**: A lightweight, file-based database (`todos.db`) that saves all your tasks permanently on your hard drive.

```
┌────────────────────────────────┐          ┌────────────────────────────────┐
│      React Frontend            │  HTTP    │      FastAPI Backend           │
│   (http://localhost:5173)      │ ◄──────► │   (http://localhost:8000)      │
│  - Buttons, Drag-and-Drop, UI  │  (JSON)  │  - API Endpoints, Validation   │
└────────────────────────────────┘          └──────────────┬─────────────────┘
                                                           │ Reads / Writes
                                                           ▼
                                            ┌────────────────────────────────┐
                                            │      SQLite Database           │
                                            │         (todos.db)             │
                                            └────────────────────────────────┘
```

---

## 🚀 2. How to Run the Application

### ⚡ The 1-Click Method (Easiest)
In the `todo-app` folder, double-click:
👉 **`run_app.bat`**

This will automatically:
1. Start the Python FastAPI backend.
2. Start the React frontend dev server.
3. Open your default web browser directly to `http://localhost:5173`.

### 🛠️ Running Parts Separately
If you ever want to run or inspect them individually:
* **Backend only**: Double-click `run_backend.bat` (accessible at `http://localhost:8000`).
* **Frontend only**: Double-click `run_frontend.bat` (accessible at `http://localhost:5173`).

---

## 🎯 3. Features & How They Work

### 1. Adding Tasks
- **Title**: What you need to do (required).
- **Notes / Details**: Additional context or links (optional).
- **Category Tags**: Choose between `Personal`, `Work`, `Study`, `Health`, or `Finance`.
- **Priority**: Select `Low` (green), `Medium` (yellow), or `High` (red).
- **Schedule Reminder**: Pick a future date and time using the calendar picker.

### 2. Checking Off Tasks
- Click the circle button on the left of any task.
- The task gets a line-through, dims slightly, and moves toward completed state.
- The **Progress Bar** at the top recalculates your completion percentage automatically.

### 3. Drag-and-Drop Reordering
- Click and drag the **6-dot icon** (grip handle) on the left side of any task.
- Drop it wherever you want in the list.
- **How it works behind the scenes**: Every task has a numeric `position` field (e.g. 1024, 2048, 3072). When you move a task, the frontend sends a `PUT /api/todos/reorder` request with the new order, so your custom order is saved forever in SQLite.

### 4. 🔁 Recurring Tasks (Daily, Weekly, Monthly)
- Set tasks to repeat automatically on:
  - **🔁 Daily** (e.g., "Drink Water", "Morning Standup")
  - **🔁 Weekly** (e.g., "Weekly Review", "Clean Workspace")
  - **🔁 Monthly** (e.g., "Pay Rent", "Review Monthly Goals")
- **How it works**: When you check off a recurring task, the app automatically preserves the completed record and **spawns the next occurrence** for tomorrow, next week, or next month with the updated reminder time!

### 5. 📱 Cross-Device Real-Time Sync
- Access your tasks across your **phone, tablet, and computer** simultaneously!
- **How it works**:
  - Both backend and frontend bind to `0.0.0.0` so any device on your Wi-Fi can connect.
  - Click the **"📱 Sync Phone / Tablet"** button at the top of the app to display a **live QR Code**.
  - Scan the QR code with your phone camera or visit `http://<your-local-ip>:5173`.
  - **Real-Time WebSockets**: When you check off, add, or move a task on your phone, your computer screen updates **instantly in real time without refreshing!**

### 6. Scheduling & Reminders
- When you set a schedule date/time, the app stores it in UTC in the database.
- The React frontend runs a background check every 6 seconds comparing the task's reminder against your computer's local clock.
- When the reminder is due:
  1. An animated **Toast Notification** slides in at the top right of your screen.
  2. A **Native Desktop Notification** pops up on your Windows desktop (if notification permission was allowed).
  3. Overdue tasks are highlighted with a glowing red badge.

### 7. Filtering & Search
- Filter buttons:
  - `All`: View everything.
  - `Active`: View only incomplete tasks.
  - `Completed`: View finished tasks.
  - `Scheduled`: View only tasks with scheduled reminder dates.
  - `🔁 Recurring`: View only repeating tasks.
- Category filters: Click any category pill (`Work`, `Study`, etc.) to isolate tasks in that category.
- Search box: Type any letters to instantly filter matching tasks by title or description.

### 6. Editing & Deleting
- **Pencil icon**: Opens a modal where you can edit the title, notes, priority, category, or reschedule the reminder.
- **Trash icon**: Deletes the task from the database.

---

## 📂 4. Explanation of Every File

```
todo-app/
├── backend/
│   ├── database.py       # Configures SQLite connection via SQLAlchemy ORM.
│   ├── models.py         # Defines what a "Todo" table looks like (columns: id, title, completed, position, etc.).
│   ├── schemas.py        # Pydantic schemas: validates incoming JSON data to avoid bugs.
│   ├── main.py           # The FastAPI app: defines all API routes (/api/todos, /api/todos/reorder, etc.).
│   ├── requirements.txt  # List of Python packages installed in the virtual environment.
│   └── todos.db          # The actual SQLite database file (created automatically on startup).
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # The heart of the frontend: UI components, states, API calls, drag-and-drop.
│   │   ├── index.css     # The styling system: dark mode colors, glassmorphism, animations, responsive design.
│   │   └── main.jsx      # React entry point that loads App.jsx into index.html.
│   ├── index.html        # Main HTML web page with Google Inter font loaded.
│   ├── package.json      # Frontend package configuration (React 18 & Vite).
│   └── vite.config.js    # Vite configuration with API proxy to port 8000.
│
├── nodejs/               # Included portable Node.js runtime (so you don't need system installations).
├── run_app.bat           # 1-Click launcher to run both backend and frontend.
├── run_backend.bat       # Script to launch just FastAPI backend.
├── run_frontend.bat      # Script to launch just React frontend.
└── NOTES.md              # These project notes!
```

---

## 🔍 5. Interactive API Documentation (Swagger)

FastAPI gives you a free interactive test dashboard:
1. Make sure the backend is running.
2. Visit: **[http://localhost:8000/docs](http://localhost:8000/docs)**
3. You will see every endpoint:
   - `GET /api/todos` — list all tasks
   - `POST /api/todos` — create a task
   - `PATCH /api/todos/{id}` — update a task
   - `DELETE /api/todos/{id}` — remove a task
   - `PUT /api/todos/reorder` — reorder tasks
4. You can click **"Try it out"** on any endpoint to test it directly from your browser!

---

## ❓ 6. Common Questions & Troubleshooting

### Q: Where is my data saved?
**A:** In `todo-app/backend/todos.db`. It's a standard SQLite database. You can close the app or restart your computer, and your tasks will still be there.

### Q: How do I completely clear or reset the database?
**A:** If you want a fresh start, stop the backend, delete `todo-app/backend/todos.db`, and restart the backend. It will create a clean, empty database file automatically.

### Q: Why didn't I see a desktop notification?
**A:** When you first load the page, the browser asks: *"Taskflow wants to show notifications"*. Make sure you click **Allow**. Also check that Windows "Do Not Disturb" / Focus mode isn't blocking notifications.

### Q: Can I run this on a different computer?
**A:** Yes! The entire folder `todo-app` contains everything, including portable Node.js and the Python virtual environment. You can copy the folder anywhere and run `run_app.bat`.

---

*Enjoy organizing your workflow with Taskflow!*
