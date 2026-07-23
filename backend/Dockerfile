FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for compiling some python packages if wheel is not available)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose backend port
EXPOSE 5000

# Run uvicorn server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
