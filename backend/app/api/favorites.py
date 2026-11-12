"""收藏相关 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import _product_dict

router = APIRouter(prefix="/api/favorites", tags=["收藏"])


@router.get("")
def list_favorites(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(models.Favorite).filter(models.Favorite.user_id == user.id).order_by(models.Favorite.created_at.desc()).all()
    data = []
    for f in favs:
        p = db.query(models.Product).filter(models.Product.id == f.product_id).first()
        if p:
            d = _product_dict(p, with_skus=True)
            d["favorite_id"] = f.id
            d["is_favorite"] = True
            data.append(d)
    return {"code": "OK", "message": "success", "data": data}


@router.post("/{product_id}", status_code=201)
def add_favorite(product_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在")
    exists = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id, models.Favorite.product_id == product_id
    ).first()
    if exists:
        return {"code": "OK", "message": "已收藏", "data": None}
    fav = models.Favorite(user_id=user.id, product_id=product_id)
    db.add(fav)
    db.commit()
    return {"code": "OK", "message": "收藏成功", "data": None}


@router.delete("/{product_id}")
def remove_favorite(product_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id, models.Favorite.product_id == product_id
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"code": "OK", "message": "已取消收藏", "data": None}