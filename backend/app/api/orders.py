"""订单相关 API（预览、创建、查询、取消、确认收货）"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import (
    gen_order_no, json_loads, order_dict, item_dict, create_message,
)

router = APIRouter(prefix="/api/orders", tags=["订单"])


class _BuildResult:
    """校验并计算后的订单构建数据"""

    def __init__(self):
        self.valid_items = []  # [{"sku":..., "product":..., "quantity":...}]
        self.total_amount = 0.0
        self.discount_amount = 0.0
        self.pay_amount = 0.0
        self.coupon = None
        self.address = None


def _build_and_validate(db, user, items, address_id, user_coupon_id, preview_only=False) -> _BuildResult:
    """核心校验逻辑：重新从服务端校验价格、库存、优惠券、地址。"""
    r = _BuildResult()
    if not items:
        raise HTTPException(status_code=400, detail="订单商品不能为空")

    # 地址校验
    address = None
    if address_id:
        address = db.query(models.Address).filter(
            models.Address.id == address_id, models.Address.user_id == user.id
        ).first()
        if not address:
            raise HTTPException(status_code=400, detail="收货地址不存在")
    r.address = address

    # 商品与库存校验
    for req in items:
        if req.quantity < 1:
            raise HTTPException(status_code=400, detail="购买数量不能小于 1")
        sku = db.query(models.ProductSku).filter(models.ProductSku.id == req.sku_id).first()
        if not sku or sku.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="商品规格无效")
        product = db.query(models.Product).filter(models.Product.id == sku.product_id).first()
        if not product or product.status != "ON_SALE":
            raise HTTPException(status_code=400, detail="商品已下架")
        if req.quantity > sku.stock:
            raise HTTPException(status_code=409, detail=f"商品「{product.name}」库存不足")
        total = sku.price * req.quantity
        r.valid_items.append({"sku": sku, "product": product, "quantity": req.quantity, "subtotal": total})
        r.total_amount += total

    # 优惠券校验
    if user_coupon_id:
        uc = db.query(models.UserCoupon).filter(
            models.UserCoupon.id == user_coupon_id, models.UserCoupon.user_id == user.id
        ).first()
        if not uc:
            raise HTTPException(status_code=400, detail="优惠券不存在")
        coupon = db.query(models.Coupon).filter(models.Coupon.id == uc.coupon_id).first()
        now = datetime.utcnow()
        if not coupon or coupon.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="优惠券无效或已停用")
        if uc.status != "UNUSED":
            raise HTTPException(status_code=409, detail="优惠券已使用")
        if coupon.end_time and now > coupon.end_time:
            raise HTTPException(status_code=400, detail="优惠券已过期")
        # 门槛校验
        if r.total_amount < coupon.threshold:
            raise HTTPException(status_code=409, detail=f"未达优惠券门槛（满{coupon.threshold:g}可用）")
        r.coupon = coupon
        r.discount_amount = coupon.discount_amount
        r.user_coupon = uc

    # 应付金额 = 商品金额 - 优惠金额
    r.pay_amount = round(max(r.total_amount - r.discount_amount, 0), 2)
    return r


@router.post("/preview")
def preview_order(body: schemas.OrderPreviewRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _build_and_validate(db, user, body.items, body.address_id, body.user_coupon_id)
    data = {
        "items": [
            {
                "sku_id": x["sku"].id,
                "product_id": x["product"].id,
                "name": x["product"].name,
                "spec_values": json_loads(x["sku"].spec_values),
                "price": x["sku"].price,
                "quantity": x["quantity"],
                "subtotal": x["subtotal"],
                "stock": x["sku"].stock,
            }
            for x in r.valid_items
        ],
        "total_amount": r.total_amount,
        "discount_amount": r.discount_amount,
        "pay_amount": r.pay_amount,
        "address": {"id": r.address.id, "receiver_name": r.address.receiver_name, "phone": r.address.phone,
                    "full_address": f"{r.address.province}{r.address.city}{r.address.district}{r.address.detail_address}"} if r.address else None,
        "coupon": {"id": r.coupon.id, "name": r.coupon.name, "threshold": r.coupon.threshold,
                   "discount_amount": r.coupon.discount_amount} if r.coupon else None,
    }
    return {"code": "OK", "message": "success", "data": data}


@router.post("", status_code=201)
def create_order(body: schemas.OrderCreateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.address_id:
        raise HTTPException(status_code=400, detail="请选择收货地址")
    r = _build_and_validate(db, user, body.items, body.address_id, body.user_coupon_id)
    if not r.address:
        raise HTTPException(status_code=400, detail="请选择收货地址")

    order = models.Order(
        order_no=gen_order_no(),
        user_id=user.id,
        status="PENDING_PAYMENT",
        total_amount=round(r.total_amount, 2),
        discount_amount=round(r.discount_amount, 2),
        pay_amount=round(r.pay_amount, 2),
        receiver_name=r.address.receiver_name,
        phone=r.address.phone,
        address_snapshot=json.dumps(
            {
                "receiver_name": r.address.receiver_name,
                "phone": r.address.phone,
                "province": r.address.province,
                "city": r.address.city,
                "district": r.address.district,
                "detail_address": r.address.detail_address,
            }, ensure_ascii=False
        ),
        user_coupon_id=r.user_coupon.id if hasattr(r, "user_coupon") else 0,
    )
    db.add(order)
    db.flush()

    # 订单明细
    for x in r.valid_items:
        db.add(models.OrderItem(
            order_id=order.id,
            product_id=x["product"].id,
            sku_id=x["sku"].id,
            product_name_snapshot=x["product"].name,
            spec_snapshot=json.dumps(json_loads(x["sku"].spec_values), ensure_ascii=False),
            price=x["sku"].price,
            quantity=x["quantity"],
            subtotal=round(x["subtotal"], 2),
        ))

    # 占用优惠券
    if hasattr(r, "user_coupon") and r.user_coupon:
        r.user_coupon.status = "USED"
        r.user_coupon.used_order_id = order.id
        r.user_coupon.used_at = datetime.utcnow()
        r.coupon.used_quantity += 1

    db.commit()
    db.refresh(order)
    return {"code": "OK", "message": "下单成功", "data": order_dict(order, with_items=True)}


@router.get("")
def list_orders(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Order).filter(models.Order.user_id == user.id)
    if status:
        q = q.filter(models.Order.status == status)
    total = q.count()
    orders = q.order_by(models.Order.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    # 关联加载 payment, shipment 状态用于展示
    data = []
    for o in orders:
        d = order_dict(o, with_items=True)
        pay = db.query(models.Payment).filter(models.Payment.order_id == o.id).first()
        if pay:
            d["payment_status"] = pay.status
        ship = db.query(models.Shipment).filter(models.Shipment.order_id == o.id).first()
        if ship:
            d["shipment_company"] = ship.company
            d["shipment_tracking_number"] = ship.tracking_number
        data.append(d)
    return {"code": "OK", "message": "success", "data": {"items": data, "total": total, "page": page, "page_size": page_size}}


@router.get("/{order_id}")
def order_detail(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.user_id != user.id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="无权查看该订单")
    d = order_dict(order, with_items=True, with_payment=True, with_shipment=True)
    # 附加售后状态
    refund = db.query(models.Refund).filter(models.Refund.order_id == order.id).first()
    if refund:
        d["refund"] = {
            "id": refund.id,
            "status": refund.status,
            "status_cn": {"PENDING": "待审核", "APPROVED": "已同意", "REJECTED": "已拒绝", "REFUNDED": "已退款"}.get(refund.status, refund.status),
            "amount": refund.amount,
            "reason": refund.reason,
            "reject_reason": refund.reject_reason,
        }
    return {"code": "OK", "message": "success", "data": d}


@router.post("/{order_id}/cancel")
def cancel_order(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != "PENDING_PAYMENT":
        raise HTTPException(status_code=409, detail="只有待支付订单可以取消")
    now = datetime.utcnow()
    order.status = "CANCELLED"
    order.cancelled_at = now
    # 归还优惠券
    if order.user_coupon_id:
        uc = db.query(models.UserCoupon).filter(models.UserCoupon.id == order.user_coupon_id).first()
        if uc:
            uc.status = "UNUSED"
            uc.used_order_id = 0
            uc.used_at = None
        coupon = db.query(models.Coupon).filter(models.Coupon.id == uc.coupon_id).first() if uc else None
        if coupon:
            coupon.used_quantity = max(coupon.used_quantity - 1, 0)
    db.commit()
    return {"code": "OK", "message": "订单已取消", "data": None}


@router.post("/{order_id}/confirm")
def confirm_order(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != "SHIPPED":
        raise HTTPException(status_code=409, detail="只有已发货订单可以确认收货")
    order.status = "COMPLETED"
    order.completed_at = datetime.utcnow()
    ship = db.query(models.Shipment).filter(models.Shipment.order_id == order.id).first()
    if ship:
        ship.status = "DELIVERED"
    db.commit()
    return {"code": "OK", "message": "确认收货成功", "data": None}