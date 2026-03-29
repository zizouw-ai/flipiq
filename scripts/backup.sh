#!/bin/bash
# FlipIQ SQLite Backup Script
# Run nightly via cron: 0 2 * * * /opt/flipiq/scripts/backup.sh

set -e

BACKUP_DIR="/data/backups"
DB_FILE="/data/flipiq.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/flipiq_backup_$DATE.db"
RETENTION_DAYS=30

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup with SQLite
if [ -f "$DB_FILE" ]; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
    echo "Backup created: $BACKUP_FILE"

    # Compress backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: $BACKUP_FILE.gz"

    # Upload to cloud storage (configure with rclone)
    # rclone copy "$BACKUP_FILE.gz" remote:flipiq-backups/

    # Clean old backups
    find "$BACKUP_DIR" -name "flipiq_backup_*.db.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned (>$RETENTION_DAYS days)"
else
    echo "Database file not found: $DB_FILE"
    exit 1
fi
