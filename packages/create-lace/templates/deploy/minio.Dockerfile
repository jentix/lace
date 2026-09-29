FROM golang:1.23.6-bookworm AS build

ARG MINIO_TAG=RELEASE.2025-02-07T23-21-09Z
ARG MINIO_COMMIT=703f51164d3d0c44af41b0d86075a1f61e4779e7
RUN git clone --depth 1 --branch "$MINIO_TAG" https://github.com/minio/minio.git /src \
    && test "$(git -C /src rev-parse HEAD)" = "$MINIO_COMMIT"
WORKDIR /src
RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "$(go run buildscripts/gen-ldflags.go)" \
    -o /minio .

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /minio /usr/local/bin/minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
