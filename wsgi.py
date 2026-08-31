# Entry point for Vercel — exports the Flask WSGI app.
import os
from dotenv import load_dotenv

# Load local .env when running locally
load_dotenv()

from app import create_app

# Create the Flask app using your factory
app = create_app()

# If vercel-wsgi is available, wrap the app for optimal compatibility.
try:
    import vercel_wsgi
    app = vercel_wsgi.handle(app)
except Exception:
    # Fall back to exporting the raw WSGI app
    pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "development") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
