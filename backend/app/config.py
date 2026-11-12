"""应用配置"""
import os

# 数据库连接（本地默认落在项目顶层 data/ 目录，与 Docker volume ./data:/app/data 一致）
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_DB = os.path.join(BASE_DIR, "data", "minishop.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB.replace(os.sep, '/')}")

# JWT 配置
SECRET_KEY = os.getenv("SECRET_KEY", "minishop-dev-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小时

# 预置媒体目录（用于商品图片占位）
SEED_MEDIA_DIR = os.getenv("SEED_MEDIA_DIR", os.path.join(os.path.dirname(__file__), "..", "seed_media"))

# CORS 允许来源
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]