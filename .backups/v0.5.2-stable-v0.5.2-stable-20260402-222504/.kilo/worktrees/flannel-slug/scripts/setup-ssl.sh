#!/bin/bash
# SSL Setup with Let's Encrypt
# Usage: ./scripts/setup-ssl.sh your-domain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain.com>"
    exit 1
fi

echo "Setting up SSL for $DOMAIN..."

# Install certbot
apt-get update
apt-get install -y certbot

# Get certificate
certbot certonly --standalone -d "$DOMAIN" --agree-tos -n -m "admin@$DOMAIN"

# Copy certificates for nginx
mkdir -p /opt/flipiq/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/flipiq/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/flipiq/ssl/

# Update nginx config with SSL
cat > /opt/flipiq/ssl-nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /ssl/fullchain.pem;
    ssl_certificate_key /ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Update docker-compose to mount SSL
cat > /opt/flipiq/docker-compose.prod.yml << EOF
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: flipiq-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=sqlite:///data/flipiq.db
      - CORS_ORIGINS=https://$DOMAIN
    volumes:
      - ./data:/data
    networks:
      - flipiq-network

  frontend:
    image: nginx:alpine
    container_name: flipiq-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./ssl:/ssl:ro
      - ./ssl-nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
    networks:
      - flipiq-network

networks:
  flipiq-network:
    driver: bridge
EOF

# Setup auto-renewal cron
echo "0 3 * * * certbot renew --quiet && docker-compose restart frontend" | crontab -

echo "SSL setup complete for $DOMAIN"
echo "Run: docker-compose -f docker-compose.prod.yml up -d"
