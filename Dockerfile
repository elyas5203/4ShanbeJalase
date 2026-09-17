FROM node:20-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Copy the built admin panel (served by FastAPI from ./dist)
COPY --from=frontend-build /app/dist ./dist

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "backend/main.py"]
