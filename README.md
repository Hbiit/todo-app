# 📋 Taskflow — Smart Todo List Application

A modern, full-stack Todo List application built with a **Python (FastAPI)** backend and a **React** frontend.

---

## ✨ Features

- **✅ Add & Manage Tasks**: Title, descriptions, categories (Personal, Work, Study, Health, Finance), and priorities (Low, Medium, High).
- **✔️ Check off Items**: Instant visual feedback with smooth strike-through animations and completion progress tracking.
- **🔄 Drag & Drop Reordering**: Grab any task by its handle and reorder it. Positions are persisted in the database using floating-point rank indexing.
- **⏰ Schedule Reminders**: Set specific dates and times for your tasks. The app checks every few seconds and triggers:
  - In-app animated toast notifications
  - Native browser desktop notifications
  - Visual badges highlighting due and overdue tasks
- **🔍 Filter & Search**: Filter by Status (All, Active, Completed, Scheduled) or Categories, with real-time text search.
- **✏️ Edit Modal**: Click the pencil icon on any task to adjust its title, notes, priority, or reschedule the reminder.
- **💾 Automatic Database**: SQLite database (`todos.db`) requires zero setup and creates itself on startup.

---

## 🚀 How to Run the App (Super Easy!)

### The 1-Click Method (Recommended for Beginners):
Simply double-click the **`run_app.bat`** file in the `todo-app` folder!
It will:
1. Start the FastAPI backend on `http://localhost:8000`
2. Start the React frontend on `http://localhost:5173`
3. Automatically launch your default web browser to the app!

---

### Running Manually via Command Line:

#### 1. Start Backend:
Open a terminal in `todo-app/backend`:
```powershell
.\venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```
- API is live at: [http://localhost:8000](http://localhost:8000)
- Interactive API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. Start Frontend:
Open a second terminal in `todo-app/frontend`:
```powershell
# Using the included portable nodejs:
..\nodejs\npm.cmd run dev
```
- Frontend is live at: [http://localhost:5173](http://localhost:5173)

---

## ⚡ Deploy to Vercel (1-Click Ready)

This repository is pre-configured with a zero-config setup for **Vercel** (`vercel.json`, `api/index.py`, and root `package.json`):

1. Push your code to GitHub.
2. Go to your [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Select your `todo-app` repository.
4. Leave all build settings at their defaults (Vercel automatically detects `vercel.json` and builds both frontend and backend).
5. *(Optional)* If you want persistent task storage across serverless cold starts, add a `DATABASE_URL` environment variable pointing to a free PostgreSQL database (e.g. from [Neon](https://neon.tech) or [Supabase](https://supabase.com)). If omitted, it will automatically use an in-memory/temp SQLite database.
6. Click **Deploy**!

---

## 📁 Project Architecture

```
todo-app/
├── backend/
│   ├── venv/            # Python virtual environment (dependencies installed)
│   ├── database.py      # SQLite connection & session management
│   ├── models.py        # SQLAlchemy database model (Todo table)
│   ├── schemas.py       # Pydantic data schemas for request validation
│   ├── main.py          # FastAPI endpoints (CRUD, reorder, reminders)
│   └── requirements.txt # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React application & UI logic
│   │   ├── index.css    # Modern dark-mode styling & animations
│   │   └── main.jsx     # React entry point
│   ├── index.html       # HTML root
│   ├── package.json     # Node/Vite dependencies
│   └── vite.config.js   # Vite build & proxy configuration
│
├── nodejs/              # Self-contained portable Node.js runtime
├── run_app.bat          # 1-Click launcher for both backend & frontend
├── run_backend.bat      # Helper script for backend only
└── run_frontend.bat     # Helper script for frontend only
```

---

## 💡 How Reminders Work
When you set a "Schedule Reminder" on a task:
1. The exact datetime is stored in UTC in the backend database.
2. The React frontend monitors task due dates and compares them against your local clock.
3. When the scheduled time arrives:
   - An interactive alert toast slides in at the top right of your screen.
   - If you grant browser notification permission, a desktop notification pops up even if you are on another tab!
   - Overdue tasks glow with a red badge so you never miss an urgent item.
