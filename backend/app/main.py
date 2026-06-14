import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.logging_config import configure_logging
from app.middleware import log_requests
from app.routers import sets as sets_router
from app.routers import cards as cards_router
from app.routers import inventory as inventory_router

configure_logging()


def _api_docs_enabled() -> bool:
    """Swagger UI/ReDoc/OpenAPI schema are public, unauthenticated routes.
    Disabled in production (ENVIRONMENT=production) to avoid exposing the
    API surface; left on everywhere else (local dev, CI)."""
    return os.environ.get("ENVIRONMENT") != "production"


_docs_kwargs = (
    {}
    if _api_docs_enabled()
    else {"docs_url": None, "redoc_url": None, "openapi_url": None}
)

app = FastAPI(
    title="SWU Inventory Manager",
    description="Star Wars Unlimited card inventory management API",
    version="1.0.0",
    **_docs_kwargs,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(log_requests)

app.include_router(sets_router.router)
app.include_router(cards_router.router)
app.include_router(inventory_router.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
