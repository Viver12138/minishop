"""优惠券相关 API"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user, require_admin
from .common import _coupon_dict

router = APIRouter(prefix="/api", tags=["优惠券"])


def _user_coupon_dict(db, uc: models.UserCoupon):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == uc.coupon_id).first()
    if not coupon:
        return None
    # 计算当前状态
    now = datetime.utcnow()
    status = uc.status
    if status == "UNUSED" and coupon.end_time and now > coupon.end_time:
        status = "EXPIRED"
    return {
        "id": uc.id,
        "coupon_id": coupon.id,
        "name": coupon.name,
        "type": coupon.type,
        "threshold": coupon.threshold,
        "discount_amount": coupon.discount_amount,
        "start_time": coupon.start_time.isoformat() if coupon.start_time else None,
        "end_time": coupon.end_time.isoformat() if coupon.end_time else None,
        "status": status,
        "status_cn": {"UNUSED": "可用", "USED": "已使用", "EXPIRED": "已过期"}.get(status, status),
        "received_at": uc.received_at.isoformat() if uc.received_at else None,
        "used_at": uc.used_at.isoformat() if uc.used_at else None,
        "used_order_id": uc.used_order_id,
    }


@router.get("/coupons/available")
def available_coupons(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """可领取的优惠券（未过期、未停用、未领完）"""
    now = datetime.utcnow()
    coupons = db.query(models.Coupon).filter(
        models.Coupon.status == "ACTIVE",
        (models.Coupon.end_time.is_(None)) | (models.Coupon.end_time > now),
    ).all()
    claimed = {uc.coupon_id for uc in db.query(models.UserCoupon).filter(models.UserCoupon.user_id == user.id).all()}
    data = []
    for c in coupons:
        if c.total_quantity > 0 and c.used_quantity + len([x for x in claimed if x == c.id]) >= c.total_quantity:
            continue
        d = _coupon_dict(c)
        d["claimed"] = c.id in claimed
        data.append(d)
    return {"code": "OK", "message": "success", "data": data}


@router.get("/coupons/my")
def my_coupons(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ucs = db.query(models.UserCoupon).filter(models.UserCoupon.user_id == user.id).order_by(models.UserCoupon.received_at.desc()).all()
    data = []
    for uc in ucs:
        d = _user_coupon_dict(db, uc)
        if d:
            data.append(d)
    return {"code": "OK", "message": "success", "data": data}


@router.post("/coupons/{coupon_id}/claim", status_code=201)
def claim_coupon(coupon_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon or coupon.status != "ACTIVE":
        raise HTTPException(status_code=404, detail="优惠券不存在或已停用")
    now = datetime.utcnow()
    if coupon.end_time and now > coupon.end_time:
        raise HTTPException(status_code=400, detail="优惠券已过期")
    exists = db.query(models.UserCoupon).filter(
        models.UserCoupon.user_id == user.id, models.UserCoupon.coupon_id == coupon_id
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="已领取过该优惠券")
    if coupon.total_quantity > 0 and coupon.used_quantity >= coupon.total_quantity:
        raise HTTPException(status_code=400, detail="优惠券已领完")
    uc = models.UserCoupon(user_id=user.id, coupon_id=coupon_id, status="UNUSED")
    db.add(uc)
    db.commit()
    return {"code": "OK", "message": "领取成功", "data": _user_coupon_dict(db, uc)}


# ---------------- 后台管理 ----------------
@router.get("/admin/coupons")
def admin_list_coupons(_=Depends(require_admin), db: Session = Depends(get_db)):
    coupons = db.query(models.Coupon).order_by(models.Coupon.id.desc()).all()
    return {"code": "OK", "message": "success", "data": [_coupon_dict(c) for c in coupons]}


@router.post("/admin/coupons", status_code=201)
def admin_create_coupon(body: schemas.CouponCreate, _=Depends(require_admin), db: Session = Depends(get_db)):
    coupon = models.Coupon(
        name=body.name,
        type=body.type,
        threshold=body.threshold,
        discount_amount=body.discount_amount,
        start_time=body.start_time or datetime.utcnow(),
        end_time=body.end_time,
        total_quantity=body.total_quantity or 0,
        used_quantity=0,
        status=body.status or "ACTIVE",
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return {"code": "OK", "message": "创建成功", "data": _coupon_dict(coupon)}


@router.put("/admin/coupons/{coupon_id}")
def admin_update_coupon(coupon_id: int, body: schemas.CouponCreate, _=Depends(require_admin), db: Session = Depends(get_db)):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="优惠券不存在")
    coupon.name = body.name or coupon.name
    coupon.threshold = body.threshold
    coupon.discount_amount = body.discount_amount
    if body.start_time:
        coupon.start_time = body.start_time
    if body.end_time:
        coupon.end_time = body.end_time
    if body.total_quantity is not None:
        coupon.total_quantity = body.total_quantity
    if body.status is not None:
        coupon.status = body.status
    db.commit()
    db.refresh(coupon)
    return {"code": "OK", "message": "更新成功", "data": _coupon_dict(coupon)}