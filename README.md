# AniList Proxy

A small Express proxy for the AniList GraphQL API with a browser-based terminal.

## Requirements

- [Bun](https://bun.com)
- A `PROXY_TOKEN` environment variable

## Run locally

```bash
bun install
bun run start
```

Open `http://localhost:3000`. Set `PORT` to change the listening port.

## Project structure

```text
public/          Browser UI and static assets
src/index.js     Express server and AniList proxy endpoint
```

The proxy endpoint is `POST /anilist`. It expects a GraphQL request body and an
`Authorization: Bearer <PROXY_TOKEN>` header.
