# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend / OCR Service
FROM python:3.11-slim AS backend-base
WORKDIR /app/backend
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    llibgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]