#!/bin/bash
# FlipIQ VPS Deployment Script
# Run this on the Hetzner VPS after initial setup

set -e

echo "=== FlipIQ Deployment Script ==="

# Update system
echo "Updating system..."
apt-get update && apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create app directory
mkdir -p /opt/flipiq
cd /opt/flipiq

# Clone repository (or copy files)
if [ ! -d ".git" ]; then
    echo "Cloning FlipIQ repository..."
    git clone https://github.com/YOUR_USERNAME/flipiq.git .
fi

# Create data directory
mkdir -p data

# Build and start services
echo "Building and starting services..."
docker-compose pull
docker-compose build --no-cache
docker-compose up -d

# Setup backup cron job
echo "Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/flipiq/scripts/backup.sh >> /var/log/flipiq-backup.log 2>&1") | crontab -

echo "=== Deployment Complete ==="
echo "FlipIQ should be running on http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "1. Configure SSL with: ./scripts/setup-ssl.sh your-domain.com"
echo "2. Update DNS to point to this server"
echo "3. Configure cloud backup credentials in scripts/backup.sh"
