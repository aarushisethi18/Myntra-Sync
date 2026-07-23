from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.context import router as context_router
from app.routes.context_collection import router as context_collection_router
from app.routes.behavior import router as behavior_router
from app.routes.products import router as products_router
from app.routes.shopping_flow import router as shopping_flow_router
from app.routes.blend import router as blend_router
from app.routes.wrapped import router as wrapped_router
from app.routes.analytics import router as analytics_router

app = FastAPI(
    title="Myntra LifeOS API",
    version="1.0.0",
)

# Allow React frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(context_router)
app.include_router(context_collection_router)
app.include_router(behavior_router)
app.include_router(products_router)
app.include_router(shopping_flow_router)
app.include_router(blend_router)
app.include_router(wrapped_router)
app.include_router(analytics_router)
