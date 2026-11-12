FROM python:3.12-slim

WORKDIR /app

# 安装依赖，优先利用缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝源码
COPY app ./app
COPY seed_media ./seed_media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]