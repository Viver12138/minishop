"""管理后台相关 API：Dashboard、用户管理、订单管理/发货、库存、售后审核"""
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import require_admin
from .common import (
    _user_dict, _product_dict, _sku_dict, json_loads, order_dict,
    refund_dict, review_dict, create_message,
)

router = APIRouter(prefix="/api/admin", tags=["管理后台"])


# ============================================================
# Dashboard
# ============================================================
@router.get("/dashboard")
def dashboard(_=Depends(require_admin), db: Session = Depends(get_db)):
    user_count = db.query(models.User).filter(models.User.role == "USER").count()
    product_count = db.query(models.Product).count()
    order_count = db.query(models.Order).count()
    pending_orders = db.query(models.Order).filter(models.Order.status.in_(["PENDING_PAYMENT", "PAID", "PENDING_SHIPMENT"])).count()
    sales_amount = db.query(models.Order).filter(models.Order.status.in_(
        ["PAID", "PENDING_SHIPMENT", "SHIPPED", "COMPLETED", "REFUNDING", "REFUNDED"]
    )).all()
    sales_total = sum(o.pay_amount for o in sales_amount)
    refund_amount = db.query(models.Refund).filter(models.Refund.status == "REFUNDED").all()
    refund_total = sum(r.amount for r in refund_amount)
    # 库存预警：库存 <= 5 的在售商品
    low_stock_products = db.query(models.Product).filter(
        models.Product.status == "ON_SALE", models.Product.stock <= 5
    ).all()
    # 待处理售后（待审核退款）
    pending_refunds = db.query(models.Refund).filter(models.Refund.status == "PENDING").count()
    # 待发货订单
    to_ship_orders = db.query(models.Order).filter(models.Order.status == "PAID").count()

    return {
        "code": "OK",
        "message": "success",
        "data": {
            "user_count": user_count,
            "product_count": product_count,
            "order_count": order_count,
            "pending_orders": pending_orders,
            "sales_amount": sales_total,
            "refund_amount": refund_total,
            "low_stock_count": len(low_stock_products),
            "pending_refunds": pending_refunds,
            "to_ship_orders": to_ship_orders,
        },
    }


# ============================================================
# 用户管理
# ============================================================
@router.get("/users")
def list_users(
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(models.User)
    if keyword:
        q = q.filter(models.User.username.like(f"%{keyword}%") | models.User.nickname.like(f"%{keyword}%"))
    total = q.count()
    users = q.order_by(models.User.id).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "code": "OK", "message": "success",
        "data": {"items": [_user_dict(u) for u in users], "total": total, "page": page, "page_size": page_size},
    }


@router.get("/users/{user_id}")
def user_detail(user_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    order_count = db.query(models.Order).filter(models.Order.user_id == user_id).count()
    d = _user_dict(user)
    d["order_count"] = order_count
    return {"code": "OK", "message": "success", "data": d}


@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, body: schemas.UserStatusUpdate, _=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.role == "ADMIN" and body.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="不能禁用管理员账号")
    user.status = body.status
    db.commit()
    return {"code": "OK", "message": "更新成功", "data": _user_dict(user)}


@router.get("/users/{user_id}/orders")
def user_orders(user_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.id.desc()).all()
    return {"code": "OK", "message": "success", "data": [order_dict(o, with_items=True) for o in orders]}


