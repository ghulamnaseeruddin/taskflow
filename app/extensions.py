"""
extensions.py
Flask extension instances, created here (not in __init__.py) to avoid
circular imports between app/__init__.py, models.py, and the route blueprints.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

login_manager.login_view = "auth.login"
login_manager.login_message = "Please log in to access your tasks."
login_manager.login_message_category = "error"
