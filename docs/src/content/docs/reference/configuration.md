---
title: Configuration
description: The available configuration options when setting up Beat Scrobble.
---

Beat Scrobble is configured using **environment variables**. This is the full list of configuration options supported by Beat Scrobble.

The suffix `_FILE` is also supported for every environment variable. This allows the use of Docker secrets, for example: `BEAT_SCROBBLE_DATABASE_URL_FILE=/run/secrets/database-url` will load the content of the file at `/run/secrets/database-url` for the environment variable `BEAT_SCROBBLE_DATABASE_URL`.

:::caution
If the environment variable is defined without **and** with the suffix at the same time, the content of the environment variable without the `_FILE` suffix will have the higher priority.
:::

##### BEAT_SCROBBLE_DATABASE_URL
- Required: `true`
- Description: A Postgres connection URI. See https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS for more information.
##### BEAT_SCROBBLE_ALLOWED_HOSTS
- Required: `true`
- Description: A list of hosts to allow requests from. E.g. `Beat Scrobble.mydomain.com,192.168.0.100:4110`.
##### BEAT_SCROBBLE_DEFAULT_USERNAME
- Default: `admin`
- Description: The username for the user that is created on first startup. Only applies when running Beat Scrobble for the first time.
##### BEAT_SCROBBLE_DEFAULT_PASSWORD
- Default: `changeme`
- Description: The password for the user that is created on first startup. Only applies when running Beat Scrobble for the first time.
##### BEAT_SCROBBLE_DEFAULT_THEME
- Default: `yuu`
- Description: The lowercase name of the default theme to be used by the client. Overridden if a user picks a theme in the theme switcher.
##### BEAT_SCROBBLE_LOGIN_GATE
- Default: `false`
- Description: When `true`, Beat Scrobble will not show any statistics unless the user is logged in.
##### BEAT_SCROBBLE_BIND_ADDR
- Description: The address to bind to. The default blank value is equivalent to `0.0.0.0`.
##### BEAT_SCROBBLE_LISTEN_PORT
- Default: `4110`
- Description: The port Beat Scrobble will listen on.
##### BEAT_SCROBBLE_ENABLE_STRUCTURED_LOGGING
- Default: `false`
- Description: When set to `true`, will log in JSON format.
##### BEAT_SCROBBLE_ENABLE_FULL_IMAGE_CACHE
- Default: `false`
- Description: When set to `true`, will store the full size downloaded images, which can then be served under `/images/full`.
##### BEAT_SCROBBLE_LOG_LEVEL
- Default: `info`
- Description: One of `debug | info | warn | error | fatal`
##### BEAT_SCROBBLE_ARTIST_SEPARATORS_REGEX
- Default: `\s+·\s+`
- Description: The list of regex patterns Beat Scrobble will use to separate artist strings, separated by two semicolons (`;;`). 
##### BEAT_SCROBBLE_MUSICBRAINZ_URL
- Default: `https://musicbrainz.org`
- Description: The URL Beat Scrobble will use to contact MusicBrainz. Replace this value if you have your own MusicBrainz mirror.
##### BEAT_SCROBBLE_MUSICBRAINZ_RATE_LIMIT
- Default: `1`
- Description: The number of requests to send to the MusicBrainz server per second. Unless you are using your own MusicBrainz mirror, __do not touch this value__.
##### BEAT_SCROBBLE_ENABLE_LBZ_RELAY
- Default: `false`
- Description: Set to `true` if you want to relay requests from the ListenBrainz endpoints on your Beat Scrobble server to another ListenBrainz compatible server.
##### BEAT_SCROBBLE_LBZ_RELAY_URL
- Required: `true` if relays are enabled.
- Description: The URL to which relayed requests will be sent to.
##### BEAT_SCROBBLE_LBZ_RELAY_TOKEN
- Required: `true` if relays are enabled.
- Description: The user token to send with the relayed ListenBrainz requests.
##### BEAT_SCROBBLE_CONFIG_DIR
- Default: `/etc/Beat Scrobble`
- Description: The location where import folders and image caches are stored.
##### BEAT_SCROBBLE_DISABLE_DEEZER
- Default: `false`
- Description: Disables Deezer as a source for finding artist and album images.
##### BEAT_SCROBBLE_DISABLE_COVER_ART_ARCHIVE
- Default: `false`
- Description: Disables Cover Art Archive as a source for finding album images.
##### BEAT_SCROBBLE_DISABLE_MUSICBRAINZ
- Default: `false`
##### BEAT_SCROBBLE_SUBSONIC_URL
- Required: `true` if BEAT_SCROBBLE_SUBSONIC_PARAMS is set
- Description: The URL of your subsonic compatible music server. For example, `https://navidrome.mydomain.com`.
##### BEAT_SCROBBLE_SUBSONIC_PARAMS
- Required: `true` if BEAT_SCROBBLE_SUBSONIC_URL is set
- Description: The `u`, `t`, and `s` authentication parameters to use for authenticated requests to your subsonic server, in the format `u=XXX&t=XXX&s=XXX`. An easy way to find them is to open the network tab in the developer tools of your browser of choice and copy them from a request.
##### BEAT_SCROBBLE_SKIP_IMPORT
- Default: `false`
- Description: Skips running the importer on startup.
##### BEAT_SCROBBLE_DISABLE_RATE_LIMIT
- Default: `false`
- Description: When enabled, disables the rate limiter that Beat Scrobble has on the `/apis/web/v1/login` endpoint.
##### BEAT_SCROBBLE_THROTTLE_IMPORTS_MS
- Default: `0`
- Description: The amount of time to wait, in milliseconds, between listen imports. Can help when running Beat Scrobble on low-powered machines.
##### BEAT_SCROBBLE_IMPORT_BEFORE_UNIX
- Description: A unix timestamp. If an imported listen has a timestamp after this, it will be discarded.
##### BEAT_SCROBBLE_IMPORT_AFTER_UNIX
- Description: A unix timestamp. If an imported listen has a timestamp before this, it will be discarded.
##### BEAT_SCROBBLE_FETCH_IMAGES_DURING_IMPORT
- Default: `false`
- Description: When true, images will be downloaded and cached during imports.
##### BEAT_SCROBBLE_CORS_ALLOWED_ORIGINS
- Default: No CORS policy
- Description: A comma separated list of origins to allow CORS requests from. The special value `*` allows CORS requests from all origins.
