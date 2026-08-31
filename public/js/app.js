// public/js/app.js
// Client-side SQLite + UI glue for TaskFlow (uses sql.js)
// Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js"></script>

(async function () {
  // Ensure sql.js is available
  if (typeof initSqlJs !== 'function') {
    console.error('sql.js (initSqlJs) not found — make sure sql-wasm.js is loaded first.');
    return;
  }

  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  // DB and state
  let db = null;
  const STORAGE_KEY = 'taskflow_db_v1';
  const USER_KEY = 'taskflow_user_v1';

  // Helpers: persist / load DB to/from localStorage (Base64)
  function saveDB() {
    try {
      const data = db.export();
      const str = btoa(String.fromCharCode(...data));
      localStorage.setItem(STORAGE_KEY, str);
    } catch (err) {
      console.error('Failed to save DB', err);
    }
  }

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      db = new SQL.Database(bytes);
    } else {
      db = new SQL.Database();
      createTables();
      saveDB();
    }
  }

  // Create required tables (users + tasks)
  function createTables() {
    const q = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'low',
      created_at TEXT DEFAULT (datetime('now')),
      user_id INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    `;
    db.run(q);
  }

  // Simple flash UI
  function flash(message, type = 'success') {
    const wrap = document.getElementById('flashWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'flash ' + (type === 'error' ? 'flash-error' : 'flash-success');
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // Authentication (very simple; passwords stored client-side for demo)
  function registerUser(email, password, name = '') {
    try {
      const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
      stmt.run([email, password, name]);
      stmt.free();
      saveDB();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  function loginUser(email, password) {
    try {
      const stmt = db.prepare('SELECT id, name, email FROM users WHERE email = ? AND password = ? LIMIT 1');
      stmt.bind([email, password]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        localStorage.setItem(USER_KEY, String(row.id));
        flash('Signed in');
        return row;
      } else {
        stmt.free();
        return null;
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function getCurrentUserId() {
    const v = localStorage.getItem(USER_KEY);
    return v ? Number(v) : null;
  }

  function logout() {
    localStorage.removeItem(USER_KEY);
    renderAuthScreen();
  }

  // Task operations
  function createTask({ title, description = '', priority = 'low' }) {
    const uid = getCurrentUserId();
    if (!uid) throw new Error('Not signed in');
    const stmt = db.prepare('INSERT INTO tasks (title, description, priority, user_id) VALUES (?, ?, ?, ?)');
    stmt.run([title, description, priority, uid]);
    stmt.free();
    saveDB();
  }

  function updateTaskStatus(id, completed) {
    const uid = getCurrentUserId();
    if (!uid) throw new Error('Not signed in');
    const stmt = db.prepare('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?');
    stmt.run([completed ? 1 : 0, id, uid]);
    stmt.free();
    saveDB();
  }

  function deleteTask(id) {
    const uid = getCurrentUserId();
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    stmt.run([id, uid]);
    stmt.free();
    saveDB();
  }

  function editTask(id, { title, description, priority }) {
    const uid = getCurrentUserId();
    const stmt = db.prepare('UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ? AND user_id = ?');
    stmt.run([title, description, priority, id, uid]);
    stmt.free();
    saveDB();
  }

  function fetchTasks(filter = 'all') {
    const uid = getCurrentUserId();
    if (!uid) return [];
    let q = 'SELECT * FROM tasks WHERE user_id = ?';
    if (filter === 'open') q += ' AND completed = 0';
    if (filter === 'done') q += ' AND completed = 1';
    q += ' ORDER BY created_at DESC';
    const stmt = db.prepare(q);
    stmt.bind([uid]);
    const out = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    stmt.free();
    return out;
  }

  function counts() {
    const uid = getCurrentUserId();
    if (!uid) return { all: 0, open: 0, done: 0 };
    const all = db.exec('SELECT COUNT(*) AS c FROM tasks WHERE user_id = ' + uid)[0]?.values?.[0]?.[0] ?? 0;
    const open = db.exec('SELECT COUNT(*) AS c FROM tasks WHERE user_id = ' + uid + ' AND completed = 0')[0]?.values?.[0]?.[0] ?? 0;
    const done = db.exec('SELECT COUNT(*) AS c FROM tasks WHERE user_id = ' + uid + ' AND completed = 1')[0]?.values?.[0]?.[0] ?? 0;
    return { all: Number(all), open: Number(open), done: Number(done) };
  }

  // UI rendering
  function renderAuthScreen() {
    const uid = getCurrentUserId();
    const authScreen = document.getElementById('authScreen');
    const appShell = document.getElementById('appShell');
    if (uid) {
      // Signed in -> show app
      authScreen.style.display = 'none';
      appShell.style.display = '';
      renderApp();
    } else {
      authScreen.style.display = '';
      appShell.style.display = 'none';
    }
  }

  function renderApp() {
    // Update user details in sidebar
    const uid = getCurrentUserId();
    if (!uid) return;
    const stmt = db.prepare('SELECT id, email, name FROM users WHERE id = ? LIMIT 1');
    stmt.bind([uid]);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    document.getElementById('userEmail').textContent = row?.email ?? '';
    document.getElementById('userName').textContent = row?.name || (row?.email || '').split('@')[0];
    document.getElementById('avatar').textContent = (row?.name?.[0] || row?.email?.[0] || 'U').toUpperCase();

    renderCounts();
    renderBoard('all');
  }

  function renderCounts() {
    const c = counts();
    document.getElementById('countAll').textContent = c.all;
    document.getElementById('countOpen').textContent = c.open;
    document.getElementById('countDone').textContent = c.done;
    const total = c.all || 1;
    const percent = Math.round(((c.done || 0) / total) * 100);
    document.getElementById('progressFill').style.width = percent + '%';
  }

  function renderBoard(filter = 'all') {
    const tasks = fetchTasks(filter);
    const board = document.getElementById('board');
    board.innerHTML = '';
    if (!tasks.length) {
      board.innerHTML = `<div class="empty-state"><div class="empty-icon">✓</div><h3>No tasks yet</h3><p class="text-muted">Create your first task to get started.</p></div>`;
      return;
    }
    for (const t of tasks) {
      const card = document.createElement('div');
      card.className = 'task-card' + (t.completed ? ' completed' : '');
      card.dataset.id = t.id;

      const check = document.createElement('button');
      check.className = 'check-btn';
      check.innerHTML = t.completed ? '✔' : '';
      check.onclick = () => {
        updateTaskStatus(t.id, !t.completed);
        renderBoard(filter);
        renderCounts();
      };

      const body = document.createElement('div');
      body.className = 'task-body';

      const titleRow = document.createElement('div');
      titleRow.className = 'task-title-row';

      const title = document.createElement('div');
      title.className = 'task-title';
      title.textContent = t.title;

      const badge = document.createElement('div');
      badge.className = 'badge ' + (t.priority === 'high' ? 'badge-high' : t.priority === 'medium' ? 'badge-medium' : 'badge-low');
      badge.style.marginLeft = '12px';
      badge.textContent = t.priority;

      titleRow.appendChild(title);
      titleRow.appendChild(badge);

      const notes = document.createElement('div');
      notes.className = 'task-notes';
      notes.textContent = t.description || '';

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.textContent = new Date(t.created_at).toLocaleString();

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✎';
      editBtn.title = 'Edit';
      editBtn.onclick = () => openEditModal(t);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn delete';
      delBtn.textContent = '🗑';
      delBtn.title = 'Delete';
      delBtn.onclick = () => {
        if (confirm('Delete this task?')) {
          deleteTask(t.id);
          renderBoard(filter);
          renderCounts();
        }
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      body.appendChild(titleRow);
      if (t.description) body.appendChild(notes);
      body.appendChild(meta);

      card.appendChild(check);
      card.appendChild(body);
      card.appendChild(actions);

      board.appendChild(card);
    }
  }

  // Modal: create / edit
  function openNewTaskModal() {
    const title = prompt('Task title:');
    if (!title) return;
    const description = prompt('Description (optional):') || '';
    const priority = prompt('Priority (low, medium, high):', 'low') || 'low';
    try {
      createTask({ title, description, priority });
      renderBoard();
      renderCounts();
      flash('Task created');
    } catch (err) {
      flash('Failed to create task', 'error');
      console.error(err);
    }
  }

  function openEditModal(task) {
    const title = prompt('Edit title:', task.title);
    if (!title) return;
    const description = prompt('Edit description:', task.description || '') || '';
    const priority = prompt('Priority (low, medium, high):', task.priority || 'low') || 'low';
    editTask(task.id, { title, description, priority });
    renderBoard();
    renderCounts();
    flash('Task updated');
  }

  // Wire up DOM events
  function wireEvents() {
    // Auth form
    const authForm = document.getElementById('authForm');
    const authSubmit = document.getElementById('authSubmit');
    const switchLink = document.getElementById('switchLink');
    const switchText = document.getElementById('switchText');
    let signupMode = false;

    authForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return flash('Provide email and password', 'error');
      if (signupMode) {
        const ok = registerUser(email, password, email.split('@')[0]);
        if (ok) {
          flash('Account created — signed in');
          loginUser(email, password);
          renderAuthScreen();
        } else {
          flash('Could not create account (maybe email exists)', 'error');
        }
      } else {
        const user = loginUser(email, password);
        if (user) {
          renderAuthScreen();
        } else {
          flash('Invalid credentials', 'error');
        }
      }
    });

    switchLink.addEventListener('click', e => {
      e.preventDefault();
      signupMode = !signupMode;
      document.getElementById('authTitle').textContent = signupMode ? 'Create account' : 'Welcome back';
      document.getElementById('authSub').textContent = signupMode ? 'Create an account to start using TaskFlow.' : 'Sign in to continue to TaskFlow.';
      switchText.textContent = signupMode ? 'Already have an account?' : 'New here?';
      switchLink.textContent = signupMode ? 'Sign in' : 'Create an account';
      authSubmit.textContent = signupMode ? 'Create account' : 'Sign in';
    });

    // App actions
    document.getElementById('logoutBtn').addEventListener('click', () => {
      logout();
      flash('Signed out');
    });

    document.getElementById('newTaskBtn').addEventListener('click', () => {
      openNewTaskModal();
    });

    document.getElementById('allTasksBtn').addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('allTasksBtn').classList.add('active');
      renderBoard('all');
    });
    document.getElementById('openTasksBtn').addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('openTasksBtn').classList.add('active');
      renderBoard('open');
    });
    document.getElementById('doneTasksBtn').addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('doneTasksBtn').classList.add('active');
      renderBoard('done');
    });
  }

  // Initialize
  loadDB();
  wireEvents();
  renderAuthScreen();

  // Expose for console debugging
  window.TF = {
    db,
    saveDB,
    loadDB,
    createTables,
    registerUser,
    loginUser,
    logout,
    createTask,
    fetchTasks,
    editTask,
    deleteTask,
    updateTaskStatus
  };
})();
