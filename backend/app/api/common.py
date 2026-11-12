"""通用辅助函数：序列化、消息生成、订单号生成"""
import json
import random
import time
from datetime import datetime

from .. import models


def json_loads(s, default=None):
    if not s:
        return default if default is not None else {}
    try:
        return json.loads(s)
    except Exception:
        return default if default is not None else {}


def gen_order_no():
    return f"{time.strftime('%Y%m%d%H%M%S')}{random.randint(100000, 999999)}"


def gen_payment_no():
    return f"PAY{time.strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}"


def gen_sku_code(product_id, index):
    return f"SKU{product_id:05d}-{index:02d}"


def _user_dict(u: models.User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "nickname": u.nickname,
        "phone": u.phone,
        "email": u.email,
        "role": u.role,
        "status": u.status,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def _category_dict(c: models.Category) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "parent_id": c.parent_id,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _sku_dict(s: models.ProductSku) -> dict:
    return {
        "id": s.id,
        "product_id": s.product_id,
        "sku_code": s.sku_code,
        "spec_values": json_loads(s.spec_values),
        "price": s.price,
        "stock": s.stock,
        "status": s.status,
    }


def _product_dict(p: models.Product, with_skus=False) -> dict:
    d = {
        "id": p.id,
        "category_id": p.category_id,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "original_price": p.original_price,
        "stock": p.stock,
        "status": p.status,
        "sales": p.sales,
        "images": json_loads(p.images, []),
    }
    if with_skus:
        d["skus"] = [_sku_dict(s) for s in p.skus]
    return d


def _coupon_dict(c: models.Coupon) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "threshold": c.threshold,
        "discount_amount": c.discount_amount,
        "start_time": c.start_time.isoformat() if c.start_time else None,
        "end_time": c.end_time.isoformat() if c.end_time else None,
        "total_quantity": c.total_quantity,
        "used_quantity": c.used_quantity,
        "status": c.status,
    }


def _address_dict(a: models.Address) -> dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "receiver_name": a.receiver_name,
        "phone": a.phone,
        "province": a.province,
        "city": a.city,
        "district": a.district,
        "detail_address": a.detail_address,
        "is_default": a.is_default,
        "full_address": f"{a.province}{a.city}{a.district}{a.detail_address}",
    }


def _order_status_cn(status: str) -> str:
    m = {
        "PENDING_PAYMENT": "待支付",
        "PAID": "已支付",
        "PENDING_SHIPMENT": "待发货",
        "SHIPPED": "已发货",
        "COMPLETED": "已完成",
        "CANCELLED": "已取消",
        "REFUNDING": "退款中",
        "REFUNDED": "已退款",
    }
    return m.get(status, status)


def item_dict(oi: models.OrderItem) -> dict:
    return {
        "id": oi.id,
        "order_id": oi.order_id,
        "product_id": oi.product_id,
        "sku_id": oi.sku_id,
        "product_name": oi.product_name_snapshot,
        "spec_values": json_loads(oi.spec_snapshot),
        "price": oi.price,
        "quantity": oi.quantity,
        "subtotal": oi.subtotal,
    }


def order_dict(o: models.Order, with_items=True, with_payment=False, with_shipment=False) -> dict:
    d = {
        "id": o.id,
        "order_no": o.order_no,
        "user_id": o.user_id,
        "status": o.status,
        "status_cn": _order_status_cn(o.status),
        "total_amount": o.total_amount,
        "discount_amount": o.discount_amount,
        "pay_amount": o.pay_amount,
        "receiver_name": o.receiver_name,
        "phone": o.phone,
        "address_snapshot": json_loads(o.address_snapshot),
        "user_coupon_id": o.user_coupon_id,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "paid_at": o.paid_at.isoformat() if o.paid_at else None,
        "shipped_at": o.shipped_at.isoformat() if o.shipped_at else None,
        "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        "cancelled_at": o.cancelled_at.isoformat() if o.cancelled_at else None,
    }
    if with_items:
        d["items"] = [item_dict(i) for i in o.items]
    if with_payment and o.payment:
        d["payment"] = {
            "id": o.payment.id,
            "payment_no": o.payment.payment_no,
            "method": o.payment.method,
            "amount": o.payment.amount,
            "method_cn": "微信支付" if o.payment.method == "WECHAT" else "支付宝",
            "status": o.payment.status,
            "status_cn": {"PENDING": "待支付", "SUCCESS": "支付成功", "FAILED": "支付失败"}.get(o.payment.status, o.payment.status),
            "paid_at": o.payment.paid_at.isoformat() if o.payment.paid_at else None,
        }
    if with_shipment and o.shipment:
        d["shipment"] = {
            "id": o.shipment.id,
            "company": o.shipment.company,
            "tracking_number": o.shipment.tracking_number,
            "status": o.shipment.status,
            "status_cn": {"SHIPPED": "已发货", "DELIVERED": "已签收"}.get(o.shipment.status, o.shipment.status),
            "shipped_at": o.shipment.shipped_at.isoformat() if o.shipment.shipped_at else None,
        }
    return d


def refund_dict(r: models.Refund) -> dict:
    return {
        "id": r.id,
        "order_id": r.order_id,
        "order_no": getattr(r, "_order_no", None),
        "user_id": r.user_id,
        "amount": r.amount,
        "reason": r.reason,
        "description": r.description,
        "status": r.status,
        "status_cn": {"PENDING": "待审核", "APPROVED": "已同意", "REJECTED": "已拒绝", "REFUNDED": "已退款"}.get(r.status, r.status),
        "reject_reason": r.reject_reason,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "processed_at": r.processed_at.isoformat() if r.processed_at else None,
    }


def review_dict(r: models.Review, user=None) -> dict:
    return {
        "id": r.id,
        "order_id": r.order_id,
        "order_item_id": r.order_item_id,
        "user_id": r.user_id,
        "product_id": r.product_id,
        "product_name": getattr(r, "_product_name", None),
        "nickname": getattr(r, "_nickname", None),
        "rating": r.rating,
        "content": r.content,
        "images": json_loads(r.images, []),
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def message_dict(m: models.Message) -> dict:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "title": m.title,
        "content": m.content,
        "type": m.type,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def create_message(db, user_id, title, content, msg_type="SYSTEM"):
    msg = models.Message(user_id=user_id, title=title, content=content, type=msg_type)
    db.add(msg)


def list_to_rr(items, product_ids=None):
    """items: list of (sku, cart_item_or None). 返回 cart 行。"""
    return []