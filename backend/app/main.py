"""FastAPI 应用入口"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from . import config
from .seed.seed import init_seed
from .api import auth, products, cart, addresses, favorites, coupons, orders, payments, refunds, reviews, messages, admin

app = FastAPI(
    title="MiniShop 综合电商平台 API",
    description="MiniShop 是一个轻量级综合电商平台，作为 WHartTest 的真实被测系统（SUT）。",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- 统一错误响应格式 ----------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "服务端内部错误", "data": None},
    )


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    msg = exc.detail if isinstance(exc.detail, str) else "请求错误"
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": "HTTP_ERROR", "message": msg, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"code": "VALIDATION_ERROR", "message": "参数校验失败", "data": {"errors": exc.errors()}},
    )


# ---------------- 启动事件 ----------------
@app.on_event("startup")
def on_startup():
    init_seed()
    print("MiniShop database initialized, seed data ready.")


# ---------------- 路由注册 ----------------
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(addresses.router)
app.include_router(favorites.router)
app.include_router(coupons.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(refunds.router)
app.include_router(reviews.router)
app.include_router(messages.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"code": "OK", "message": "MiniShop API 运行中，文档请访问 /docs", "data": None}