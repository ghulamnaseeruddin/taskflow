import './style.css';

const USERS_KEY = 'taskflow_users_v1';
const TASKS_KEY = 'taskflow_tasks_v1';
const CURRENT_USER_KEY = 'taskflow_current_user_v1';

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const flashWrap = document.getElementById('flashWrap');
const board = document.getElementById('board');
const progressFill = document.getElementById('progressFill');
const countAll = document.getElementById('countAll');
const countOpen = document.getElementById('countOpen');
const countDone = document.getElementById('countDone');
const modalRoot = document.getElementById('modalRoot');

let currentFilter = 'all';
let tasks = loadTasks();
let currentUser = getCurrentUser();
let editingTaskId = null;
let isLoginMode = true;

function flash(message, type = 'success') {
  if (!flashWrap) return;
  const el = document.createElement('div');
  el.className = `flash flash-${type}`;
  el.textContent = message;
  flashWrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return [];
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to load current user:', error);
    return null;
  }
}

function setCurrentUser(user) {
  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  if (!user) localStorage.removeItem(CURRENT_USER_KEY);
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse users:', error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getInitials(name, email) {
  const source = (name && name.trim()) || (email && email.trim()) || 'U';
  return source.charAt(0).toUpperCase();
}

function renderCounts() {
  const total = tasks.length;
  const open = tasks.filter((task) => !task.completed).length;
  const done = tasks.filter((task) => task.completed).length;

  if (countAll) countAll.textContent = String(total);
  if (countOpen) countOpen.textContent = String(open);
  if (countDone) countDone.textContent = String(done);

  const percent = total ? Math.round((done / total) * 100) : 0;
  if (progressFill) progressFill.style.width = `${percent}%`;
}

function filterTasks() {
  if (currentFilter === 'all') return tasks;
  if (currentFilter === 'open') return tasks.filter((task) => !task.completed);
  if (currentFilter === 'done') return tasks.filter((task) => task.completed);
  return tasks;
}