# ============================================================
# 订单管理
# ============================================================
@router.get("/orders")
def admin_orders(
    status: Optional[str] = None,
    order_no: Optional[str] = None,
    username: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(models.Order)
    if status:
        q = q.filter(models.Order.status == status)
    if order_no:
        q = q.filter(models.Order.order_no.like(f"%{order_no}%"))
    if username:
        users = db.query(models.User).filter(models.User.username.like(f"%{username}%")).all()
        ids = [u.id for u in users]
        q = q.filter(models.Order.user_id.in_(ids))
    total = q.count()
    orders = q.order_by(models.Order.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    data = []
    for o in orders:
        d = order_dict(o, with_items=True)
        user = db.query(models.User).filter(models.User.id == o.user_id).first()
        d["username"] = user.username if user else None
        ship = db.query(models.Shipment).filter(models.Shipment.order_id == o.id).first()
        if ship:
            d["shipment_company"] = ship.company
            d["shipment_tracking_number"] = ship.tracking_number
        data.append(d)
    return {"code": "OK", "message": "success", "data": {"items": data, "total": total, "page": page, "page_size": page_size}}


@router.get("/orders/{order_id}")
def admin_order_detail(order_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {"code": "OK", "message": "success", "data": order_dict(order, with_items=True, with_payment=True, with_shipment=True)}


@router.post("/orders/{order_id}/ship")
def ship_order(order_id: int, body: schemas.ShipRequest, _=Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status not in ("PAID", "PENDING_SHIPMENT"):
        raise HTTPException(status_code=409, detail="只有已支付/待发货的订单可以发货")
    now = datetime.utcnow()
    order.status = "SHIPPED"
    order.shipped_at = now
    new_ship = db.query(models.Shipment).filter(models.Shipment.order_id == order.id).first()
    if not new_ship:
        new_ship = models.Shipment(order_id=order.id, company=body.company, tracking_number=body.tracking_number)
        db.add(new_ship)
    else:
        new_ship.company = body.company
        new_ship.tracking_number = body.tracking_number
        new_ship.status = "SHIPPED"
        new_ship.shipped_at = now
    create_message(db, order.user_id, "订单已发货",
                   f"您的订单 {order.order_no} 已通过 {body.company} 发货，运单号 {body.tracking_number}", "SHIPMENT")
    db.commit()
    return {"code": "OK", "message": "发货成功", "data": {"order_id": order.id, "status": order.status}}


# ============================================================
# 售后管理
# ============================================================
@router.get("/refunds")
def admin_refunds(status: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
                  _=Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(models.Refund)
    if status:
        q = q.filter(models.Refund.status == status)
    total = q.count()
    refunds = q.order_by(models.Refund.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    data = []
    for r in refunds:
        order = db.query(models.Order).filter(models.Order.id == r.order_id).first()
        setattr(r, "_order_no", order.order_no if order else None)
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        d = refund_dict(r)
        d["username"] = user.username if user else None
        if order:
            d["product_names"] = ", ".join([i.product_name_snapshot for i in order.items])
        data.append(d)
    return {"code": "OK", "message": "success", "data": {"items": data, "total": total, "page": page, "page_size": page_size}}


@router.post("/refunds/{refund_id}/approve")
def approve_refund(refund_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    refund = db.query(models.Refund).filter(models.Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="退款记录不存在")
    if refund.status != "PENDING":
        raise HTTPException(status_code=409, detail="该退款已被处理")
    refund.status = "APPROVED"
    refund.processed_at = datetime.utcnow()
    order = db.query(models.Order).filter(models.Order.id == refund.order_id).first()
    if order:
        order.status = "REFUNDED"
        refund.status = "REFUNDED"
        create_message(db, order.user_id, "退款成功",
                       f"您的订单 {order.order_no} 退款已到账，金额 ¥{refund.amount:g}", "REFUND")
        # 退款成功恢复库存
        _restore_stock(db, order, admin_id=refund.user_id)
    db.commit()
    return {"code": "OK", "message": "已同意退款", "data": refund_dict(refund)}


@router.post("/refunds/{refund_id}/reject")
def reject_refund(refund_id: int, body: schemas.RefundReviewRequest, _=Depends(require_admin), db: Session = Depends(get_db)):
    refund = db.query(models.Refund).filter(models.Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="退款记录不存在")
    if refund.status != "PENDING":
        raise HTTPException(status_code=409, detail="该退款已被处理")
    if not body.reject_reason:
        raise HTTPException(status_code=400, detail="拒绝时必须填写原因")
    refund.status = "REJECTED"
    refund.reject_reason = body.reject_reason
    refund.processed_at = datetime.utcnow()
    order = db.query(models.Order).filter(models.Order.id == refund.order_id).first()
    if order:
        # 订单回到已支付状态
        order.status = "PAID" if order.status == "REFUNDING" else order.status
        create_message(db, order.user_id, "退款申请被拒绝",
                       f"您的订单 {order.order_no} 退款申请被拒绝，原因：{body.reject_reason}", "REFUND")
    db.commit()
    return {"code": "OK", "message": "已拒绝退款", "data": refund_dict(refund)}


def _restore_stock(db, order, admin_id=0):
    """退款成功后恢复库存"""
    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
    for it in items:
        sku = db.query(models.ProductSku).filter(models.ProductSku.id == it.sku_id).first()
        if sku:
            before = sku.stock
            sku.stock += it.quantity
            product = db.query(models.Product).filter(models.Product.id == it.product_id).first()
            if product:
                product.stock += it.quantity
                product.sales = max((product.sales or 0) - it.quantity, 0)
            db.add(models.InventoryLog(
                product_id=it.product_id, sku_id=it.sku_id, change_quantity=it.quantity,
                before_quantity=before, after_quantity=sku.stock, reason="退款恢复库存", operator_id=admin_id,
            ))
    db.flush()


# ============================================================
# 库存管理
# ============================================================
@router.get("/inventory")
def inventory(_ = Depends(require_admin), db: Session = Depends(get_db)):
    """后台库存列表"""
    robjects = db.query(models.Product, models.ProductSku).join(
        models.ProductSku, models.Product.id == models.ProductSku.product_id
    ).order_by(models.Product.id).all()
    data = []
    for p, sku in robjects:
        data.append({
            "sku_id": sku.id,
            "product_id": p.id,
            "product_name": p.name,
            "spec_values": json_loads(sku.spec_values),
            "stock": sku.stock,
            "price": sku.price,
            "status": "低库存预警" if sku.stock <= 5 else ("正常" if sku.stock > 0 else "缺货"),
        })
    return {"code": "OK", "message": "success", "data": data}


@router.post("/inventory/adjust")
def adjust_inventory(body: schemas.InventoryAdjustRequest, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    sku = db.query(models.ProductSku).filter(models.ProductSku.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU 不存在")
    before = sku.stock
    after = before + body.change_quantity
    if after < 0:
        raise HTTPException(status_code=400, detail="调整后库存不能为负数")
    sku.stock = after
    product = db.query(models.Product).filter(models.Product.id == sku.product_id).first()
    if product:
        product.stock = after if len(product.skus) == 1 else product.stock + body.change_quantity
    db.add(models.InventoryLog(
        product_id=sku.product_id, sku_id=sku.id, change_quantity=body.change_quantity,
        before_quantity=before, after_quantity=after, reason=body.reason or "人工调整", operator_id=admin.id,
    ))
    db.commit()
    return {"code": "OK", "message": "调整成功", "data": {"sku_id": sku.id, "before": before, "after": after}}


# ============================================================
# 评价管理
# ============================================================
@router.get("/reviews")
def admin_reviews(_ = Depends(require_admin), db: Session = Depends(get_db)):
    reviews = db.query(models.Review).order_by(models.Review.created_at.desc()).all()
    data = []
    for r in reviews:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        product = db.query(models.Product).filter(models.Product.id == r.product_id).first()
        setattr(r, "_nickname", user.nickname if user else "匿名")
        setattr(r, "_product_name", product.name if product else None)
        data.append(review_dict(r))
    return {"code": "OK", "message": "success", "data": data}


@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="评价不存在")
    review.status = "DELETED"
    db.commit()
    return {"code": "OK", "message": "评价已删除", "data": None}