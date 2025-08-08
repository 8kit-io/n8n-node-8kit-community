#!/bin/bash

echo "🚀 Building n8n Basic Processor Node..."
pnpm build

echo "🐳 Starting n8n with Docker Compose..."
docker-compose up -d

echo "✅ n8n is starting up!"
echo "📱 Access n8n at: http://localhost:5678"
echo "👤 Username: admin"
echo "🔑 Password: password"
echo ""
echo "🔍 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down" 