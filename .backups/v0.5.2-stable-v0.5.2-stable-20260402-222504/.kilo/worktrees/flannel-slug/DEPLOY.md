# FlipIQ Deployment Guide

## Phase 2 — VPS Deployment (Hetzner CX22)

### Prerequisites
- Hetzner Cloud account
- Domain name (optional but recommended)
- GitHub repository access

### Server Specs (CX22)
- 2 vCPUs
- 4 GB RAM
- 40 GB SSD
- ~C$5.50/month

---

## Quick Deploy

### 1. Create Server
```bash
# On your local machine, create a new CX22 instance
# Install Docker and Docker Compose
ssh root@YOUR_SERVER_IP
```

### 2. Clone and Deploy
```bash
git clone https://github.com/YOUR_USERNAME/flipiq.git /opt/flipiq
cd /opt/flipiq
./scripts/deploy.sh
```

### 3. Configure Domain & SSL (Optional)
```bash
./scripts/setup-ssl.sh your-domain.com
```

---

## Manual Steps

### Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Build and Run
```bash
cd /opt/flipiq

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## Coolify Integration (Auto-Deploy)

1. Install Coolify on your VPS:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. Access Coolify dashboard at `http://YOUR_SERVER_IP:8000`

3. Add your GitHub repository as a source

4. Create a new resource:
   - Type: Docker Compose
   - Repository: your/flipiq
   - Branch: main
   - Compose file: `docker-compose.yml`

5. Configure environment variables

6. Deploy

---

## Backup Configuration

### Automated Nightly Backups
Backups are configured automatically by `deploy.sh`.

To configure cloud upload:
1. Install rclone: `apt install rclone`
2. Configure: `rclone config`
3. Edit `scripts/backup.sh` with your remote name

### Manual Backup
```bash
./scripts/backup.sh
```

### Restore from Backup
```bash
# Stop services
docker-compose down

# Restore database
cp backup_file.db data/flipiq.db

# Start services
docker-compose up -d
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | sqlite:///data/flipiq.db | Database connection |
| `CORS_ORIGINS` | * | Allowed CORS origins |
| `PORT` | 8000 | Backend port |

---

## Troubleshooting

### Check Service Status
```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### Restart Services
```bash
docker-compose restart
```

### Update Deployment
```bash
cd /opt/flipiq
git pull
docker-compose build
docker-compose up -d
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Configure firewall (ufw)
- [ ] Enable automatic security updates
- [ ] Set up log monitoring
- [ ] Configure fail2ban
- [ ] Use strong SSH keys (disable password auth)
- [ ] Regular backup testing

---

## Next Steps (Phase 3)

- Multi-user authentication (JWT)
- Stripe billing integration
- PostgreSQL migration
- Landing page
