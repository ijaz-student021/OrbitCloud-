# Gateway image: the official Caddy with our Caddyfile baked in.
# (No host-folder bind mount, so the cloud works from any folder — including
#  macOS-protected ones like Desktop/Documents — without extra permissions.)
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
