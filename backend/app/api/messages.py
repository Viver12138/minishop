"""站内消息通知 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth.dependencies import get_current_user
from .common import message_dict

router = APIRouter(prefix="/api/messages", tags=["消息"])


@router.get("")
def list_messages(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(models.Message).filter(models.Message.user_id == user.id).order_by(models.Message.created_at.desc()).all()
    return {"code": "OK", "message": "success", "data": [message_dict(m) for m in msgs]}


@router.get("/unread-count")
def unread_count(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(models.Message).filter(models.Message.user_id == user.id, models.Message.is_read == False).count()
    return {"code": "OK", "message": "success", "data": {"count": count}}


@router.post("/{message_id}/read")
def mark_read(message_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(models.Message).filter(models.Message.id == message_id, models.Message.user_id == user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
    msg.is_read = True
    db.commit()
    return {"code": "OK", "message": "success", "data": None}


@router.post("/read-all")
def mark_all_read(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Message).filter(models.Message.user_id == user.id, models.Message.is_read == False).update(
        {models.Message.is_read: True}
    )
    db.commit()
    return {"code": "OK", "message": "success", "data": None}