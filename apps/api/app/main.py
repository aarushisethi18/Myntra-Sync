from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.context import router as context_router
from app.routes.context_collection import router as context_collection_router
from app.routes.behavior import router as behavior_router
from app.routes.products import router as products_router
from app.routes.shopping_flow import router as shopping_flow_router
from app.routes.calendar import router as calendar_router
from app.routes.notifications import router as notifications_router
from app.routes.order_history import router as order_history_router

app = FastAPI(
    title="Myntra-Sync API",
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
app.include_router(calendar_router)
app.include_router(notifications_router)
app.include_router(order_history_router)

