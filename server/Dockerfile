FROM python:3.13-slim

WORKDIR /app

# Install system libraries needed by OpenCV, Pillow, and YOLO
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install python dependencies (use CPU-only PyTorch and opencv-python-headless to save disk space)
COPY pyproject.toml ./
RUN uv venv && \
    uv pip install --no-cache torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    uv pip install --no-cache -r pyproject.toml && \
    find /app/.venv -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Copy project source code
COPY . .

# Pre-download YOLO weights at build time (not stored in Git)
RUN uv run python -c "from ultralytics import YOLO; YOLO('yolov8s.pt'); YOLO('yolov8s-world.pt')"

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uv", "run", "fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
