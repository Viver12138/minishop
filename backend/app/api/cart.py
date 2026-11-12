"""购物车相关 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import json_loads

router = APIRouter(prefix="/api/cart", tags=["购物车"])


def _cart_item_dict(ci: models.CartItem):
    sku = None
    if ci.sku_id:
        sku = ci.sku
    product = None
    if sku:
        product = sku.product
    return {
        "id": ci.id,
        "sku_id": ci.sku_id,
        "quantity": ci.quantity,
        "product_id": product.id if product else None,
        "product_name": product.name if product else "",
        "product_image": (json_loads(product.images, [])[:1] or [""])[0] if product else "",
        "spec_values": json_loads(sku.spec_values) if sku else {},
        "price": sku.price if sku else 0,
        "stock": sku.stock if sku else 0,
        "product_status": product.status if product else "OFF_SALE",
        "subtotal": (sku.price if sku else 0) * ci.quantity,
        "available": True if (product and product.status == "ON_SALE" and sku and sku.stock >= ci.quantity) else False,
    }


@router.get("")
def get_cart(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()
    data = []
    for ci in items:
        if not ci.sku:
            continue
        data.append(_cart_item_dict(ci))
    total_amount = sum(x["subtotal"] for x in data)
    return {
        "code": "OK",
        "message": "success",
        "data": {"items": data, "total_amount": total_amount},
    }


@router.post("/items", status_code=201)
def add_item(body: schemas.CartAddRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sku = db.query(models.ProductSku).filter(models.ProductSku.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU 不存在")
    product = db.query(models.Product).filter(models.Product.id == sku.product_id).first()
    if not product or product.status != "ON_SALE":
        raise HTTPException(status_code=400, detail="商品已下架，无法购买")
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="数量不能小于 1")
    if body.quantity > sku.stock:
        raise HTTPException(status_code=400, detail="库存不足")

    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id, models.CartItem.sku_id == body.sku_id
    ).first()
    if existing:
        # 同 SKU 合并数量
        new_qty = existing.quantity + body.quantity
        if new_qty > sku.stock:
            raise HTTPException(status_code=400, detail="库存不足，无法合并")
        existing.quantity = new_qty
        db.commit()
        return {"code": "OK", "message": "已加入购物车", "data": None}
    else:
        cart = models.CartItem(user_id=user.id, sku_id=body.sku_id, quantity=body.quantity)
        db.add(cart)
        db.commit()
        return {"code": "OK", "message": "已加入购物车", "data": None}


@router.put("/items/{item_id}")
def update_item(item_id: int, body: schemas.CartUpdateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.user_id == user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="数量不能小于 1")
    sku = db.query(models.ProductSku).filter(models.ProductSku.id == cart.sku_id).first()
    if sku and body.quantity > sku.stock:
        raise HTTPException(status_code=400, detail="数量不能超过库存")
    cart.quantity = body.quantity
    db.commit()
    return {"code": "OK", "message": "更新成功", "data": None}


@router.delete("/items/{item_id}")
def delete_item(item_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.user_id == user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    db.delete(cart)
    db.commit()
    return {"code": "OK", "message": "删除成功", "data": None}