---
title: Installation
description: Guide on how to install Beat Scrobble to start tracking your listening history.
---

## Docker
By far the easiest way to get up and running with Beat Scrobble is using docker. Here is an example Docker Compose file to get you up and running in minutes:
```yaml title="compose.yaml"
services:
  Beat Scrobble:
    image: ghcr.io/saturnx-dev/beat-scrobble:latest
    container_name: Beat Scrobble
    depends_on:
      - db
    environment:
      - BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:secret_password@db:5432/Beat Scrobbledb
      - BEAT_SCROBBLE_ALLOWED_HOSTS=Beat Scrobble.example.com,192.168.0.100:4110
    ports:
      - "4110:4110"
    volumes:
      - ./Beat Scrobble-data:/etc/Beat Scrobble
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg16
    container_name: psql
    restart: unless-stopped
    environment:
      POSTGRES_DB: Beat Scrobbledb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret_password
    volumes:
      - ./db-data:/var/lib/postgresql/data

```

Be sure to replace `secret_password` with a random password of your choice, and set `BEAT_SCROBBLE_ALLOWED_HOSTS` to include the domain name or IP address you will be accessing Beat Scrobble 
from.

Those are the two required environment variables. You can find a full list of configuration options in the [configuration reference](/reference/configuration).

:::caution
Setting `BEAT_SCROBBLE_ALLOWED_HOSTS=*` will allow requests from any host, but this is not recommended as it introduces security vulnerabilities.
:::

## Build from source

If you don't want to use docker, you can also build the application from source.

First, you need to install dependencies. Beat Scrobble relies on `make`, `yarn` for building the client, and `libvips-dev` to process images.

```sh
sudo apt install libvips-dev make npm
sudo npm install --global yarn
```

If you aren't installing on an Ubuntu or Debian based system, you can easily find ways to install make, npm, and yarn by googling, and
you can find other ways to install `libvips-dev` on the [libvips wiki](https://github.com/libvips/libvips/wiki/).

Then, clone the repository and execute the build command using the included Makefile:

```sh
git clone https://github.com/SaturnX-Dev/Beat-Scrobble && cd Beat Scrobble
make build
```

When the build is finished, you can run the executable at the root of the directory. You'll also need to defined the required environment variables.

```sh
BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:secret_password@postgres_ip:5432/Beat Scrobbledb \
BEAT_SCROBBLE_ALLOWED_HOSTS=Beat Scrobble.example.com,192.168.0.100:4110 \
./Beat Scrobble
```

Then, navigate your browser to `localhost:4110` to enter your Beat Scrobble instance.

:::note
You will need to provide your own Postgres instance. You can find downloads to Postgres [here](https://www.postgresql.org/download/).
:::