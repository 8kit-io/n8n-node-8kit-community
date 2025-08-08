#!/bin/bash

echo "🛑 Stopping n8n..."
docker-compose down

echo "🧹 Cleaning up..."
docker system prune -f

echo "✅ n8n stopped successfully!" 