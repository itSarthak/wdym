#!/bin/bash

echo "🚀 Starting deployment for wdym..."

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found! Generating one..."
    echo "Please enter your cloud PostgreSQL URL:"
    read DATABASE_URL
    echo "Please enter a strong JWT secret (access):"
    read JWT_SECRET
    echo "Please enter a strong JWT secret (refresh):"
    read JWT_REFRESH_SECRET
    echo "Please enter your platform URL (e.g. http://my-ip or https://wdym.app):"
    read CLIENT_URL

    cat > .env <<EOF
DATABASE_URL="$DATABASE_URL"
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
CLIENT_URL="$CLIENT_URL"
VITE_API_URL="/api"
EOF
    echo "✅ .env created."
else
    echo "✅ Using existing .env file."
fi

# Build and start containers
echo "📦 Building and starting containers..."
docker compose up -d --build

echo "✨ Deployment complete!"
echo "Your app should be live at: $CLIENT_URL"
echo "Note: If using a cloud provider, ensure Port 80 is open in your firewall."