function renderBoard() {
  if (!board) return;
  const visibleTasks = filterTasks();
  board.innerHTML = '';

  if (!visibleTasks.length) {
    board.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>
        <h3>No tasks yet</h3>
        <p>Create your first task and stay on top of your day.</p>
      </div>
    `;
    return;
  }

  visibleTasks
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((task) => {
      const card = document.createElement('div');
      card.className = `task-card${task.completed ? ' completed' : ''}`;
      card.dataset.id = String(task.id);

      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'check-btn';
      checkBtn.textContent = task.completed ? '✓' : '';
      checkBtn.setAttribute('aria-label', task.completed ? 'Mark task as incomplete' : 'Mark task as complete');
      checkBtn.addEventListener('click', () => toggleTask(task.id));

      const body = document.createElement('div');
      body.className = 'task-body';

      const titleRow = document.createElement('div');
      titleRow.className = 'task-title-row';

      const title = document.createElement('div');
      title.className = 'task-title';
      title.textContent = task.title;

      const priorityBadge = document.createElement('span');
      priorityBadge.className = `badge badge-${task.priority || 'low'}`;
      priorityBadge.textContent = task.priority || 'low';

      const categoryBadge = document.createElement('span');
      categoryBadge.className = 'badge badge-category';
      categoryBadge.textContent = task.category || 'General';

      titleRow.appendChild(title);
      titleRow.appendChild(priorityBadge);
      titleRow.appendChild(categoryBadge);

      const notes = document.createElement('p');
      notes.className = 'task-notes';
      notes.textContent = task.description || 'No description';

      const meta = document.createElement('div');
      meta.className = 'task-meta';

      if (task.dueDate) {
        const dueDate = document.createElement('span');
        dueDate.textContent = `Due: ${new Date(task.dueDate).toLocaleDateString()}`;
        meta.appendChild(dueDate);
      }

      const createdDate = document.createElement('span');
      createdDate.textContent = `Created: ${new Date(task.createdAt).toLocaleDateString()}`;
      meta.appendChild(createdDate);

      body.appendChild(titleRow);
      body.appendChild(notes);
      body.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✎';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => openTaskModal(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(checkBtn);
      card.appendChild(body);
      card.appendChild(actions);
      board.appendChild(card);
    });
}

function renderUserPanel() {
  if (!currentUser) return;

  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const avatar = document.getElementById('avatar');

  if (userName) userName.textContent = currentUser.name || currentUser.email.split('@')[0];
  if (userEmail) userEmail.textContent = currentUser.email;
  if (avatar) avatar.textContent = getInitials(currentUser.name, currentUser.email);
}

function renderAuth() {
  if (!authScreen || !appShell) return;

  if (currentUser) {
    authScreen.style.display = 'none';
    appShell.style.display = 'flex';
    renderUserPanel();
    renderCounts();
    renderBoard();
  } else {
    authScreen.style.display = 'grid';
    appShell.style.display = 'none';
  }
}

function createTask(task) {
  const newTask = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: task.title,
    description: task.description || '',
    category: task.category || 'General',
    priority: task.priority || 'low',
    dueDate: task.dueDate || '',
    completed: Boolean(task.completed),
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveTasks();
  renderCounts();
  renderBoard();
}

function toggleTask(taskId) {
  tasks = tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  renderCounts();
  renderBoard();
}

function deleteTask(taskId) {
  const confirmed = window.confirm('Delete this task permanently?');
  if (!confirmed) return;

  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderCounts();
  renderBoard();
  flash('Task deleted', 'success');
}

function updateTask(taskId, updates) {
  tasks = tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, ...updates };
    }
    return task;
  });

  saveTasks();
  renderCounts();
  renderBoard();
}

function closeTaskModal() {
  if (modalRoot) modalRoot.innerHTML = '';
  editingTaskId = null;
}

function openTaskModal(taskId = null) {
  if (!modalRoot) return;

  const task = tasks.find((item) => item.id === taskId);
  const isEdit = Boolean(task);
  editingTaskId = taskId;

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <h2 id="modalTitle">${isEdit ? 'Edit task' : 'New task'}</h2>
          <button type="button" class="modal-close" id="modalClose" aria-label="Close">✕</button>
        </div>

        <form id="taskForm" novalidate>
          <label for="taskTitle">Title</label>
          <input id="taskTitle" name="title" type="text" value="${(task && task.title) || ''}" required />

          <label for="taskDescription">Description</label>
          <textarea id="taskDescription" name="description" rows="4">${(task && task.description) || ''}</textarea>

          <div class="form-row">
            <div>
              <label for="taskPriority">Priority</label>
              <select id="taskPriority" name="priority">
                <option value="low" ${task && task.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${task && task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${task && task.priority === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>

            <div>
              <label for="taskCategory">Category</label>
              <input id="taskCategory" name="category" type="text" value="${(task && task.category) || 'General'}" />
            </div>
          </div>

          <label for="taskDueDate">Due date</label>
          <input id="taskDueDate" name="dueDate" type="date" value="${(task && task.dueDate) || ''}" />

          <div class="modal-actions">
            <button type="button" class="btn-ghost btn-ghost--light" id="cancelModal">Cancel</button>
            <button type="submit" class="btn-primary btn-primary--small">${isEdit ? 'Save changes' : 'Create task'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('cancelModal');
  const form = document.getElementById('taskForm');

  backdrop?.addEventListener('click', (event) => {
    if (event.target === backdrop) closeTaskModal();
  });

  closeBtn?.addEventListener('click', closeTaskModal);
  cancelBtn?.addEventListener('click', closeTaskModal);

  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      priority: String(formData.get('priority') || 'low'),
      category: String(formData.get('category') || 'General').trim() || 'General',
      dueDate: String(formData.get('dueDate') || '').trim(),
    };

    if (!payload.title) {
      flash('Task title is required', 'error');
      return;
    }

    if (editingTaskId) {
      updateTask(editingTaskId, payload);
      flash('Task updated', 'success');
    } else {
      createTask(payload);
      flash('Task created', 'success');
    }

    closeTaskModal();
  });
}

function setAuthMode(loginMode) {
  isLoginMode = loginMode;

  const nameField = document.getElementById('nameField');
  const authTitle = document.getElementById('authTitle');
  const authSub = document.getElementById('authSub');
  const switchText = document.getElementById('switchText');
  const switchLink = document.getElementById('switchLink');
  const authSubmit = document.getElementById('authSubmit');

  if (nameField) nameField.classList.toggle('hidden', loginMode);
  if (authTitle) authTitle.textContent = loginMode ? 'Welcome back' : 'Create your account';
  if (authSub) authSub.textContent = loginMode ? 'Sign in to continue to TaskFlow.' : 'Start organizing your tasks today.';
  if (switchText) switchText.textContent = loginMode ? 'New here?' : 'Already have an account?';
  if (switchLink) switchLink.textContent = loginMode ? 'Create an account' : 'Sign in';
  if (authSubmit) authSubmit.textContent = loginMode ? 'Sign in' : 'Create account';
}

function handleGoogleAuth() {
  flash('Google OAuth is ready to connect with Firebase or Supabase.', 'success');
}

function setupAuthHandlers() {
  const authForm = document.getElementById('authForm');
  const switchLink = document.getElementById('switchLink');
  const googleAuthBtn = document.getElementById('googleAuthBtn');

  switchLink?.addEventListener('click', () => setAuthMode(!isLoginMode));
  googleAuthBtn?.addEventListener('click', handleGoogleAuth);

  authForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const nameInput = document.getElementById('name');

    const email = (emailInput?.value || '').trim();
    const password = (passwordInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();

    if (!email || !password) {
      flash('Email and password are required', 'error');
      return;
    }

    const users = getUsers();

    if (isLoginMode) {
      const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password);

      if (!user) {
        flash('Invalid email or password', 'error');
        return;
      }

      currentUser = { id: user.id, email: user.email, name: user.name || user.email.split('@')[0] };
      setCurrentUser(currentUser);
      renderAuth();
      flash('Signed in successfully', 'success');
      return;
    }

    const alreadyExists = users.some((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (alreadyExists) {
      flash('An account with this email already exists', 'error');
      return;
    }

    const newUser = {
      id: Date.now(),
      email,
      password,
      name: name || email.split('@')[0],
    };

    users.push(newUser);
    saveUsers(users);

    currentUser = { id: newUser.id, email: newUser.email, name: newUser.name };
    setCurrentUser(currentUser);
    renderAuth();
    flash('Account created successfully', 'success');
  });
}

function setupDashboardHandlers() {
  const newTaskBtn = document.getElementById('newTaskBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const navItems = document.querySelectorAll('.nav-item');

  newTaskBtn?.addEventListener('click', () => openTaskModal());

  logoutBtn?.addEventListener('click', () => {
    setCurrentUser(null);
    currentUser = null;
    renderAuth();
    flash('Logged out successfully', 'success');
  });

  sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((navItem) => navItem.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.dataset.filter || 'all';
      renderBoard();
    });
  });
}

function initialize() {
  currentUser = getCurrentUser();
  setAuthMode(true);
  setupAuthHandlers();
  setupDashboardHandlers();
  renderAuth();
}

initialize();
