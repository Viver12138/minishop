"""商品评价相关 API"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import review_dict

router = APIRouter(prefix="/api", tags=["评价"])


@router.post("/reviews", status_code=201)
def create_review(body: schemas.ReviewCreateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.OrderItem).filter(models.OrderItem.id == body.order_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="订单明细不存在")
    order = db.query(models.Order).filter(models.Order.id == item.order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权评价该商品")
    # 只有完成订单可评价
    if order.status != "COMPLETED":
        raise HTTPException(status_code=409, detail="只有已完成订单可以评价")
    # 不能重复评价同一明细
    exists = db.query(models.Review).filter(models.Review.order_item_id == body.order_item_id).first()
    if exists:
        raise HTTPException(status_code=409, detail="该商品已评价")

    review = models.Review(
        order_id=order.id,
        order_item_id=item.id,
        user_id=user.id,
        product_id=item.product_id,
        rating=body.rating,
        content=body.content,
        images=json.dumps(body.images or [], ensure_ascii=False),
        status="ACTIVE",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"code": "OK", "message": "评价成功", "data": review_dict(review)}


@router.get("/products/{product_id}/reviews")
def product_reviews(product_id: int, page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    q = db.query(models.Review).filter(
        models.Review.product_id == product_id, models.Review.status == "ACTIVE"
    )
    total = q.count()
    reviews = q.order_by(models.Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    data = []
    for r in reviews:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        setattr(r, "_nickname", user.nickname if user else "匿名用户")
        data.append(review_dict(r))
    return {"code": "OK", "message": "success", "data": {"items": data, "total": total, "page": page, "page_size": page_size}}


@router.get("/reviews/my")
def my_reviews(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.user_id == user.id).order_by(models.Review.created_at.desc()).all()
    data = []
    for r in reviews:
        product = db.query(models.Product).filter(models.Product.id == r.product_id).first()
        setattr(r, "_product_name", product.name if product else None)
        data.append(review_dict(r))
    return {"code": "OK", "message": "success", "data": data}