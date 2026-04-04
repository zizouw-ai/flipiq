#!/bin/sh
set -e

# Set default BACKEND_URL if not provided
export BACKEND_URL=${BACKEND_URL:-http://localhost:8000/}

# Ensure BACKEND_URL has trailing slash
case "$BACKEND_URL" in
    */) ;;
    *) BACKEND_URL="${BACKEND_URL}/" ;;
esac

# Substitute PORT and BACKEND_URL in nginx config
envsubst '\$PORT \$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: show what we got
echo "Starting nginx on port: ${PORT}"
echo "Backend URL: ${BACKEND_URL}"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
