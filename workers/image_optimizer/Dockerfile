FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV IMAGE_OPTIMIZER_LOCAL_STORAGE_DIR=/app/storage
ENV IMAGE_OPTIMIZER_PUBLIC_BASE_URL=http://localhost:8000

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]