"""SQLAlchemy 数据模型定义"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey,
    BigInteger, Index
)
from sqlalchemy.orm import relationship

from ..database import Base


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ---------------------------------------------------------------
# 用户
# ---------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    nickname = Column(String(64), default="")
    phone = Column(String(32), default="")
    email = Column(String(128), default="")
    role = Column(String(16), default="USER")  # USER / ADMIN
    status = Column(String(16), default="ACTIVE")  # ACTIVE / DISABLED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    addresses = relationship("Address", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")


# ---------------------------------------------------------------
# 分类
# ---------------------------------------------------------------
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(64), nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), default=0)
    status = Column(String(16), default="ACTIVE")  # ACTIVE / DISABLED
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------
# 商品
# ---------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), index=True)
    name = Column(String(128), nullable=False, index=True)
    description = Column(Text, default="")
    price = Column(Float, nullable=False, default=0)
    original_price = Column(Float, nullable=False, default=0)
    stock = Column(Integer, default=0)
    status = Column(String(16), default="ON_SALE")  # ON_SALE / OFF_SALE
    sales = Column(Integer, default=0)
    images = Column(Text, default="[]")  # JSON 字符串，图片URL数组
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    skus = relationship("ProductSku", back_populates="product", cascade="all, delete-orphan")


class ProductSku(Base):
    __tablename__ = "product_skus"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    sku_code = Column(String(64), default="")
    spec_values = Column(Text, default="{}")  # JSON，如 {"颜色":"黑色","尺码":"39"}
    price = Column(Float, nullable=False, default=0)
    stock = Column(Integer, default=0)
    status = Column(String(16), default="ACTIVE")

    product = relationship("Product", back_populates="skus")


# ---------------------------------------------------------------
# 购物车
# ---------------------------------------------------------------
class CartItem(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    sku_id = Column(Integer, ForeignKey("product_skus.id"))
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sku = relationship("ProductSku")


# ---------------------------------------------------------------
# 收货地址
# ---------------------------------------------------------------
class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    receiver_name = Column(String(64), nullable=False)
    phone = Column(String(32), nullable=False)
    province = Column(String(64), default="")
    city = Column(String(64), default="")
    district = Column(String(64), default="")
    detail_address = Column(String(255), default="")
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")


# ---------------------------------------------------------------
# 收藏
# ---------------------------------------------------------------
class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    __table_args__ = (Index("ix_favorites_user_product", "user_id", "product_id", unique=True),)


# ---------------------------------------------------------------
# 优惠券
# ---------------------------------------------------------------
class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    type = Column(String(32), default="FULL_REDUCTION")  # 满减券
    threshold = Column(Float, default=0)  # 门槛金额
    discount_amount = Column(Float, default=0)  # 优惠金额
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    total_quantity = Column(Integer, default=0)
    used_quantity = Column(Integer, default=0)
    status = Column(String(16), default="ACTIVE")  # ACTIVE / DISABLED
    created_at = Column(DateTime, default=datetime.utcnow)


class UserCoupon(Base):
    __tablename__ = "user_coupons"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"))
    status = Column(String(16), default="UNUSED")  # UNUSED / USED / EXPIRED
    used_order_id = Column(Integer, default=0)
    received_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime)


# ---------------------------------------------------------------
# 订单
# ---------------------------------------------------------------
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_no = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String(32), default="PENDING_PAYMENT")
    total_amount = Column(Float, default=0)  # 商品总金额
    discount_amount = Column(Float, default=0)  # 优惠金额
    pay_amount = Column(Float, default=0)  # 实付金额
    receiver_name = Column(String(64), default="")
    phone = Column(String(32), default="")
    address_snapshot = Column(Text, default="{}")  # 地址快照 JSON
    user_coupon_id = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime)
    shipped_at = Column(DateTime)
    completed_at = Column(DateTime)
    cancelled_at = Column(DateTime)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)
    shipment = relationship("Shipment", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    product_id = Column(Integer)
    sku_id = Column(Integer)
    product_name_snapshot = Column(String(128), default="")
    spec_snapshot = Column(Text, default="{}")
    price = Column(Float, default=0)
    quantity = Column(Integer, default=1)
    subtotal = Column(Float, default=0)

    order = relationship("Order", back_populates="items")


# ---------------------------------------------------------------
# 支付
# ---------------------------------------------------------------
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    payment_no = Column(String(64), unique=True, index=True)
    method = Column(String(32), default="WECHAT")  # WECHAT / ALIPAY
    amount = Column(Float, default=0)
    status = Column(String(16), default="PENDING")  # PENDING / SUCCESS / FAILED
    paid_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")


# ---------------------------------------------------------------
# 物流
# ---------------------------------------------------------------
class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    company = Column(String(64), default="")
    tracking_number = Column(String(64), default="")
    status = Column(String(16), default="SHIPPED")  # SHIPPED / DELIVERED
    shipped_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="shipment")


# ---------------------------------------------------------------
# 退款
# ---------------------------------------------------------------
class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount = Column(Float, default=0)
    reason = Column(String(255), default="")
    description = Column(Text, default="")
    status = Column(String(16), default="PENDING")  # PENDING / APPROVED / REJECTED / REFUNDED
    reject_reason = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)


# ---------------------------------------------------------------
# 评价
# ---------------------------------------------------------------
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, index=True)
    order_item_id = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    rating = Column(Integer, default=5)  # 1-5
    content = Column(Text, default="")
    images = Column(Text, default="[]")
    status = Column(String(16), default="ACTIVE")  # ACTIVE / DELETED
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------
# 消息通知
# ---------------------------------------------------------------
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(128), default="")
    content = Column(Text, default="")
    type = Column(String(32), default="SYSTEM")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------
# 库存日志
# ---------------------------------------------------------------
class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, index=True)
    sku_id = Column(Integer, index=True)
    change_quantity = Column(Integer, default=0)  # 正数增加，负数减少
    before_quantity = Column(Integer, default=0)
    after_quantity = Column(Integer, default=0)
    reason = Column(String(128), default="")
    operator_id = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------
# 操作日志
# ---------------------------------------------------------------
class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True)
    operator_id = Column(Integer, default=0)
    action = Column(String(64), default="")
    target_type = Column(String(64), default="")
    target_id = Column(Integer, default=0)
    description = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)