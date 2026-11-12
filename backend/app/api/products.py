"""分类 + 商品相关 API（含公开查询与后台管理）"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.dependencies import require_admin, get_optional_user
from .common import _category_dict, _product_dict, _sku_dict, gen_sku_code

router = APIRouter(prefix="/api", tags=["商品"])


# ============================================================
# 分类
# ============================================================
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(models.Category).filter(models.Category.status == "ACTIVE").all()
    return {"code": "OK", "message": "success", "data": [_category_dict(c) for c in cats]}


@router.get("/admin/categories")
def list_admin_categories(_: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    cats = db.query(models.Category).order_by(models.Category.id).all()
    return {"code": "OK", "message": "success", "data": [_category_dict(c) for c in cats]}


@router.post("/admin/categories", status_code=201)
def create_category(body: schemas.CategoryCreate, _=Depends(require_admin), db: Session = Depends(get_db)):
    cat = models.Category(name=body.name, parent_id=body.parent_id, status="ACTIVE")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"code": "OK", "message": "创建成功", "data": _category_dict(cat)}


@router.put("/admin/categories/{cat_id}")
def update_category(cat_id: int, body: schemas.CategoryUpdate, _=Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    if body.name is not None:
        cat.name = body.name
    if body.status is not None:
        cat.status = body.status
    db.commit()
    db.refresh(cat)
    return {"code": "OK", "message": "更新成功", "data": _category_dict(cat)}


# ============================================================
# 商品查询（公开，带可选登录用于收藏标记）
# ============================================================
@router.get("/products")
def list_products(
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "default",  # default/sales/price_asc/price_desc
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
):
    q = db.query(models.Product).filter(models.Product.status == "ON_SALE")
    if keyword:
        q = q.filter(models.Product.name.like(f"%{keyword}%"))
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if min_price is not None:
        q = q.filter(models.Product.price >= min_price)
    if max_price is not None:
        q = q.filter(models.Product.price <= max_price)

    if sort == "sales":
        q = q.order_by(models.Product.sales.desc())
    elif sort == "price_asc":
        q = q.order_by(models.Product.price.asc())
    elif sort == "price_desc":
        q = q.order_by(models.Product.price.desc())
    else:
        q = q.order_by(models.Product.id.desc())

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    favorites = set()
    if user:
        favs = db.query(models.Favorite).filter(models.Favorite.user_id == user.id).all()
        favorites = {f.product_id for f in favs}

    data = []
    for p in items:
        d = _product_dict(p, with_skus=True)
        d["is_favorite"] = p.id in favorites
        data.append(d)

    return {
        "code": "OK",
        "message": "success",
        "data": {"items": data, "total": total, "page": page, "page_size": page_size},
    }


@router.get("/products/{product_id}")
def product_detail(product_id: int, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p or p.status != "ON_SALE":
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    d = _product_dict(p, with_skus=True)
    if user:
        d["is_favorite"] = db.query(models.Favorite).filter(
            models.Favorite.user_id == user.id, models.Favorite.product_id == p.id
        ).first() is not None
    else:
        d["is_favorite"] = False
    return {"code": "OK", "message": "success", "data": d}


# ============================================================
# 后台商品管理
# ============================================================
def _apply_skus(db, product, skus):
    """更新商品的 SKU 列表（简单全量替换策略）"""
    for s in product.skus:
        db.delete(s)
    db.flush()
    total_stock = 0
    for idx, sku_in in enumerate(skus or []):
        price = sku_in.price if sku_in.price else product.price
        sku = models.ProductSku(
            product_id=product.id,
            sku_code=sku_in.sku_code or gen_sku_code(product.id, idx + 1),
            spec_values=json.dumps(sku_in.spec_values, ensure_ascii=False),
            price=price,
            stock=sku_in.stock,
            status="ACTIVE",
        )
        db.add(sku)
        total_stock += sku_in.stock
    return total_stock


@router.post("/admin/products", status_code=201)
def create_product(body: schemas.ProductCreate, _=Depends(require_admin), db: Session = Depends(get_db)):
    product = models.Product(
        category_id=body.category_id,
        name=body.name,
        description=body.description,
        price=body.price,
        original_price=body.original_price or body.price,
        stock=body.stock,
        status="ON_SALE",
        sales=0,
        images=json.dumps(body.images or [], ensure_ascii=False),
    )
    db.add(product)
    db.flush()
    if body.skus:
        total = _apply_skus(db, product, body.skus)
        product.stock = total
    db.commit()
    db.refresh(product)
    return {"code": "OK", "message": "创建成功", "data": _product_dict(product, with_skus=True)}


@router.put("/admin/products/{product_id}")
def update_product(product_id: int, body: schemas.ProductUpdate, _=Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    if body.category_id is not None:
        product.category_id = body.category_id
    if body.name is not None:
        product.name = body.name
    if body.description is not None:
        product.description = body.description
    if body.price is not None:
        product.price = body.price
    if body.original_price is not None:
        product.original_price = body.original_price
    if body.images is not None:
        product.images = json.dumps(body.images, ensure_ascii=False)
    if body.skus is not None:
        total = _apply_skus(db, product, body.skus)
        product.stock = total
    db.commit()
    db.refresh(product)
    return {"code": "OK", "message": "更新成功", "data": _product_dict(product, with_skus=True)}


@router.delete("/admin/products/{product_id}")
def delete_product(product_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    db.delete(product)
    db.commit()
    return {"code": "OK", "message": "删除成功", "data": None}


@router.post("/admin/products/{product_id}/publish")
def publish_product(product_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    product.status = "ON_SALE"
    db.commit()
    return {"code": "OK", "message": "已上架", "data": None}


@router.post("/admin/products/{product_id}/unpublish")
def unpublish_product(product_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    product.status = "OFF_SALE"
    db.commit()
    return {"code": "OK", "message": "已下架", "data": None}


# 后台商品列表（包含下架）
@router.get("/admin/products")
def admin_product_list(
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(models.Product)
    if keyword:
        q = q.filter(models.Product.name.like(f"%{keyword}%"))
    if status:
        q = q.filter(models.Product.status == status)
    total = q.count()
    items = q.order_by(models.Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "code": "OK",
        "message": "success",
        "data": {
            "items": [_product_dict(p, with_skus=True) for p in items],
            "total": total, "page": page, "page_size": page_size,
        },
    }