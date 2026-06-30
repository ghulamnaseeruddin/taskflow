"""
tasks/routes.py
Dashboard page + a small JSON API (used by static/js/app.js) so the
frontend can add, toggle, edit, delete, and reorder tasks without full
page reloads.
"""
from datetime import datetime, date
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user

from app.extensions import db
from app.models import Task

tasks_bp = Blueprint("tasks", __name__)

VALID_PRIORITIES = {"low", "medium", "high"}


def parse_due_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


@tasks_bp.route("/")
@login_required
def dashboard():
    tasks = (
        Task.query.filter_by(user_id=current_user.id)
        .order_by(Task.position.asc())
        .all()
    )
    categories = sorted({t.category for t in tasks}) or ["general"]

    total = len(tasks)
    completed = sum(1 for t in tasks if t.completed)
    overdue = sum(
        1 for t in tasks if t.due_date and t.due_date < date.today() and not t.completed
    )

    return render_template(
        "tasks/dashboard.html",
        tasks=[t.to_dict() for t in tasks],
        categories=categories,
        total=total,
        completed=completed,
        overdue=overdue,
        today=date.today().isoformat(),
    )


# ---------------------------------------------------------------- JSON API

@tasks_bp.route("/api/tasks", methods=["POST"])
@login_required
def api_create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    priority = data.get("priority", "medium")
    if priority not in VALID_PRIORITIES:
        priority = "medium"

    max_pos = db.session.query(db.func.coalesce(db.func.max(Task.position), -1)).filter(
        Task.user_id == current_user.id
    ).scalar()

    task = Task(
        user_id=current_user.id,
        title=title,
        notes=(data.get("notes") or "").strip() or None,
        priority=priority,
        category=(data.get("category") or "general").strip() or "general",
        due_date=parse_due_date(data.get("due_date")),
        position=max_pos + 1,
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@tasks_bp.route("/api/tasks/<int:task_id>", methods=["PATCH"])
@login_required
def api_update_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task is None:
        return jsonify({"error": "Task not found."}), 404

    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify({"error": "Title cannot be empty."}), 400
        task.title = title
    if "notes" in data:
        task.notes = (data["notes"] or "").strip() or None
    if "priority" in data and data["priority"] in VALID_PRIORITIES:
        task.priority = data["priority"]
    if "category" in data:
        task.category = (data["category"] or "general").strip() or "general"
    if "due_date" in data:
        task.due_date = parse_due_date(data["due_date"])
    if "completed" in data:
        task.completed = bool(data["completed"])
        task.completed_at = datetime.utcnow() if task.completed else None

    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def api_delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task is None:
        return jsonify({"error": "Task not found."}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"ok": True})


@tasks_bp.route("/api/tasks/reorder", methods=["POST"])
@login_required
def api_reorder_tasks():
    """Body: {"order": [task_id, task_id, ...]} in the new visual order."""
    data = request.get_json(silent=True) or {}
    order = data.get("order", [])

    tasks_by_id = {
        t.id: t for t in Task.query.filter_by(user_id=current_user.id).all()
    }
    for index, task_id in enumerate(order):
        task = tasks_by_id.get(int(task_id))
        if task:
            task.position = index
    db.session.commit()
    return jsonify({"ok": True})
