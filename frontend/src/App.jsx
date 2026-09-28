import React, { useState, useEffect, useRef, useCallback } from 'react';

// Dynamic API & WebSocket host so phone/tablet on same Wi-Fi connects seamlessly
const HOST = window.location.hostname || 'localhost';
const API_BASE = `http://${HOST}:8000/api`;
const WS_URL = `ws://${HOST}:8000/api/ws`;

// --- SVG Icons ---
const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
    <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const RepeatIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState('medium');
  const [reminderAt, setReminderAt] = useState('');
  const [recurrence, setRecurrence] = useState('none');

  // Filter & Search
  const [filter, setFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editingTodo, setEditingTodo] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  // Notifications
  const [activeNotifications, setActiveNotifications] = useState([]);
  const dismissedReminders = useRef(new Set());

  // Cross-Device Real-Time Sync State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [syncClients, setSyncClients] = useState(1);
  const wsRef = useRef(null);

  // Drag and Drop
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Fetch Todos silently or with loading
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/todos`);
      if (!res.ok) throw new Error('Could not connect to backend server');
      const data = await res.json();
      setTodos(data);
      setError(null);
    } catch (err) {
      console.warn('Backend fetch error:', err.message);
      setError(`Cannot connect to FastAPI backend at ${API_BASE}. Is it running?`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Network Info for Cross-Device Connect
  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/network-info`);
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch (e) {
      console.warn('Network info fetch error:', e);
    }
  };

  // WebSocket Live Sync Connection
  useEffect(() => {
    let reconnectTimeout = null;
    let pingInterval = null;

    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(WS_URL);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsLiveConnected(true);
          // Keep-alive ping
          pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 20000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected' || data.type === 'client_count') {
              setSyncClients(data.active_clients || 1);
            } else if (
              data.type === 'todo_created' ||
              data.type === 'todo_updated' ||
              data.type === 'todo_deleted' ||
              data.type === 'todos_reordered'
            ) {
              // Real-time synchronization event from another device!
              fetchTodos();
            }
          } catch (e) {
            // Non-json ping/pong
          }
        };

        socket.onclose = () => {
          setIsLiveConnected(false);
          clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();
    fetchTodos();
    fetchNetworkInfo();

    // Fallback polling every 4 seconds for resilience across mobile network drops
    const fallbackPoll = setInterval(fetchTodos, 4000);

    // Request Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearInterval(fallbackPoll);
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchTodos]);

  // Polling reminders every 6 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      todos.forEach((todo) => {
        if (!todo.completed && todo.reminder_at) {
          const reminderTime = new Date(todo.reminder_at);
          if (reminderTime <= now && !dismissedReminders.current.has(todo.id)) {
            dismissedReminders.current.add(todo.id);

            setActiveNotifications((prev) => [
              ...prev,
              {
                id: todo.id,
                title: todo.title,
                recurrence: todo.recurrence,
                time: reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`⏰ Taskflow: ${todo.title}`, {
                body: todo.description || (todo.recurrence !== 'none' ? `Recurring (${todo.recurrence}) task due now!` : 'Scheduled task is due now!'),
                icon: 'favicon.ico',
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 6000);
    checkReminders();
    return () => clearInterval(interval);
  }, [todos]);

  // Create Todo
  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      recurrence,
    };

    try {
      const res = await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newTodo = await res.json();
        setTodos((prev) => [...prev, newTodo]);
        setTitle('');
        setDescription('');
        setReminderAt('');
        setRecurrence('none');
      }
    } catch (err) {
      alert('Failed to save todo item.');
    }
  };

  // Toggle Complete (Auto-spawns next occurrence for recurring tasks!)
  const toggleComplete = async (todo) => {
    const nextCompleted = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      const res = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (res.ok) {
        // Refresh to immediately show newly spawned recurring instance if applicable
        fetchTodos();
      }
    } catch (err) {
      fetchTodos();
    }
  };

  // Delete Todo
  const handleDelete = async (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
    } catch (err) {
      fetchTodos();
    }
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTodo) return;

    try {
      const res = await fetch(`${API_BASE}/todos/${editingTodo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTodo.title,
          description: editingTodo.description,
          category: editingTodo.category,
          priority: editingTodo.priority,
          recurrence: editingTodo.recurrence || 'none',
          reminder_at: editingTodo.reminder_at ? new Date(editingTodo.reminder_at).toISOString() : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setEditingTodo(null);
      }
    } catch (err) {
      alert('Failed to update task.');
    }
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...todos];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reorderedPayload = updated.map((item, idx) => ({
      id: item.id,
      position: (idx + 1) * 1024.0,
    }));

    setTodos(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      await fetch(`${API_BASE}/todos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderedPayload),
      });
    } catch (err) {
      console.error('Failed to sync reorder with backend', err);
    }
  };

  const dismissToast = (id) => {
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCopyLink = () => {
    const url = networkInfo?.frontend_url || `http://${window.location.hostname}:5173`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered todos calculation
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active' && todo.completed) return false;
    if (filter === 'completed' && !todo.completed) return false;
    if (filter === 'scheduled' && !todo.reminder_at) return false;
    if (filter === 'recurring' && (!todo.recurrence || todo.recurrence === 'none')) return false;
    if (selectedCategory !== 'all' && todo.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = todo.title.toLowerCase().includes(q);
      const matchDesc = todo.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const scheduledCount = todos.filter((t) => t.reminder_at && !t.completed).length;
  const recurringCount = todos.filter((t) => t.recurrence && t.recurrence !== 'none').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const phoneAccessUrl = networkInfo?.frontend_url || `http://${window.location.hostname}:5173`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(phoneAccessUrl)}`;

  return (
    <div className="app-container">
      {/* Toast Reminders */}
      <div className="toast-container">
        {activeNotifications.map((notif) => (
          <div key={notif.id} className="toast">
            <div className="toast-icon">
              <BellIcon />
            </div>
            <div className="toast-content">
              <div className="toast-title">{notif.title}</div>
              <div className="toast-time">
                {notif.recurrence && notif.recurrence !== 'none' && `[🔁 ${notif.recurrence}] `}
                Scheduled for {notif.time}
              </div>
            </div>
            <button className="toast-close" onClick={() => dismissToast(notif.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Top Navigation Bar: Cross-Device Sync Status & Connect Button */}
      <div className="top-nav">
        <div className="sync-status-indicator" title="Connected devices update each other in real-time">
          <span className={`live-dot ${isLiveConnected ? 'active' : ''}`} />
          <span>
            {isLiveConnected ? 'Live Synced' : 'Sync Connecting...'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            ({syncClients} {syncClients === 1 ? 'device' : 'devices'} active)
          </span>
        </div>

        <button
          className="sync-btn"
          onClick={() => {
            fetchNetworkInfo();
            setShowSyncModal(true);
          }}
          title="Open lists on your smartphone or tablet"
        >
          <SmartphoneIcon />
          <span>Sync Phone / Tablet</span>
        </button>
      </div>

      {/* Header */}
      <header className="app-header">
        <h1>Taskflow</h1>
        <p>Your intelligent, scheduled, reorderable daily task hub</p>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={fetchTodos}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-chip">
          <span>Total:</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div className="stat-chip">
          <span>Completed:</span>
          <span className="stat-value">{completedCount}</span>
        </div>
        <div className="stat-chip">
          <span>Pending:</span>
          <span className="stat-value">{totalCount - completedCount}</span>
        </div>
        <div className="stat-chip">
          <span>Reminders:</span>
          <span className="stat-value">{scheduledCount}</span>
        </div>
        <div className="stat-chip">
          <span>Recurring:</span>
          <span className="stat-value">{recurringCount}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="progress-bar-container">
          <div className="progress-label">
            <span>Overall Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Add New Todo Form */}
      <form className="add-form" onSubmit={handleAddTodo}>
        <div className="add-form-row">
          <input
            type="text"
            placeholder="What needs to be done?..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="add-btn">
            <PlusIcon /> Add Task
          </button>
        </div>

        <div className="add-extras">
          <input
            type="text"
            placeholder="Add details / notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              flex: '1 1 180px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4rem 0.7rem',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
            }}
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Personal">🏠 Personal</option>
            <option value="Work">💼 Work</option>
            <option value="Study">📚 Study</option>
            <option value="Health">❤️ Health</option>
            <option value="Finance">💳 Finance</option>
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>

          {/* Recurring Task Selector */}
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            title="Set task to repeat automatically"
          >
            <option value="none">No Repeat</option>
            <option value="daily">🔁 Repeat Daily</option>
            <option value="weekly">🔁 Repeat Weekly</option>
            <option value="monthly">🔁 Repeat Monthly</option>
          </select>

          <label title="Set a schedule reminder">
            <BellIcon />
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
            />
          </label>
        </div>
      </form>

      {/* Filter and Category Pills */}
      <div className="filter-bar">
        {['all', 'active', 'completed', 'scheduled', 'recurring'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'recurring' ? '🔁 Recurring' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.25rem' }} />

        {['all', 'Personal', 'Work', 'Study', 'Health', 'Finance'].map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? 'All Tags' : cat}
          </button>
        ))}
      </div>

      {/* Todo List with Drag & Drop */}
      <div className="todo-list">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CheckIcon />
            </div>
            <h3>No tasks found</h3>
            <p>
              {filter === 'completed'
                ? "You haven't completed any tasks yet."
                : 'Enjoy your free time, or add a new task above!'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo, index) => {
            const isOverdue =
              todo.reminder_at &&
              !todo.completed &&
              new Date(todo.reminder_at) < new Date();

            return (
              <div
                key={todo.id}
                className={`todo-card ${todo.completed ? 'completed' : ''} ${
                  draggedIndex === index ? 'dragging' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  borderTop: dragOverIndex === index ? '2px solid var(--accent)' : undefined,
                }}
              >
                {/* Drag Handle */}
                <div className="drag-handle" title="Drag to reorder">
                  <GripIcon />
                </div>

                {/* Checkbox */}
                <button
                  type="button"
                  className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                  onClick={() => toggleComplete(todo)}
                  aria-label="Toggle completed"
                >
                  <CheckIcon />
                </button>

                {/* Task Details */}
                <div className="todo-content">
                  <div className="todo-title">{todo.title}</div>
                  {todo.description && (
                    <div className="todo-description">{todo.description}</div>
                  )}

                  <div className="todo-meta">
                    <span className={`todo-badge badge-priority-${todo.priority}`}>
                      {todo.priority}
                    </span>

                    <span className="todo-badge badge-category">
                      {todo.category}
                    </span>

                    {/* Recurring Badge */}
                    {todo.recurrence && todo.recurrence !== 'none' && (
                      <span className="todo-badge badge-recurring">
                        <RepeatIcon />
                        {todo.recurrence}
                      </span>
                    )}

                    {/* Reminder Badge */}
                    {todo.reminder_at && (
                      <span className={`todo-badge badge-reminder ${isOverdue ? 'overdue' : ''}`}>
                        <BellIcon />
                        {new Date(todo.reminder_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {isOverdue && ' (Due)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="todo-actions">
                  <button
                    className="action-btn"
                    onClick={() => setEditingTodo({ ...todo })}
                    title="Edit Task"
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(todo.id)}
                    title="Delete Task"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTodo && (
        <div className="modal-backdrop" onClick={() => setEditingTodo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Task</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-field">
                <label>Task Title</label>
                <input
                  type="text"
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                  required
                />
              </div>

              <div className="modal-field">
                <label>Description</label>
                <textarea
                  value={editingTodo.description || ''}
                  onChange={(e) =>
                    setEditingTodo({ ...editingTodo, description: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</label>
                  <select
                    value={editingTodo.category}
                    onChange={(e) =>
                      setEditingTodo({ ...editingTodo, category: e.target.value })
                    }
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    value={editingTodo.priority}
                    onChange={(e) =>
                      setEditingTodo({ ...editingTodo, priority: e.target.value })
                    }
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Recurrence in Edit Modal */}
              <div className="modal-field">
                <label>Recurrence Schedule</label>
                <select
                  value={editingTodo.recurrence || 'none'}
                  onChange={(e) =>
                    setEditingTodo({ ...editingTodo, recurrence: e.target.value })
                  }
                >
                  <option value="none">No Repeat</option>
                  <option value="daily">🔁 Repeat Daily</option>
                  <option value="weekly">🔁 Repeat Weekly</option>
                  <option value="monthly">🔁 Repeat Monthly</option>
                </select>
              </div>

              <div className="modal-field">
                <label>Schedule Reminder</label>
                <input
                  type="datetime-local"
                  value={
                    editingTodo.reminder_at
                      ? new Date(new Date(editingTodo.reminder_at).getTime() - new Date().getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setEditingTodo({
                      ...editingTodo,
                      reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingTodo(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cross-Device Sync Modal */}
      {showSyncModal && (
        <div className="modal-backdrop" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📱 Sync with Phone or Tablet</h2>
            <div className="qr-card">
              <div className="qr-box">
                <img src={qrCodeUrl} alt="Scan QR Code to Open on Phone" />
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                Scan this code with your phone camera or open this address:
              </p>

              <div className="url-copy-row">
                <input type="text" readOnly value={phoneAccessUrl} />
                <button className="btn-copy" onClick={handleCopyLink}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="sync-steps">
                <strong>How Cross-Device Sync works:</strong>
                <ol style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>Ensure your phone or tablet is on the same Wi-Fi network.</li>
                  <li>Scan the QR code above or visit the link in Chrome/Safari.</li>
                  <li>Tasks sync in <strong>real-time</strong> across all connected devices!</li>
                </ol>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSyncModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
