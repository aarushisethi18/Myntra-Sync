from __future__ import annotations

import logging
from typing import Annotated, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthenticatedUser

logger = logging.getLogger(__name__)
router = APIRouter(tags=["shopping-flow"])

# Pydantic Schemas for Requests
class BagItemInput(BaseModel):
    productId: str = Field(..., alias="product_id")
    size: str
    quantity: int = 1
    
    class Config:
        populate_by_name = True

class BagItemUpdate(BaseModel):
    quantity: int

class WishlistInput(BaseModel):
    productId: str = Field(..., alias="product_id")
    
    class Config:
        populate_by_name = True

class OrderItemInput(BaseModel):
    productId: str = Field(..., alias="product_id")
    size: str
    quantity: int
    price: int
    
    class Config:
        populate_by_name = True

class OrderInput(BaseModel):
    items: list[OrderItemInput]

# Helper to format product details from row
def format_product(row):
    return {
        "id": str(row["p_id"]),
        "brand": row["brand"],
        "title": row["name"],
        "category": row["category"],
        "color": row["color"],
        "style": row["style"],
        "price": row["price"],
        "originalPrice": row["original_price"] or row["price"],
        "rating": float(row["rating"]) if row["rating"] is not None else 4.0,
        "reviews": row["reviews"] or 0,
        "image": row["image_url"] or "",
        "sizes": row["sizes"] or ["One Size"],
        "description": row["description"] or "",
        "badge": row["badge"]
    }

# ----------------- SHOPPING BAG ENDPOINTS -----------------

@router.get("/bag")
def get_bag(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT b.id as b_id, b.size, b.quantity, b.created_at,
                       p.id as p_id, p.name, p.category, p.brand, p.color, p.price, p.style, p.image_url,
                       p.original_price, p.rating, p.reviews, p.sizes, p.description, p.badge
                FROM public.bag b
                JOIN public.products p ON b.product_id = p.id
                WHERE b.user_id = :user_id
                ORDER BY b.created_at DESC
            """), {"user_id": current_user.id}).mappings().all()
            
            return [{
                "id": str(row["b_id"]),
                "size": row["size"],
                "quantity": row["quantity"],
                "createdAt": row["created_at"].isoformat(),
                "product": format_product(row)
            } for row in rows]
    except Exception as error:
        logger.exception("Failed to fetch shopping bag")
        raise HTTPException(status_code=500, detail="Could not retrieve shopping bag.") from error

@router.post("/bag")
def add_to_bag(item: BagItemInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.begin() as conn:
            # Check if item with same product_id and size already exists in bag
            existing = conn.execute(text("""
                SELECT id, quantity FROM public.bag 
                WHERE user_id = :user_id AND product_id = :product_id AND size = :size
            """), {"user_id": current_user.id, "product_id": item.productId, "size": item.size}).mappings().first()
            
            if existing:
                new_qty = existing["quantity"] + item.quantity
                conn.execute(text("""
                    UPDATE public.bag SET quantity = :qty WHERE id = :id
                """), {"qty": new_qty, "id": existing["id"]})
                return {"status": "updated", "quantity": new_qty}
            else:
                conn.execute(text("""
                    INSERT INTO public.bag (user_id, product_id, size, quantity)
                    VALUES (:user_id, :product_id, :size, :quantity)
                """), {
                    "user_id": current_user.id,
                    "product_id": item.productId,
                    "size": item.size,
                    "quantity": item.quantity
                })
                return {"status": "added"}
    except Exception as error:
        logger.exception("Failed to add item to bag")
        raise HTTPException(status_code=500, detail="Could not add item to bag.") from error

@router.put("/bag/{bag_item_id}")
def update_bag_quantity(bag_item_id: str, body: BagItemUpdate, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE public.bag SET quantity = :quantity 
                WHERE id = :id AND user_id = :user_id
            """), {"quantity": body.quantity, "id": bag_item_id, "user_id": current_user.id})
            return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to update bag quantity")
        raise HTTPException(status_code=500, detail="Could not update bag quantity.") from error

