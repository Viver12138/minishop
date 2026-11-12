"""Pydantic 请求/响应模型"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------- 通用 ----------------
class ApiResponse(BaseModel):
    code: str = "OK"
    message: str = "success"
    data: Optional[object] = None


class Page(BaseModel):
    total: int = 0
    page: int = 1
    page_size: int = 10
    items: List[object] = []


# ---------------- 认证 ----------------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=64)
    nickname: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    nickname: str
    phone: str
    email: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- 分类 ----------------
class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


# ---------------- 商品 ----------------
class SkuIn(BaseModel):
    sku_code: Optional[str] = ""
    spec_values: Optional[dict] = {}
    price: float = 0
    stock: int = 0


class ProductCreate(BaseModel):
    category_id: int
    name: str
    description: Optional[str] = ""
    price: float = 0
    original_price: Optional[float] = 0
    stock: int = 0
    images: Optional[List[str]] = []
    skus: Optional[List[SkuIn]] = []


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    skus: Optional[List[SkuIn]] = None


# ---------------- 购物车 ----------------
class CartAddRequest(BaseModel):
    sku_id: int
    quantity: int = 1


class CartUpdateRequest(BaseModel):
    quantity: int


# ---------------- 地址 ----------------
class AddressCreate(BaseModel):
    receiver_name: str
    phone: str
    province: str = ""
    city: str = ""
    district: str = ""
    detail_address: str = ""
    is_default: bool = False


class AddressUpdate(BaseModel):
    receiver_name: Optional[str] = None
    phone: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    detail_address: Optional[str] = None
    is_default: Optional[bool] = None


# ---------------- 优惠券 ----------------
class CouponCreate(BaseModel):
    name: str
    type: str = "FULL_REDUCTION"
    threshold: float = 0
    discount_amount: float = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_quantity: Optional[int] = 0
    status: Optional[str] = "ACTIVE"


# ---------------- 订单 ----------------
class OrderItemRequest(BaseModel):
    sku_id: int
    quantity: int = 1


class OrderPreviewRequest(BaseModel):
    items: List[OrderItemRequest]  # sku_id + quantity
    address_id: Optional[int] = None
    user_coupon_id: Optional[int] = None


class OrderCreateRequest(BaseModel):
    items: List[OrderItemRequest]
    address_id: int
    user_coupon_id: Optional[int] = None
    payment_method: Optional[str] = "WECHAT"


# ---------------- 支付 ----------------
class PaymentCreateRequest(BaseModel):
    order_id: int
    method: str = "WECHAT"


# ---------------- 退款 ----------------
class RefundCreateRequest(BaseModel):
    order_id: int
    reason: str = ""
    description: str = ""


class RefundReviewRequest(BaseModel):
    reject_reason: Optional[str] = ""


# ---------------- 评价 ----------------
class ReviewCreateRequest(BaseModel):
    order_item_id: int
    rating: int = Field(ge=1, le=5)
    content: str = ""
    images: Optional[List[str]] = []


# ---------------- 发货 ----------------
class ShipRequest(BaseModel):
    company: str
    tracking_number: str


# ---------------- 库存 ----------------
class InventoryAdjustRequest(BaseModel):
    sku_id: int
    change_quantity: int  # 正加负减
    reason: str = "人工调整"


# ---------------- 用户管理 ----------------
class UserStatusUpdate(BaseModel):
    status: str  # ACTIVE / DISABLED