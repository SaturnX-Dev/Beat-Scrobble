#!/bin/sh
set -e

# Default PUID/PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting Beat Scrobble..."
echo "-----------------------------------"
echo "Starting container with PUID: $PUID, PGID: $PGID"

groupmod -o -g "$PGID" beatscrobble
usermod -o -u "$PUID" beatscrobble

echo "Fixing permissions on /etc/beat_scrobble..."
# Force ownership
chown -R beatscrobble:beatscrobble /etc/beat_scrobble
# Force read/write/execute for owner and group, read/execute for others
chmod -R 770 /etc/beat_scrobble

echo "Fixing permissions on /app..."
chown -R beatscrobble:beatscrobble /app

# Verify permissions (debug)
ls -ld /etc/beat_scrobble

echo "Running database migrations..."
if [ -z "$BEAT_SCROBBLE_DATABASE_URL" ]; then
    echo "Error: BEAT_SCROBBLE_DATABASE_URL is not set"
    exit 1
fi

# Run goose migrations
/app/goose -dir /app/db/migrations postgres "$BEAT_SCROBBLE_DATABASE_URL" up

echo "Starting Beat Scrobble as user beatscrobble..."
exec su-exec beatscrobble /app/app
