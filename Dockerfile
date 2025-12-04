FROM node AS frontend

ARG BEAT_SCROBBLE_VERSION
ENV VITE_BEAT_SCROBBLE_VERSION=$BEAT_SCROBBLE_VERSION
ENV BUILD_TARGET=docker

WORKDIR /client
COPY ./client/package.json ./client/yarn.lock ./
RUN yarn install
COPY ./client .

RUN yarn run build

FROM golang:1.24 AS backend

ARG BEAT_SCROBBLE_VERSION
ENV CGO_ENABLED=1
ENV GOOS=linux

WORKDIR /app

RUN apt-get update && \
	apt-get install -y libvips-dev pkg-config && \
	rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -ldflags "-X main.Version=$BEAT_SCROBBLE_VERSION" -o app ./cmd/api


FROM debian:bookworm-slim AS final

WORKDIR /app

RUN apt-get update && \
	apt-get install -y libvips42 && \
	rm -rf /var/lib/apt/lists/*

COPY --from=backend /app/app ./app
COPY --from=frontend /client/build ./client/build
COPY ./client/public ./client/public
COPY ./assets ./assets
COPY ./db ./db

EXPOSE 4110

ENTRYPOINT ["./app"]