@router.delete("/bag/{bag_item_id}")
def remove_from_bag(bag_item_id: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                DELETE FROM public.bag WHERE id = :id AND user_id = :user_id
            """), {"id": bag_item_id, "user_id": current_user.id})
            return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to delete bag item")
        raise HTTPException(status_code=500, detail="Could not delete bag item.") from error


# ----------------- WISHLIST ENDPOINTS -----------------

@router.get("/wishlist")
def get_wishlist(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT w.id as w_id, w.created_at,
                       p.id as p_id, p.name, p.category, p.brand, p.color, p.price, p.style, p.image_url,
                       p.original_price, p.rating, p.reviews, p.sizes, p.description, p.badge
                FROM public.wishlist w
                JOIN public.products p ON w.product_id = p.id
                WHERE w.user_id = :user_id
                ORDER BY w.created_at DESC
            """), {"user_id": current_user.id}).mappings().all()
            
            return [{
                "id": str(row["w_id"]),
                "createdAt": row["created_at"].isoformat(),
                "product": format_product(row)
            } for row in rows]
    except Exception as error:
        logger.exception("Failed to fetch wishlist")
        raise HTTPException(status_code=500, detail="Could not retrieve wishlist.") from error

@router.post("/wishlist")
def add_to_wishlist(item: WishlistInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO public.wishlist (user_id, product_id)
                VALUES (:user_id, :product_id)
                ON CONFLICT (user_id, product_id) DO NOTHING
            """), {"user_id": current_user.id, "product_id": item.productId})
            return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to add to wishlist")
        raise HTTPException(status_code=500, detail="Could not add to wishlist.") from error

@router.delete("/wishlist/{product_id}")
def remove_from_wishlist(product_id: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                DELETE FROM public.wishlist WHERE user_id = :user_id AND product_id = :product_id
            """), {"user_id": current_user.id, "product_id": product_id})
            return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to remove from wishlist")
        raise HTTPException(status_code=500, detail="Could not remove from wishlist.") from error


# ----------------- ORDERS ENDPOINTS -----------------

@router.get("/orders")
def get_orders(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT o.id as o_id, o.size, o.quantity, o.price as purchase_price, o.status as o_status, o.created_at,
                       p.id as p_id, p.name, p.category, p.brand, p.color, p.price, p.style, p.image_url,
                       p.original_price, p.rating, p.reviews, p.sizes, p.description, p.badge
                FROM public.orders o
                JOIN public.products p ON o.product_id = p.id
                WHERE o.user_id = :user_id
                ORDER BY o.created_at DESC
            """), {"user_id": current_user.id}).mappings().all()
            
            return [{
                "id": str(row["o_id"]),
                "size": row["size"],
                "quantity": row["quantity"],
                "price": row["purchase_price"],
                "status": row["o_status"],
                "createdAt": row["created_at"].isoformat(),
                "product": format_product(row)
            } for row in rows]
    except Exception as error:
        logger.exception("Failed to fetch orders")
        raise HTTPException(status_code=500, detail="Could not retrieve orders.") from error

@router.post("/orders")
def create_order(body: OrderInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        import random
        statuses = ["Processing", "Out for Delivery", "Delivered"]
        with engine.begin() as conn:
            for item in body.items:
                # Assign a plausible status
                order_status = random.choice(statuses)
                conn.execute(text("""
                    INSERT INTO public.orders (user_id, product_id, size, quantity, price, status)
                    VALUES (:user_id, :product_id, :size, :quantity, :price, :status)
                """), {
                    "user_id": current_user.id,
                    "product_id": item.productId,
                    "size": item.size,
                    "quantity": item.quantity,
                    "price": item.price,
                    "status": order_status
                })
            return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to create order")
        raise HTTPException(status_code=500, detail="Could not create order.") from error
