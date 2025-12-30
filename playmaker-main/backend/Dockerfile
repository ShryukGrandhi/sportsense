# Backend Dockerfile for PLAYMAKER Sports AI API
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching (repo root context)
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
# Filter out private/unpublished packages that break builds on Railway
RUN sed '/^emergentintegrations==/d' requirements.txt > requirements.prod.txt \
    && pip install --no-cache-dir -r requirements.prod.txt \
    && pip install --no-cache-dir requests

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/ || exit 1

# Run the application with uvicorn
# Use shell form to properly expand $PORT environment variable
CMD sh -c "uvicorn backend.server:app --host 0.0.0.0 --port ${PORT:-8000}"
