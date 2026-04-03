#!/bin/sh
set -e

# Substitute PORT in nginx config
envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: show what we got
echo "Starting nginx on port: ${PORT}"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
