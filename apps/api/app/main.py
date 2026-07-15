from fastapi import FastAPI

from app.routes.health import router as health_router
from app.routes.context import router as context_router

app = FastAPI(
    title="Myntra LifeOS API",
    version="1.0.0",
)

app.include_router(health_router)
app.include_router(context_router)