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

echo "Starting Beat Scrobble as user beatscrobble..."
exec su-exec beatscrobble /app/app
