"""密码哈希与 JWT 工具"""
from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError

from .. import config


def hash_password(password: str) -> str:
    """使用 bcrypt 生成密码哈希"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        # 兼容旧的 passlib 哈希格式（$2b$ 前缀）
        try:
            import passlib.hash
            return passlib.hash.bcrypt.verify(plain_password, password_hash)
        except Exception:
            return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    # JWT 规范要求 subject(sub) 为字符串
    if "sub" in to_encode and to_encode["sub"] is not None:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError:
        return None