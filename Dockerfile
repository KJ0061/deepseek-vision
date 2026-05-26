# ── Stage 1: Build frontend ──────────────────────────────────────────────
FROM node:22-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
# vite build outputs to ../app/static (relative to frontend/)
RUN npm run build

# ── Stage 2: Python app ───────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY . .

# Overlay the built frontend assets (Vite outDir = ../app/static)
COPY --from=frontend-builder /app/static ./app/static

EXPOSE 8000
CMD ["python", "main.py"]
