# nci-webtools-dccps-seer

## Getting Started

Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2 (`docker compose`).

After cloning this repository, copy the backend environment file:

```bash
cp server/.env.example server/.env
```

Build and start the frontend and backend services:

```bash
docker compose up --build
```

JPSurv is available at [http://localhost/jpsurv](http://localhost/jpsurv).

To stop the stack:

```bash
docker compose down
```
