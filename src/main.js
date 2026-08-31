import './style.css';

const STORAGE_KEY = 'taskflow_state_v2';
const USERS_KEY = 'taskflow_users_v1';
const TASKS_KEY = 'taskflow_tasks_v1';
const CURRENT_USER_KEY = 'taskflow_current_user_v1';
const SETTINGS_KEY = 'taskflow_settings_v1';

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const flashWrap = document.getElementById('flashWrap');
const board = document.getElementById('board');
const progressFill = document.getElementById('progressFill');
const countAll = document.getElementById('countAll');
const countOpen = document.getElementById('countOpen');
const countDone = document.getElementById('countDone');
const modalRoot = document.getElementById('modalRoot');
const tagFilterStrip = document.getElementById('tagFilterStrip');

const DEFAULT_STATE = {
  user: {
    name: 'Productive User',
    avatar: 'initials',
    joinedDate: new Date().toISOString().slice(0, 10),
    bio: '',
  },
  settings: {
    theme: 'light',
    density: 'comfortable',
    notificationsEnabled: true,
    soundEffects: false,
    defaultPriority: 'medium',
  },
  tasks: [],
};

let currentFilter = 'all';
let selectedTagFilter = null;
let currentUser = null;
let editingTaskId = null;
let isLoginMode = true;

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function flash(message, type = 'success') {
  if (!flashWrap) return;
  const el = document.createElement('div');
  el.className = `flash flash-${type}`;
  el.textContent = message;
  flashWrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function getInitials(name, email) {
  const source = (name && name.trim()) || (email && email.trim()) || 'U';
  return source.charAt(0).toUpperCase();
}

function normalizeTask(task) {
  return {
    id: String(task.id || Date.now() + Math.random()),
    title: String(task.title || 'Untitled task').trim(),
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    tags: Array.isArray(task.tags) ? task.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((subtask) => ({
          id: String(subtask.id || Date.now() + Math.random()),
          title: String(subtask.title || '').trim(),
          isCompleted: Boolean(subtask.isCompleted),
        })).filter((subtask) => subtask.title)
      : [],
    dueDate: task.dueDate || null,
    recurrence: ['none', 'daily', 'weekly', 'monthly'].includes(task.recurrence) ? task.recurrence : 'none',
    isCompleted: Boolean(task.isCompleted),
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

function normalizeUser(user) {
  const safeUser = user || {};
  return {
    name: safeUser.name || 'Productive User',
    avatar: safeUser.avatar || 'initials',
    joinedDate: safeUser.joinedDate || new Date().toISOString().slice(0, 10),
    bio: safeUser.bio || '',
  };
}

function normalizeSettings(settings) {
  const base = DEFAULT_STATE.settings;
  return {
    ...base,
    ...(settings || {}),
    theme: ['light', 'dark', 'sepia'].includes(settings?.theme) ? settings.theme : 'light',
    density: ['compact', 'comfortable', 'spacious'].includes(settings?.density) ? settings.density : 'comfortable',
    notificationsEnabled: settings?.notificationsEnabled !== false,
    soundEffects: Boolean(settings?.soundEffects),
    defaultPriority: ['low', 'medium', 'high'].includes(settings?.defaultPriority) ? settings.defaultPriority : 'medium',
  };
}

function migrateLegacyState() {
  const legacyTasks = (() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
    } catch {
      return [];
    }
  })();

  const legacyUser = (() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const legacySettings = (() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const merged = cloneDefaultState();
  merged.tasks = legacyTasks.length ? legacyTasks : merged.tasks;
  merged.user = normalizeUser(legacyUser || merged.user);
  merged.settings = normalizeSettings(legacySettings || merged.settings);
  return merged;
}

function showAndroidInstallModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
  
  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.style.cssText = `
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 450px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: var(--shadow-outer);
  `;
  
  panel.innerHTML = `
    <div style="margin-bottom: 12px;">
      <p style="color: var(--muted); font-size: 0.85rem; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">📱 Install TaskFlow</p>
      <h2 style="color: var(--ink); font-size: 1.4rem; font-weight: 700; margin: 0;">Android App</h2>
    </div>
    
    <p style="color: var(--ink); margin: 16px 0; line-height: 1.6; font-size: 0.95rem;">
      Same UI, UX & features as the web app. Works on Android 8.0+
    </p>
    
    <div style="background: var(--surface-sky); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin: 18px 0;">
      <p style="color: var(--primary-deep); font-weight: 700; margin: 0 0 8px 0; font-size: 0.9rem;">✨ Recommended: Expo Go</p>
      <p style="color: var(--ink); margin: 0; font-size: 0.85rem; line-height: 1.5;">
        Fastest way to install. Download Expo Go from Play Store, scan QR code, app runs instantly.
      </p>
    </div>
    
    <div style="display: flex; gap: 10px; flex-direction: column; margin-top: 20px;">
      <button type="button" id="androidInstallBtn" style="width: 100%; padding: 12px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem; transition: all 0.15s;">
        📱 Install with Expo Go
      </button>
      <button type="button" id="androidQrBtn" style="width: 100%; padding: 12px 16px; background: var(--surface-sky); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">
        📸 Show QR Code
      </button>
      <button type="button" id="androidBuildBtn" style="width: 100%; padding: 12px 16px; background: var(--surface-sky); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">
        ⬇️ Build APK (Dev)
      </button>
      <button type="button" id="androidCloseBtn" style="width: 100%; padding: 12px 16px; background: transparent; color: var(--muted); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
        Close
      </button>
    </div>
    
    <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line);">
      <p style="color: var(--muted); font-size: 0.8rem; margin: 0; line-height: 1.5;">
        <strong>How it works:</strong> Expo Go runs TaskFlow in a sandbox. No installation needed, updates instantly. For standalone app, build APK from source.
      </p>
    </div>
  `;
  
  modal.appendChild(panel);
  document.body.appendChild(modal);
  
  const closeModal = () => {
    modal.remove();
  };
  
  document.getElementById('androidCloseBtn')?.addEventListener('click', closeModal);
  
  // Install with Expo Go - opens Expo app
  document.getElementById('androidInstallBtn')?.addEventListener('click', () => {
    const expoLink = 'expo+taskflow://';
    const fallbackLink = 'https://expo.dev/TaskFlowAndroid';
    
    // Try to open Expo app directly
    window.location.href = expoLink;
    
    // Fallback to web after delay
    setTimeout(() => {
      window.open(fallbackLink, '_blank');
      flash('📲 Open link in Expo Go app or scan QR code', 'success');
    }, 500);
  });
  
  // Show QR code
  document.getElementById('androidQrBtn')?.addEventListener('click', () => {
    showQRCodeModal();
  });
  
  // Build APK instructions
  document.getElementById('androidBuildBtn')?.addEventListener('click', () => {
    showBuildInstructions();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function showQRCodeModal() {
  const qrModal = document.createElement('div');
  qrModal.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;';
  
  const qrPanel = document.createElement('div');
  qrPanel.style.cssText = `
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 400px;
    text-align: center;
    box-shadow: var(--shadow-outer);
  `;
  
  qrPanel.innerHTML = `
    <h3 style="color: var(--ink); margin: 0 0 16px 0;">Scan with Expo Go</h3>
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
      <svg width="250" height="250" viewBox="0 0 250 250" style="width: 100%; height: auto;">
        <!-- Placeholder QR Code - In production, generate real QR -->
        <rect width="250" height="250" fill="white"/>
        <text x="125" y="125" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="black">
          QR Code
        </text>
        <text x="125" y="145" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="#999">
          expo.dev/TaskFlowAndroid
        </text>
      </svg>
    </div>
    <p style="color: var(--muted); margin: 0 0 16px 0; font-size: 0.9rem;">
      1. Download <strong>Expo Go</strong> from Play Store<br>
      2. Open Expo Go<br>
      3. Scan this QR code with your phone<br>
      4. App loads instantly!
    </p>
    <button type="button" id="qrCloseBtn" style="width: 100%; padding: 10px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
      Got it!
    </button>
  `;
  
  qrModal.appendChild(qrPanel);
  document.body.appendChild(qrModal);
  
  document.getElementById('qrCloseBtn')?.addEventListener('click', () => {
    qrModal.remove();
  });
  
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.remove();
  });
}

function showBuildInstructions() {
  const buildModal = document.createElement('div');
  buildModal.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1001; overflow-y: auto;';
  
  const buildPanel = document.createElement('div');
  buildPanel.style.cssText = `
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 500px;
    width: 90%;
    margin: 20px auto;
    box-shadow: var(--shadow-outer);
  `;
  
  buildPanel.innerHTML = `
    <h3 style="color: var(--ink); margin: 0 0 16px 0;">Build APK (Developers)</h3>
    
    <div style="background: var(--surface-sky); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-family: monospace; font-size: 0.85rem; color: var(--ink); overflow-x: auto;">
      <div style="margin-bottom: 8px; color: var(--muted);"># Install EAS CLI</div>
      <div>npm install -g eas-cli</div>
      <div style="margin-top: 8px; margin-bottom: 8px; color: var(--muted);"># Build for Android</div>
      <div>cd ~/TaskFlowAndroid</div>
      <div>eas build --platform android</div>
      <div style="margin-top: 8px; margin-bottom: 8px; color: var(--muted);"># Or build locally</div>
      <div>npx expo export:android</div>
    </div>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 0.85rem; color: #991b1b;">
      <strong>Note:</strong> Building requires Node.js, npm, and Expo CLI. Takes 10-20 minutes on first build.
    </div>
    
    <div style="display: flex; gap: 10px;">
      <button type="button" id="copyBuildCmd" style="flex: 1; padding: 10px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
        📋 Copy Commands
      </button>
      <button type="button" id="buildCloseBtn" style="flex: 1; padding: 10px 16px; background: var(--surface-sky); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; font-weight: 600; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  buildModal.appendChild(buildPanel);
  document.body.appendChild(buildModal);
  
  const buildCommands = `npm install -g eas-cli
cd ~/TaskFlowAndroid
eas build --platform android`;
  
  document.getElementById('copyBuildCmd')?.addEventListener('click', () => {
    navigator.clipboard.writeText(buildCommands).then(() => {
      flash('✓ Build commands copied to clipboard', 'success');
    });
  });
  
  document.getElementById('buildCloseBtn')?.addEventListener('click', () => {
    buildModal.remove();
  });
  
  buildModal.addEventListener('click', (e) => {
    if (e.target === buildModal) buildModal.remove();
  });
}


function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacyState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const parsed = JSON.parse(raw);
    const base = cloneDefaultState();
    const safe = {
      user: normalizeUser(parsed.user || base.user),
      settings: normalizeSettings(parsed.settings || base.settings),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : base.tasks,
    };

    if (!parsed.user || !parsed.settings || !parsed.tasks) {
      const migrated = migrateLegacyState();
      const merged = {
        user: normalizeUser(safe.user || migrated.user),
        settings: normalizeSettings({ ...migrated.settings, ...safe.settings }),
        tasks: safe.tasks.length ? safe.tasks : migrated.tasks,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    return safe;
  } catch (error) {
    console.error('State migration error:', error);
    const fallback = cloneDefaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveAppState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    user: currentUser || appState.user,
    settings: appState.settings,
    tasks: appState.tasks,
  }));
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getTasksForView() {
  let items = [...appState.tasks];

  if (currentFilter === 'open') {
    items = items.filter((task) => !task.isCompleted);
  } else if (currentFilter === 'done') {
    items = items.filter((task) => task.isCompleted);
  }

  if (selectedTagFilter) {
    items = items.filter((task) => (task.tags || []).includes(selectedTagFilter));
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function renderCounts() {
  const total = appState.tasks.length;
  const open = appState.tasks.filter((task) => !task.isCompleted).length;
  const done = appState.tasks.filter((task) => task.isCompleted).length;

  if (countAll) countAll.textContent = String(total);
  if (countOpen) countOpen.textContent = String(open);
  if (countDone) countDone.textContent = String(done);

  const percent = total ? Math.round((done / total) * 100) : 0;
  if (progressFill) progressFill.style.width = `${percent}%`;
}

function renderTagFilters() {
  if (!tagFilterStrip) return;

  const tags = [...new Set(appState.tasks.flatMap((task) => task.tags || []))];
  const clearLabel = selectedTagFilter ? '<button type="button" class="tag-chip tag-chip--clear" data-tag="__clear__">Clear Filter</button>' : '';

  tagFilterStrip.innerHTML = `${clearLabel}${tags.map((tag) => `
    <button type="button" class="tag-chip ${selectedTagFilter === tag ? 'active' : ''}" data-tag="${tag}">${tag}</button>
  `).join('')}`;

  tagFilterStrip.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-tag');
      selectedTagFilter = value === '__clear__' ? null : value;
      renderBoard();
      renderTagFilters();
    });
  });
}

function renderBoard() {
  if (!board) return;
  const visibleTasks = getTasksForView();
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

  visibleTasks.forEach((task) => {
    const card = document.createElement('article');
    card.className = 'task-card-v2';
    card.dataset.id = task.id;
    card.style.setProperty('--priority-color', task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#D4D4D8');

    const totalSubtasks = task.subtasks?.length || 0;
    const doneSubtasks = (task.subtasks || []).filter((subtask) => subtask.isCompleted).length;
    const subtaskProgress = totalSubtasks ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

    const tagsMarkup = (task.tags || []).map((tag) => `<span class="task-tag">${tag}</span>`).join('');

    card.innerHTML = `
      <div class="task-card-v2__inner">
        <div class="task-card-v2__check-wrap">
          <button type="button" class="task-check ${task.isCompleted ? 'is-done' : ''}" data-action="toggle-task" data-id="${task.id}">${task.isCompleted ? '✓' : ''}</button>
        </div>

        <div class="task-card-v2__content">
          <div class="task-card-v2__topline">
            <h3>${task.title}</h3>
            <span class="task-priority priority-${task.priority}">${task.priority}</span>
          </div>

          <div class="task-card-v2__meta">
            ${task.dueDate ? `<span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : '<span>No due date</span>'}
            <span>${task.recurrence}</span>
          </div>

          <div class="task-card-v2__tags">${tagsMarkup || '<span class="task-tag task-tag--muted">General</span>'}</div>

          <div class="task-progress-row">
            <div class="task-progress-bar"><span style="width:${subtaskProgress}%"></span></div>
            <small>${subtaskProgress}% complete</small>
          </div>

          <div class="subtask-list">
            ${(task.subtasks || []).map((subtask) => `
              <label class="subtask-item">
                <input data-action="toggle-subtask" data-task-id="${task.id}" data-subtask-id="${subtask.id}" type="checkbox" ${subtask.isCompleted ? 'checked' : ''} />
                <span>${subtask.title}</span>
              </label>
            `).join('') || '<div class="subtask-empty">No subtasks yet</div>'}
          </div>

          <div class="task-card-v2__actions">
            <button type="button" class="task-mini-btn" data-action="add-subtask" data-id="${task.id}">+ subtask</button>
            <button type="button" class="task-mini-btn" data-action="edit-task" data-id="${task.id}">Edit</button>
            <button type="button" class="task-mini-btn danger" data-action="delete-task" data-id="${task.id}">Delete</button>
          </div>
        </div>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach((button) => {
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === 'toggle-task') {
        button.addEventListener('click', () => toggleTaskCompletion(id));
      }
      if (action === 'add-subtask') {
        button.addEventListener('click', () => addSubtaskPrompt(id));
      }
      if (action === 'edit-task') {
        button.addEventListener('click', () => openTaskModal(id));
      }
      if (action === 'delete-task') {
        button.addEventListener('click', () => deleteTask(id));
      }
    });

    card.querySelectorAll('[data-action="toggle-subtask"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const taskId = event.target.dataset.taskId;
        const subtaskId = event.target.dataset.subtaskId;
        toggleSubtask(taskId, subtaskId, event.target.checked);
      });
    });

    board.appendChild(card);
  });
}

function applyAppearanceSettings() {
  const { theme, density, notificationsEnabled } = appState.settings;
  document.body.dataset.theme = theme || 'light';
  document.body.dataset.density = density || 'comfortable';
  document.body.dataset.notifications = String(Boolean(notificationsEnabled));
}

function renderUserPanel() {
  const user = currentUser || appState.user;
  const userName = document.getElementById('userName');
  const avatar = document.getElementById('avatar');

  if (userName) userName.textContent = user.name || 'Productive User';
  if (avatar) avatar.textContent = getInitials(user.name, user.email || '');
}

function renderSettingsContent(type) {
  const settingsContent = document.getElementById('settingsContent');
  const profileTitle = document.getElementById('profileTitle');
  const settings = appState.settings;

  if (!settingsContent || !profileTitle) return;

  if (type === 'account') {
    profileTitle.textContent = 'Account settings';
    settingsContent.innerHTML = `
      <div class="profile-editor-grid">
        <div class="profile-editor-card">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar">${getInitials(appState.user.name, '')}</div>
          </div>
          <div class="field">
            <label>Name</label>
            <input id="profileNameInput" type="text" value="${(appState.user.name || '').replace(/"/g, '&quot;')}" />
          </div>
          <div class="field">
            <label>Bio</label>
            <textarea id="profileBioInput" rows="3">${(appState.user.bio || '').replace(/"/g, '&quot;')}</textarea>
          </div>
        </div>
      </div>
      <div class="profile-actions">
        <button type="button" class="btn-ghost btn-ghost--light" id="cancelProfilePanel">Cancel</button>
        <button type="button" class="btn-primary btn-primary--small" id="saveAccountBtn">Save changes</button>
      </div>
    `;

    document.getElementById('saveAccountBtn')?.addEventListener('click', () => {
      const name = document.getElementById('profileNameInput')?.value.trim() || 'Productive User';
      const bio = document.getElementById('profileBioInput')?.value.trim() || '';
      appState.user.name = name;
      appState.user.bio = bio;
      currentUser = { ...appState.user };
      saveAppState();
      renderUserPanel();
      closeProfilePanel();
      flash('Account updated', 'success');
    });

    document.getElementById('cancelProfilePanel')?.addEventListener('click', closeProfilePanel);
    return;
  }

  if (type === 'appearance') {
    profileTitle.textContent = 'Appearance settings';
    settingsContent.innerHTML = `
      <div class="settings-block">
        <div class="settings-section-title">Theme</div>
        <div class="theme-grid">
          <button type="button" class="theme-option ${settings.theme === 'light' ? 'selected' : ''}" data-theme="light"><span class="theme-swatch light"></span><span>Light</span></button>
          <button type="button" class="theme-option ${settings.theme === 'dark' ? 'selected' : ''}" data-theme="dark"><span class="theme-swatch dark"></span><span>Dark</span></button>
          <button type="button" class="theme-option ${settings.theme === 'sepia' ? 'selected' : ''}" data-theme="sepia"><span class="theme-swatch sepia"></span><span>Sepia</span></button>
        </div>

        <div class="settings-row">
          <label for="densitySelect">Density</label>
          <select id="densitySelect">
            <option value="compact" ${settings.density === 'compact' ? 'selected' : ''}>Compact</option>
            <option value="comfortable" ${settings.density === 'comfortable' ? 'selected' : ''}>Comfortable</option>
            <option value="spacious" ${settings.density === 'spacious' ? 'selected' : ''}>Spacious</option>
          </select>
        </div>
      </div>
      <div class="profile-actions">
        <button type="button" class="btn-ghost btn-ghost--light" id="cancelProfilePanel">Cancel</button>
        <button type="button" class="btn-primary btn-primary--small" id="saveAppearanceBtn">Save appearance</button>
      </div>
    `;

    document.querySelectorAll('.theme-option').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.theme-option').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
      });
    });

    document.getElementById('saveAppearanceBtn')?.addEventListener('click', () => {
      const selectedTheme = document.querySelector('.theme-option.selected')?.dataset.theme || settings.theme;
      const density = document.getElementById('densitySelect')?.value || settings.density;
      appState.settings.theme = selectedTheme;
      appState.settings.density = density;
      saveAppState();
      applyAppearanceSettings();
      closeProfilePanel();
      flash('Appearance updated', 'success');
    });

    document.getElementById('cancelProfilePanel')?.addEventListener('click', closeProfilePanel);
    return;
  }

  profileTitle.textContent = 'Notifications & backups';
  settingsContent.innerHTML = `
    <div class="settings-block">
      <label class="toggle-row">
        <span>Notifications</span>
        <input id="notificationsEnabled" type="checkbox" ${settings.notificationsEnabled ? 'checked' : ''} />
      </label>
      <label class="toggle-row">
        <span>Sound effects</span>
        <input id="soundEffects" type="checkbox" ${settings.soundEffects ? 'checked' : ''} />
      </label>
      <div class="settings-row">
        <label for="defaultPrioritySelect">Default priority</label>
        <select id="defaultPrioritySelect">
          <option value="low" ${settings.defaultPriority === 'low' ? 'selected' : ''}>Low</option>
          <option value="medium" ${settings.defaultPriority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${settings.defaultPriority === 'high' ? 'selected' : ''}>High</option>
        </select>
      </div>
      <div class="settings-row settings-row--stacked">
        <button type="button" class="btn-ghost btn-ghost--light export-btn" id="exportDataBtn">Export Application Data</button>
        <label class="import-file-label">
          <input type="file" accept="application/json" id="importDataInput" />
          <span>Import Application Data</span>
        </label>
      </div>
    </div>
    <div class="profile-actions">
      <button type="button" class="btn-ghost btn-ghost--light" id="cancelProfilePanel">Cancel</button>
      <button type="button" class="btn-primary btn-primary--small" id="saveSettingsBtn">Save settings</button>
    </div>
  `;

  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    appState.settings.notificationsEnabled = document.getElementById('notificationsEnabled')?.checked ?? true;
    appState.settings.soundEffects = document.getElementById('soundEffects')?.checked ?? false;
    appState.settings.defaultPriority = document.getElementById('defaultPrioritySelect')?.value || 'medium';
    saveAppState();
    closeProfilePanel();
    flash('Settings saved', 'success');
  });

  document.getElementById('exportDataBtn')?.addEventListener('click', exportAppStateAsJson);
  document.getElementById('importDataInput')?.addEventListener('change', handleImportAppState);
  document.getElementById('cancelProfilePanel')?.addEventListener('click', closeProfilePanel);
}

function closeProfilePanel() {
  const overlay = document.getElementById('profileOverlay');
  overlay?.classList.add('hidden');
  overlay?.setAttribute('aria-hidden', 'true');
}

function exportAppStateAsJson() {
  const payload = JSON.stringify(appState, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'taskflow-backup.json';
  anchor.click();
  URL.revokeObjectURL(url);
  flash('Application data exported', 'success');
}

function handleImportAppState(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const safeState = {
        user: normalizeUser(parsed.user || DEFAULT_STATE.user),
        settings: normalizeSettings(parsed.settings || DEFAULT_STATE.settings),
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
      };
      appState = safeState;
      currentUser = { ...appState.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      applyAppearanceSettings();
      renderUserPanel();
      renderCounts();
      renderBoard();
      renderTagFilters();
      flash('Application data restored', 'success');
    } catch (error) {
      console.error('Import failed:', error);
      flash('The selected file is not valid TaskFlow data', 'error');
    }
  };
  reader.readAsText(file);
}

function renderAuth() {
  if (!authScreen || !appShell) return;

  if (currentUser || appState.user) {
    authScreen.style.display = 'none';
    appShell.style.display = 'flex';
    renderUserPanel();
    renderCounts();
    renderTagFilters();
    renderBoard();
  } else {
    authScreen.style.display = 'grid';
    appShell.style.display = 'none';
  }
}

function addTask(taskPayload) {
  const normalizedTask = normalizeTask({
    ...taskPayload,
    id: Date.now() + Math.random(),
    createdAt: new Date().toISOString(),
    recurrence: taskPayload.recurrence || 'none',
    isCompleted: false,
    priority: taskPayload.priority || appState.settings.defaultPriority || 'medium',
    tags: Array.isArray(taskPayload.tags) ? taskPayload.tags : [],
    subtasks: Array.isArray(taskPayload.subtasks) ? taskPayload.subtasks : [],
  });

  appState.tasks.unshift(normalizedTask);
  saveAppState();
  renderCounts();
  renderTagFilters();
  renderBoard();
}

function toggleTaskCompletion(taskId) {
  appState.tasks = appState.tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, isCompleted: !task.isCompleted };
    }
    return task;
  });
  saveAppState();
  renderCounts();
  renderBoard();
}

function toggleSubtask(taskId, subtaskId, isChecked) {
  appState.tasks = appState.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      subtasks: (task.subtasks || []).map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, isCompleted: isChecked } : subtask
      ),
    };
  });
  saveAppState();
  renderCounts();
  renderBoard();
}

function addSubtaskPrompt(taskId) {
  const value = window.prompt('Add a subtask:');
  if (!value || !value.trim()) return;

  appState.tasks = appState.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      subtasks: [
        ...(task.subtasks || []),
        {
          id: String(Date.now() + Math.random()),
          title: value.trim(),
          isCompleted: false,
        },
      ],
    };
  });
  saveAppState();
  renderBoard();
}

function deleteTask(taskId) {
  const confirmed = window.confirm('Delete this task permanently?');
  if (!confirmed) return;

  appState.tasks = appState.tasks.filter((task) => task.id !== taskId);
  saveAppState();
  renderCounts();
  renderTagFilters();
  renderBoard();
  flash('Task deleted', 'success');
}

function updateTask(taskId, updates) {
  appState.tasks = appState.tasks.map((task) => {
    if (task.id === taskId) {
      return normalizeTask({ ...task, ...updates });
    }
    return task;
  });
  saveAppState();
  renderCounts();
  renderTagFilters();
  renderBoard();
}

function closeTaskModal() {
  if (modalRoot) modalRoot.innerHTML = '';
  editingTaskId = null;
}

function openTaskModal(taskId = null) {
  if (!modalRoot) return;

  const task = appState.tasks.find((item) => item.id === taskId);
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
          <textarea id="taskDescription" name="description" rows="3">${(task && task.description) || ''}</textarea>

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
              <label for="taskDueDate">Due date</label>
              <input id="taskDueDate" name="dueDate" type="date" value="${(task && task.dueDate) || ''}" />
            </div>
          </div>

          <label for="taskTags">Tags</label>
          <input id="taskTags" name="tags" type="text" value="${(task && task.tags && task.tags.join(', ')) || ''}" />

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
    const payload = {
      title: String(new FormData(form).get('title') || '').trim(),
      dueDate: String(new FormData(form).get('dueDate') || '').trim(),
      priority: String(new FormData(form).get('priority') || appState.settings.defaultPriority || 'medium'),
      tags: String(new FormData(form).get('tags') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      recurrence: 'none',
      subtasks: task?.subtasks || [],
    };

    if (!payload.title) {
      flash('Task title is required', 'error');
      return;
    }

    if (editingTaskId) {
      updateTask(editingTaskId, payload);
      flash('Task updated', 'success');
    } else {
      addTask(payload);
      flash('Task created', 'success');
    }

    closeTaskModal();
  });
}

function quickAddTask() {
  const input = document.getElementById('quickAddInput');
  const prioritySelect = document.getElementById('quickAddPriority');
  const dueDateInput = document.getElementById('quickAddDueDate');
  const tagsInput = document.getElementById('quickAddTags');

  const title = input?.value.trim();
  if (!title) {
    input?.classList.add('shake');
    setTimeout(() => input?.classList.remove('shake'), 300);
    flash('Task title is required', 'error');
    return;
  }

  addTask({
    title,
    priority: prioritySelect?.value || appState.settings.defaultPriority || 'medium',
    dueDate: dueDateInput?.value || null,
    tags: (tagsInput?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  });

  if (input) input.value = '';
  if (tagsInput) tagsInput.value = '';
  if (dueDateInput) dueDateInput.value = '';
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
      appState.user = { ...appState.user, name: currentUser.name };
      saveAppState();
      renderAuth();
      flash('You are logged in. Continue to dashboard.', 'success');
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
    appState.user = { ...appState.user, name: currentUser.name };
    saveAppState();
    renderAuth();
    flash('You are logged in. Continue to dashboard.', 'success');
  });
}

function setupDashboardHandlers() {
  const newTaskBtn = document.getElementById('newTaskBtn');
  const quickAddBtn = document.getElementById('quickAddBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const navItems = document.querySelectorAll('.nav-item');
  const profileTrigger = document.getElementById('profileTrigger');
  const profileMenu = document.getElementById('profileMenu');
  const profileOverlay = document.getElementById('profileOverlay');
  const closeProfilePanelBtn = document.getElementById('closeProfilePanel');
  const downloadToggle = document.getElementById('downloadToggle');
  const downloadPanel = document.getElementById('downloadPanel');
  const downloadOptions = document.querySelectorAll('.download-option');

  newTaskBtn?.addEventListener('click', () => openTaskModal());
  quickAddBtn?.addEventListener('click', quickAddTask);
  document.getElementById('quickAddInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      quickAddTask();
    }
  });

  logoutBtn?.addEventListener('click', () => {
    currentUser = null;
    appState.user = normalizeUser();
    saveAppState();
    renderAuth();
    flash('Logged out successfully', 'success');
  });

  profileTrigger?.addEventListener('click', () => {
    const shouldOpen = profileMenu && profileMenu.classList.contains('hidden');
    profileMenu?.classList.toggle('hidden', !shouldOpen);
    profileTrigger.setAttribute('aria-expanded', String(shouldOpen));
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!profileTrigger || !profileMenu) return;
    if (!profileTrigger.contains(target) && !profileMenu.contains(target)) {
      profileMenu.classList.add('hidden');
      profileTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      profileMenu?.classList.add('hidden');
      profileTrigger?.setAttribute('aria-expanded', 'false');

      if (!action) return;
      if (action === 'account') renderSettingsContent('account');
      else if (action === 'appearance') renderSettingsContent('appearance');
      else if (action === 'notifications') renderSettingsContent('notifications');
      else renderSettingsContent('account');

      profileOverlay?.classList.remove('hidden');
      profileOverlay?.setAttribute('aria-hidden', 'false');
    });
  });

  closeProfilePanelBtn?.addEventListener('click', closeProfilePanel);
  profileOverlay?.addEventListener('click', (event) => {
    if (event.target === profileOverlay) closeProfilePanel();
  });

  downloadToggle?.addEventListener('click', () => {
    downloadPanel?.classList.toggle('hidden');
    downloadToggle.classList.toggle('open');
  });

  downloadOptions.forEach((option) => {
    option.addEventListener('click', () => {
      if (option.disabled) return;
      
      const platform = option.dataset.os || 'platform';
      
      if (platform === 'android') {
        // Android download handler
        showAndroidInstallModal();
      } else {
        // Coming soon message for other platforms
        flash(`${platform.charAt(0).toUpperCase() + platform.slice(1)} app coming soon!`, 'success');
      }
    });
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
  appState = loadAppState();
  currentUser = { ...appState.user };
  applyAppearanceSettings();
  setAuthMode(true);
  setupAuthHandlers();
  setupDashboardHandlers();
  renderAuth();
}

let appState = loadAppState();
initialize();
