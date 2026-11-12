"""退款/售后相关 API"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import refund_dict, create_message

router = APIRouter(prefix="/api/refunds", tags=["售后"])


@router.post("", status_code=201)
def create_refund(body: schemas.RefundCreateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == body.order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 只有已支付（含之后状态）且未进入售后的订单可退款
    if order.status in ("PENDING_PAYMENT", "CANCELLED", "REFUNDING", "REFUNDED"):
        raise HTTPException(status_code=409, detail="当前订单状态不允许申请退款")
    # 同一订单不能重复退款
    exists = db.query(models.Refund).filter(models.Refund.order_id == order.id).first()
    if exists:
        raise HTTPException(status_code=409, detail="该订单已申请过退款")

    refund = models.Refund(
        order_id=order.id,
        user_id=user.id,
        amount=order.pay_amount,
        reason=body.reason,
        description=body.description,
        status="PENDING",
    )
    db.add(refund)
    # 订单进入退款中
    order.status = "REFUNDING"
    db.commit()
    db.refresh(refund)
    return {"code": "OK", "message": "退款申请已提交", "data": refund_dict(refund)}


@router.get("/my")
def my_refunds(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    refunds = db.query(models.Refund).filter(models.Refund.user_id == user.id).order_by(models.Refund.created_at.desc()).all()
    data = []
    for r in refunds:
        order = db.query(models.Order).filter(models.Order.id == r.order_id).first()
        setattr(r, "_order_no", order.order_no if order else None)
        data.append(refund_dict(r))
    return {"code": "OK", "message": "success", "data": data}


@router.get("/{refund_id}")
def refund_detail(refund_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    refund = db.query(models.Refund).filter(models.Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="退款记录不存在")
    if refund.user_id != user.id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="无权查看")
    order = db.query(models.Order).filter(models.Order.id == refund.order_id).first()
    setattr(refund, "_order_no", order.order_no if order else None)
    return {"code": "OK", "message": "success", "data": refund_dict(refund)}