/* app.js — TaskFlow dashboard logic.
   Renders tasks, handles CRUD via the JSON API, filters, and drag reorder. */
(function () {
  const isDashboard = document.getElementById("board");

  // ---------- Sidebar toggle (mobile) ----------
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
        sidebar.classList.remove("open");
      }
    });
  }

  // ---------- Auto-dismiss flashes ----------
  document.querySelectorAll(".flash").forEach((el) => {
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, 3000);
    setTimeout(() => el.remove(), 3400);
  });

  if (!isDashboard) return;

  // ================= STATE =================
  let tasks = window.__INITIAL_TASKS__ || [];
  const today = window.__TODAY__;
  let currentFilter = "all";
  let currentPriority = null;
  let currentCategory = null;

  const board = document.getElementById("board");
  const emptyState = document.getElementById("emptyState");
  const boardTitle = document.getElementById("boardTitle");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");

  // ================= HELPERS =================
  function isOverdue(t) {
    return t.due_date && t.due_date < today && !t.completed;
  }

  function formatDate(d) {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function updateCounts() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter(isOverdue).length;

    document.getElementById("countAll").textContent = total;
    document.getElementById("countActive").textContent = total - completed;
    document.getElementById("countCompleted").textContent = completed;
    document.getElementById("countOverdue").textContent = overdue;

    progressText.textContent = total ? `${completed} of ${total} complete` : "Nothing here yet";
    if (progressFill) {
      progressFill.style.width = total ? `${(completed / total) * 100}%` : "0%";
    }
  }

  function getFiltered() {
    let list = tasks.slice();
    if (currentFilter === "active") list = list.filter((t) => !t.completed);
    if (currentFilter === "completed") list = list.filter((t) => t.completed);
    if (currentFilter === "overdue") list = list.filter(isOverdue);
    if (currentPriority) list = list.filter((t) => t.priority === currentPriority);
    if (currentCategory) list = list.filter((t) => t.category === currentCategory);
    return list.sort((a, b) => a.position - b.position);
  }

  function render() {
    const list = getFiltered();
    board.innerHTML = "";
    emptyState.hidden = list.length !== 0;

    list.forEach((t) => {
      const card = document.createElement("div");
      card.className = "task-card" + (t.completed ? " completed" : "");
      card.draggable = true;
      card.dataset.id = t.id;

      const overdueBadge = isOverdue(t) ? `<span class="badge badge-overdue">Overdue</span>` : "";
      const dueBadge = t.due_date ? `<span class="task-meta-date">📅 ${formatDate(t.due_date)}</span>` : "";

      card.innerHTML = `
        <button class="check-btn" data-action="toggle">${t.completed ? "✓" : ""}</button>
        <div class="task-body">
          <div class="task-title-row">
            <span class="task-title">${escapeHtml(t.title)}</span>
            <span class="badge badge-${t.priority}">${t.priority}</span>
            <span class="badge badge-category">${escapeHtml(t.category)}</span>
            ${overdueBadge}
          </div>
          ${t.notes ? `<p class="task-notes">${escapeHtml(t.notes)}</p>` : ""}
          ${dueBadge ? `<div class="task-meta">${dueBadge}</div>` : ""}
        </div>
        <div class="task-actions">
          <button class="icon-btn edit" data-action="edit" aria-label="Edit">✎</button>
          <button class="icon-btn delete" data-action="delete" aria-label="Delete">✕</button>
        </div>
      `;
      board.appendChild(card);
    });

    updateCounts();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ================= API CALLS =================
  async function apiCreate(payload) {
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return res.json();
  }
  async function apiUpdate(id, payload) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return res.json();
  }
  async function apiDelete(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }
  async function apiReorder(order) {
    await fetch("/api/tasks/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }),
    });
  }

  // ================= FILTER NAV =================
  document.querySelectorAll(".nav-item[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item[data-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      boardTitle.textContent = btn.textContent.trim().replace(/\d+$/, "").trim() || "All tasks";
      render();
    });
  });

  document.querySelectorAll(".priority-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      const active = btn.classList.contains("active");
      document.querySelectorAll(".priority-filter").forEach((b) => b.classList.remove("active"));
      currentPriority = active ? null : btn.dataset.priority;
      if (!active) btn.classList.add("active");
      render();
    });
  });

  document.querySelectorAll(".category-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      const active = btn.classList.contains("active");
      document.querySelectorAll(".category-filter").forEach((b) => b.classList.remove("active"));
      currentCategory = active ? null : btn.dataset.category;
      if (!active) btn.classList.add("active");
      render();
    });
  });

  // ================= TASK CARD ACTIONS (delegated) =================
  board.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const card = btn.closest(".task-card");
    const id = parseInt(card.dataset.id, 10);
    const task = tasks.find((t) => t.id === id);

    if (btn.dataset.action === "toggle") {
      task.completed = !task.completed;
      render();
      await apiUpdate(id, { completed: task.completed });
    } else if (btn.dataset.action === "delete") {
      card.style.opacity = "0";
      tasks = tasks.filter((t) => t.id !== id);
      setTimeout(render, 120);
      await apiDelete(id);
    } else if (btn.dataset.action === "edit") {
      openModal(task);
    }
  });

  // ================= DRAG REORDER =================
  let dragId = null;
  board.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".task-card");
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add("dragging");
  });
  board.addEventListener("dragend", (e) => {
    const card = e.target.closest(".task-card");
    if (card) card.classList.remove("dragging");
  });
  board.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dragging = board.querySelector(".dragging");
    if (!dragging) return;
    const afterEl = getDragAfterElement(board, e.clientY);
    if (afterEl == null) board.appendChild(dragging);
    else board.insertBefore(dragging, afterEl);
  });
  board.addEventListener("drop", async () => {
    const order = Array.from(board.querySelectorAll(".task-card")).map((c) => c.dataset.id);
    order.forEach((id, idx) => {
      const t = tasks.find((tt) => tt.id === parseInt(id, 10));
      if (t) t.position = idx;
    });
    await apiReorder(order);
  });
  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".task-card:not(.dragging)")];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ================= MODAL =================
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const taskForm = document.getElementById("taskForm");
  const taskIdField = document.getElementById("taskId");
  const taskTitleField = document.getElementById("taskTitle");
  const taskNotesField = document.getElementById("taskNotes");
  const taskPriorityField = document.getElementById("taskPriority");
  const taskCategoryField = document.getElementById("taskCategory");
  const taskDueDateField = document.getElementById("taskDueDate");

  function openModal(task) {
    if (task) {
      modalTitle.textContent = "Edit task";
      taskIdField.value = task.id;
      taskTitleField.value = task.title;
      taskNotesField.value = task.notes || "";
      taskPriorityField.value = task.priority;
      taskCategoryField.value = task.category;
      taskDueDateField.value = task.due_date || "";
    } else {
      modalTitle.textContent = "New task";
      taskForm.reset();
      taskIdField.value = "";
      taskPriorityField.value = "medium";
    }
    modalBackdrop.hidden = false;
    setTimeout(() => taskTitleField.focus(), 50);
  }
  function closeModal() {
    modalBackdrop.hidden = true;
  }

  document.getElementById("openAddModal").addEventListener("click", () => openModal(null));
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalBackdrop.hidden) closeModal(); });

  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: taskTitleField.value.trim(),
      notes: taskNotesField.value.trim(),
      priority: taskPriorityField.value,
      category: taskCategoryField.value.trim() || "general",
      due_date: taskDueDateField.value || null,
    };
    const id = taskIdField.value;

    if (id) {
      const updated = await apiUpdate(id, payload);
      const idx = tasks.findIndex((t) => t.id === parseInt(id, 10));
      if (idx > -1) tasks[idx] = updated;
    } else {
      const created = await apiCreate(payload);
      if (created.id) tasks.push(created);
    }
    closeModal();
    render();
  });

  // ================= INIT =================
  render();
})();
