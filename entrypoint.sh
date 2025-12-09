#!/bin/sh
set -e

# Default PUID/PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting Beat Scrobble..."
echo "-----------------------------------"
echo "GID/UID"
echo "-----------------------------------"
echo "User uid:    $PUID"
echo "User gid:    $PGID"
echo "-----------------------------------"

# Update generic user 'beatscrobble' with new UID/GID
groupmod -o -g "$PGID" beatscrobble
usermod -o -u "$PUID" beatscrobble

# Fix permissions for the config directory
echo "Fixing permissions on /etc/beat_scrobble..."
chown -R beatscrobble:beatscrobble /etc/beat_scrobble
chown -R beatscrobble:beatscrobble /app

# Step down from root and run the application
echo "Starting application as beatscrobble..."
exec su-exec beatscrobble /app/app
