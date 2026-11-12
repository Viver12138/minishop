"""模拟支付相关 API：创建支付、支付成功（扣库存）、支付失败"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import gen_payment_no, create_message

router = APIRouter(prefix="/api/payments", tags=["支付"])


def _deduct_stock(db, order, operator_id=0):
    """支付成功后扣减库存，记录库存日志"""
    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
    for it in items:
        sku = db.query(models.ProductSku).filter(models.ProductSku.id == it.sku_id).first()
        if sku:
            before = sku.stock
            sku.stock = max(sku.stock - it.quantity, 0)
            product = db.query(models.Product).filter(models.Product.id == it.product_id).first()
            if product:
                product.stock = max(product.stock - it.quantity, 0)
                product.sales = (product.sales or 0) + it.quantity
            db.add(models.InventoryLog(
                product_id=it.product_id,
                sku_id=it.sku_id,
                change_quantity=-it.quantity,
                before_quantity=before,
                after_quantity=sku.stock,
                reason="订单支付扣减库存",
                operator_id=operator_id,
            ))
    db.flush()


@router.post("", status_code=201)
def create_payment(body: schemas.PaymentCreateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == body.order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="订单已取消，无法支付")
    if order.status == "PAID" or order.status in ("SHIPPED", "COMPLETED", "PENDING_SHIPMENT"):
        raise HTTPException(status_code=409, detail="订单已支付，请勿重复支付")
    if order.status == "REFUNDING" or order.status == "REFUNDED":
        raise HTTPException(status_code=409, detail="订单已进入售后流程")
    # 幂等：若已有未完成的支付记录，直接返回
    existing = db.query(models.Payment).filter(
        models.Payment.order_id == order.id, models.Payment.status == "PENDING"
    ).first()
    if existing:
        return {
            "code": "OK", "message": "success",
            "data": {"id": existing.id, "order_id": existing.order_id, "payment_no": existing.payment_no,
                     "amount": existing.amount, "method": existing.method, "status": existing.status},
        }
    payment = models.Payment(
        order_id=order.id,
        payment_no=gen_payment_no(),
        method=body.method or "WECHAT",
        amount=order.pay_amount,
        status="PENDING",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return {
        "code": "OK", "message": "success",
        "data": {"id": payment.id, "order_id": payment.order_id, "payment_no": payment.payment_no,
                 "amount": payment.amount, "method": payment.method, "status": payment.status},
    }


@router.post("/{payment_id}/success")
def pay_success(payment_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="支付记录不存在")
    order = db.query(models.Order).filter(models.Order.id == payment.order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 重复支付保护
    if order.status in ("PAID", "PENDING_SHIPMENT", "SHIPPED", "COMPLETED", "REFUNDING", "REFUNDED"):
        raise HTTPException(status_code=409, detail="订单已支付，请勿重复支付")
    if order.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="订单已取消，无法支付")

    now = datetime.utcnow()
    # 支付金额必须来自服务端订单金额
    payment.amount = order.pay_amount
    payment.status = "SUCCESS"
    payment.paid_at = now
    order.status = "PAID"
    order.paid_at = now
    _deduct_stock(db, order, operator_id=user.id)
    create_message(db, user.id, "订单支付成功",
                   f"您的订单 {order.order_no} 已支付成功，支付金额 ¥{order.pay_amount:g}，我们将尽快为您发货。", "PAYMENT")
    db.commit()
    return {"code": "OK", "message": "支付成功", "data": {"order_id": order.id, "order_status": order.status}}


@router.post("/{payment_id}/fail")
def pay_fail(payment_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="支付记录不存在")
    order = db.query(models.Order).filter(models.Order.id == payment.order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != "PENDING_PAYMENT":
        raise HTTPException(status_code=409, detail="当前订单状态不支持支付失败操作")
    payment.status = "FAILED"
    # order 保持 PENDING_PAYMENT，可重新支付
    db.commit()
    return {"code": "OK", "message": "支付失败", "data": {"order_id": order.id, "order_status": order.status}}