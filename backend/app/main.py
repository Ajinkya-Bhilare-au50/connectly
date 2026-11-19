import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from . import db
from .config import get_settings
from .errors import register_error_handlers
from .routers import auth, conversations, lists, notifications, profiles, test_data, tweets, uploads, users
from .social import backfill_hashtags

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.connect()
    logger.info("Connected to MongoDB")
    await backfill_hashtags()
    yield
    await db.disconnect()


app = FastAPI(
    title="Connectly API",
    version="4.0.0",
    lifespan=lifespan,
    # Interactive docs at /api/docs
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(users.router)
api.include_router(profiles.router)
api.include_router(tweets.router)
api.include_router(uploads.router)
api.include_router(notifications.router)
api.include_router(conversations.router)
api.include_router(lists.router)
app.include_router(api)

if settings.is_dev_or_test:
    app.include_router(test_data.router)


# GET + HEAD so uptime pingers (e.g. UptimeRobot, which uses HEAD) keep the Render instance awake.
@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["health"])
async def health():
    return {"status": "ok"}
