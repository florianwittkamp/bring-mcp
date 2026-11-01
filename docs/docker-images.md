# Docker image builds

The `Docker images` workflow builds and publishes this fork's image on pushes to
`main`, version tags matching `v*`, and manual runs on `main`. Pull requests run
the same checks and build the image without publishing it. Manual runs on other
branches also validate without publishing.

Images are published to `ghcr.io/<owner>/<repository>` using the repository's
`GITHUB_TOKEN`; no additional registry secret or account credentials are needed.
The workflow runs the Node.js tests and build, then tests the container with a
local control plane and fictitious credentials before publishing a multi-platform
image for `linux/amd64` and `linux/arm64`.

For this fork, use `ghcr.io/tooker/bring-mcp` with these tags:

| Tag                     | Contents                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `latest`, `tunnel`      | Latest successful build of `main`, including the tunnel client |
| `v1.2.3`                | Build of a matching version tag                                |
| `sha-<full-commit-sha>` | Build of a specific commit                                     |

## Pull and update

After configuring `.env` as described in the setup guide:

```bash
docker compose pull
docker compose up -d --no-build
```

GitHub may initially create the container package as private. In that case,
authenticate Docker to `ghcr.io` with an account that has package read access
before pulling, or change the package's visibility in its GitHub settings if you
want anonymous pulls. Login credentials belong on the Docker host, never in the
image or workflow file.

## Local builds

The Compose build definition remains available for development:

```bash
docker compose build
docker compose up -d --no-build --pull never
```

This tags the local build with the configured image name. The next registry pull
replaces that local tag with the published image. For an isolated local smoke
test, follow the image validation commands in the setup guide.
