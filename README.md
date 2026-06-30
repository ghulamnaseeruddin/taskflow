# TaskFlow

A production-ready, full-stack To-Do List web application — Flask + SQLAlchemy backend, vanilla JS frontend, ready to deploy.

## Features

- Email/username signup & login (Flask-Login, hashed passwords)
- Tasks with title, notes, priority, category, due date
- Drag-and-drop reordering
- Filters: all / active / completed / overdue, by priority, by category
- Fully responsive UI (desktop sidebar, mobile slide-out menu)
- JSON API powering instant updates with no page reloads
- Works with SQLite locally and Postgres in production (one env var change)

## Project Structure

```
taskflow/
  app/
    __init__.py        # App factory
    config.py           # Environment-based config
    extensions.py        # db, login_manager, migrate
    models.py            # User, Task (SQLAlchemy models)
    auth/routes.py        # signup / login / logout
    tasks/routes.py       # dashboard + JSON API
    templates/            # Jinja2 templates
    static/css/style.css   # All styling
    static/js/app.js        # Dashboard frontend logic
  wsgi.py                # Entry point for gunicorn / local run
  requirements.txt
  Procfile               # For Render / Heroku
  .env.example
```

## Local Setup

```bash
cd taskflow
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
copy .env.example .env       # Windows: copy, Mac/Linux: cp
# Edit .env and set a real SECRET_KEY

python wsgi.py
```

Visit `http://127.0.0.1:5000` — it redirects to login. Click "Create an account" to sign up.

The SQLite database is created automatically on first run at `instance/taskflow.db`.

## Deploying (industry-standard options)

### Option A: Render.com (recommended, free tier available)
1. Push this folder to a GitHub repo.
2. On Render: New → Web Service → connect your repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn wsgi:app`
5. Add environment variables: `SECRET_KEY` (random string), `FLASK_ENV=production`.
6. Add a free Postgres database on Render and copy its "Internal Database URL" into `DATABASE_URL`.

### Option B: Railway.app
Same idea — connect the repo, it auto-detects the `Procfile`, add the same env vars and a Postgres plugin.

### Option C: PythonAnywhere
Good for SQLite-based small deployments; follow their Flask WSGI setup guide and point it at `wsgi.py`.

## Switching from SQLite to Postgres

No code changes needed — just set the `DATABASE_URL` environment variable to your Postgres connection string. `config.py` already handles the `postgres://` → `postgresql://` fix that Render/Heroku need.

## Security Notes Before Going Live

- Set a strong, random `SECRET_KEY` in production (never reuse the dev default).
- Set `FLASK_ENV=production` so cookies are marked `Secure` (requires HTTPS, which Render/Railway provide by default).
- Passwords are hashed with Werkzeug's PBKDF2-SHA256 — never stored in plain text.
