"""认证相关 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth.security import hash_password, verify_password, create_access_token
from ..auth.dependencies import get_current_user
from .common import _user_dict

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", status_code=201)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.username == body.username).first()
    if exists:
        raise HTTPException(status_code=409, detail="用户名已存在")
    user = models.User(
        username=body.username,
        password_hash=hash_password(body.password),
        nickname=body.nickname or body.username,
        phone=body.phone or "",
        email=body.email or "",
        role="USER",
        status="ACTIVE",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"code": "OK", "message": "注册成功", "data": _user_dict(user)}


@router.post("/login")
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="账号已被禁用")
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "code": "OK",
        "message": "登录成功",
        "data": {"token": token, "user": _user_dict(user)},
    }


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {"code": "OK", "message": "success", "data": _user_dict(user)}


@router.post("/logout")
def logout(user: models.User = Depends(get_current_user)):
    # JWT 无状态，前端删除 token 即可。此接口为语义化而存在。
    return {"code": "OK", "message": "退出成功", "data": None}