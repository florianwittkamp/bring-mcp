#!/bin/sh
set -eu

# Help must remain usable before credentials have been configured.
for argument in "$@"; do
    case "$argument" in
        --help|-h)
            exec tunnel-client "$@"
            ;;
    esac
done

case "${1:-}" in
    run|doctor)
        : "${BRING_EMAIL:?BRING_EMAIL fehlt. Bitte in .env eintragen.}"
        : "${BRING_PASSWORD:?BRING_PASSWORD fehlt. Bitte in .env eintragen.}"
        : "${CONTROL_PLANE_TUNNEL_ID:?CONTROL_PLANE_TUNNEL_ID fehlt. Bitte in .env eintragen.}"
        : "${CONTROL_PLANE_API_KEY:?CONTROL_PLANE_API_KEY fehlt. Bitte in .env eintragen.}"
        ;;
esac

exec tunnel-client "$@"
