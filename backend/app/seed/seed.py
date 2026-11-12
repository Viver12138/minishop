"""幂等 Seed：首次启动时初始化账号、分类、商品、SKU、优惠券"""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .. import models
from ..auth.security import hash_password

CJK_FONTS = ["'Segoe UI'", "Arial", "sans-serif"]


def _placeholder_image(text, color="#1677ff"):
    """生成带文字的内联 SVG 占位图（自包含，无外部依赖）"""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{color}"/><stop offset="100%" stop-color="#001529"/></linearGradient></defs>'
        f'<rect width="400" height="400" fill="url(#g)"/>'
        f'<text x="200" y="205" font-family="{'","'.join(CJK_FONTS)}" font-size="30" fill="#fff" '
        f'text-anchor="middle">MiniShop</text>'
        f'<text x="200" y="245" font-family="{'","'.join(CJK_FONTS)}" font-size="20" fill="#d9ecff" '
        f'text-anchor="middle">{text}</text>'
        f'</svg>'
    )
    return f"data:image/svg+xml;utf8,{svg}"


def _seed_or_get(db, model, filters, **kwargs):
    obj = db.query(model).filter(*filters).first()
    if obj:
        return obj
    obj = model(**kwargs)
    db.add(obj)
    db.flush()
    return obj


def run_seed(db: Session):
    """幂等初始化。重复运行不会产生重复数据。"""
    from ..models import models as M

    # ---------- 账号 ----------
    # 管理员
    admin = db.query(M.User).filter(M.User.username == "admin").first()
    if not admin:
        admin = M.User(username="admin", password_hash=hash_password("admin123"), nickname="平台管理员",
                       role="ADMIN", status="ACTIVE")
        db.add(admin)
    # 普通用户
    user = db.query(M.User).filter(M.User.username == "user").first()
    if not user:
        user = M.User(username="user", password_hash=hash_password("123456"), nickname="测试用户",
                      role="USER", status="ACTIVE")
        db.add(user)
    db.flush()

    # ---------- 分类 ----------
    categories = ["手机数码", "电脑办公", "服饰鞋包", "食品饮料"]
    cat_map = {}
    for name in categories:
        c = db.query(M.Category).filter(M.Category.name == name).first()
        if not c:
            c = M.Category(name=name, parent_id=0, status="ACTIVE")
            db.add(c)
            db.flush()
        cat_map[name] = c.id

    # ---------- 商品 ----------
    # (name, category, price, original_price, stock, sales)
    products_data = [
        ("iPhone 17", "手机数码", 5999, 6499, 20, 120),
        ("小米手机", "手机数码", 2999, 3299, 10, 300),
        ("华为平板", "手机数码", 3999, 4299, 5, 80),
        ("MacBook", "电脑办公", 8999, 9499, 8, 45),
        ("机械键盘", "电脑办公", 399, 499, 50, 560),
        ("无线鼠标", "电脑办公", 199, 239, 0, 900),  # 售罄测试
        ("蓝牙耳机", "手机数码", 599, 699, 1, 430),  # 库存边界测试
        ("运动鞋", "服饰鞋包", 499, 599, 9999, 760),  # 多规格，stock 由 SKU 决定
        ("咖啡", "食品饮料", 59, 79, 100, 1200),  # 低价商品
    ]

    # 运动鞋 SKU：黑色/白色 × 39/40/41/42，每个独立库存
    shoe_colors = ["黑色", "白色"]
    shoe_sizes = ["39", "40", "41", "42"]

    for name, cat, price, op, stock, sales in products_data:
        p = db.query(M.Product).filter(M.Product.name == name).first()
        if p:
            continue
        p = M.Product(
            category_id=cat_map[cat], name=name,
            description=f"{name}——MiniShop 综合电商平台演示商品，用于功能演示与自动化测试。",
            price=price, original_price=op,
            stock=stock if name != "运动鞋" else 8,
            status="ON_SALE", sales=sales,
            images=json.dumps([_placeholder_image(name, "#1677ff")], ensure_ascii=False),
        )
        db.add(p)
        db.flush()

        if name == "运动鞋":
            idx = 0
            total_shoe_stock = 0
            for color in shoe_colors:
                for size in shoe_sizes:
                    idx += 1
                    sku_stock = 1 if color == "白色" and size in ("39", "40") else 2
                    total_shoe_stock += sku_stock
                    db.add(M.ProductSku(
                        product_id=p.id,
                        sku_code=f"SKU{p.id:05d}-{idx:02d}",
                        spec_values=json.dumps({"颜色": color, "尺码": size}, ensure_ascii=False),
                        price=price,
                        stock=sku_stock,
                        status="ACTIVE",
                    ))
            # 商品总库存 = 各 SKU 库存之和
            p.stock = total_shoe_stock
        else:
            # 非多规格商品：自动创建默认 SKU
            db.add(M.ProductSku(
                product_id=p.id,
                sku_code=f"SKU{p.id:05d}-01",
                spec_values=json.dumps({}, ensure_ascii=False),
                price=price,
                stock=stock,
                status="ACTIVE",
            ))
        db.flush()

    # ---------- 优惠券 ----------
    now = datetime.utcnow()
    coupons_data = [
        ("新人满100减10", 100, 10, now - timedelta(days=10), now + timedelta(days=30), 1000),
        ("满1000减100", 1000, 100, now - timedelta(days=3), now + timedelta(days=60), 500),
        ("满5000减500", 5000, 500, now - timedelta(days=1), now + timedelta(days=90), 100),
        ("满50减5(已过期)", 50, 5, now - timedelta(days=20), now - timedelta(days=1), 100),  # 已过期
    ]
    for name, threshold, amount, start, end, qty in coupons_data:
        c = db.query(M.Coupon).filter(M.Coupon.name == name).first()
        if c:
            continue
        # 已过期的优惠券默认停用，避免被领取
        status = "DISABLED" if "已过期" in name else "ACTIVE"
        db.add(M.Coupon(
            name=name, type="FULL_REDUCTION", threshold=threshold,
            discount_amount=amount, start_time=start, end_time=end,
            total_quantity=qty, used_quantity=0, status=status,
        ))

    db.commit()


def init_seed():
    """供启动时调用的入口。"""
    from ..database import SessionLocal, init_db
    init_db()
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()