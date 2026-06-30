"""
config.py
Central app configuration. Reads from environment variables so the same
codebase works in development and in production (Render, Railway, Heroku,
PythonAnywhere, etc.) without code changes.
"""
import os
from datetime import timedelta

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

    # Default to local SQLite file; in production set DATABASE_URL
    # (e.g. postgresql://user:pass@host:5432/dbname) as an env var.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'instance', 'taskflow.db')}"
    )
    # Render/Heroku give postgres:// — SQLAlchemy 2.x needs postgresql://
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = timedelta(days=14)

    # Set to True automatically when running behind HTTPS in production
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
