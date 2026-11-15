"""Start the API: `python run.py` (reads PORT from .env, reloads on code changes in development)."""
import uvicorn

from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=settings.env == "development")
