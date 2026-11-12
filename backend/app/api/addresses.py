"""收货地址相关 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import _address_dict

router = APIRouter(prefix="/api/addresses", tags=["地址"])


@router.get("")
def list_addresses(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addrs = db.query(models.Address).filter(models.Address.user_id == user.id).order_by(models.Address.is_default.desc()).all()
    return {"code": "OK", "message": "success", "data": [_address_dict(a) for a in addrs]}


@router.post("", status_code=201)
def create_address(body: schemas.AddressCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.is_default:
        # 一个用户只能有一个默认地址
        db.query(models.Address).filter(models.Address.user_id == user.id).update({models.Address.is_default: False})
    addr = models.Address(
        user_id=user.id,
        receiver_name=body.receiver_name,
        phone=body.phone,
        province=body.province,
        city=body.city,
        district=body.district,
        detail_address=body.detail_address,
        is_default=body.is_default,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return {"code": "OK", "message": "创建成功", "data": _address_dict(addr)}


@router.put("/{addr_id}")
def update_address(addr_id: int, body: schemas.AddressUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.Address).filter(models.Address.id == addr_id, models.Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="地址不存在")
    fields = ["receiver_name", "phone", "province", "city", "district", "detail_address"]
    for f in fields:
        if getattr(body, f) is not None:
            setattr(addr, f, getattr(body, f))
    if body.is_default is not None and body.is_default:
        db.query(models.Address).filter(models.Address.user_id == user.id).update({models.Address.is_default: False})
        addr.is_default = True
    db.commit()
    db.refresh(addr)
    return {"code": "OK", "message": "更新成功", "data": _address_dict(addr)}


@router.delete("/{addr_id}")
def delete_address(addr_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.Address).filter(models.Address.id == addr_id, models.Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="地址不存在")
    db.delete(addr)
    db.commit()
    return {"code": "OK", "message": "删除成功", "data": None}


@router.post("/{addr_id}/default")
def set_default(addr_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.Address).filter(models.Address.id == addr_id, models.Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="地址不存在")
    db.query(models.Address).filter(models.Address.user_id == user.id).update({models.Address.is_default: False})
    addr.is_default = True
    db.commit()
    return {"code": "OK", "message": "设置成功", "data": None}