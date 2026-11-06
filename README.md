# ORBIT CLOUD

A private cloud you run yourself. Store files in it and **add, update, download and delete** them from home, the office or a phone — over encrypted HTTPS, with separate accounts, storage quotas, version history, a trash bin and backups.

Built on [Nextcloud](https://nextcloud.com) (open-source file-storage platform) inside Docker, so the whole cloud is reproducible with one command.

```
Clients ──HTTPS──▶ gateway (Caddy) ──▶ app (Nextcloud) ──▶ db (PostgreSQL)
(home/office/mobile)                        │          └──▶ cache (Redis)
                                            └── cron (background jobs)
```

See [docs/architecture.png](docs/architecture.png) and [docs/request-flow.png](docs/request-flow.png).

## Requirements

- Docker Desktop (macOS / Windows) or Docker Engine + Compose v2 (Linux)
- ~3 GB free disk, ~2 GB free RAM
- Internet for the first start (image download)

## Quick start

> Open Terminal and go to the project folder first — every `./orbit` command only works inside it:
> `cd ~/Desktop/Assignment3_ICC`

```bash
./orbit setup          # generates .env with random passwords (once)
./orbit up             # downloads, installs, brands, creates clients (3–6 min the first time)
./orbit credentials    # shows the logins
./orbit test           # proves ADD / UPDATE / DOWNLOAD / DELETE work end to end
```

Then open the URL printed by `./orbit up` (default `https://localhost:8443`).

| Role | Default user | Purpose |
|---|---|---|
| Provider (admin) | `orbitadmin` | runs the cloud: creates clients, quotas, apps |
| Client – home | `home` | 5 GB quota |
| Client – office | `office` | 10 GB quota |

Passwords are random and live only in `.env` (mode 600, git-ignored).

### Renaming the cloud
Edit `CLOUD_NAME` and `CLOUD_SLOGAN` in `.env`, then `./orbit up`. The logo is `branding/logo.svg`; new clients start with the files in `branding/skeleton/`.

## Using it from home / office

1. **Same network (Wi-Fi/LAN):** open `https://<this-computer's-IP>:8443` — `./orbit urls` prints it.
2. **From anywhere:** use a private VPN such as [Tailscale](https://tailscale.com) (free for personal use). Install it on the server and on your other devices, put the server's VPN name in `ORBIT_EXTRA_HOSTS` in `.env` (e.g. `ORBIT_EXTRA_HOSTS="mymac.tailnet.ts.net"`), run `./orbit up`, and browse to `https://mymac.tailnet.ts.net:8443`.
   Avoid opening router ports to the public Internet unless you know how to harden and patch the server.
3. The server computer must be on and awake (`caffeinate -s` keeps a Mac awake).

**Certificate warning:** HTTPS uses the cloud's own private certificate authority. Run `./orbit trust-ca` and follow the printed steps on each device (or accept the warning once for a demo).

### Android phone (e.g. Google Pixel 7)

1. Connect the phone to the **same Wi-Fi** as the server computer. Keep the computer awake and Docker open.
2. In Chrome open `https://<server-IP>:8443` (`./orbit urls` prints it) → **Advanced → Proceed** (one-time certificate notice) → log in.
3. To remove the notice for good: run `./orbit share-ca` on the computer, open the address it prints on the phone, then
   *Settings → Security & privacy → More security & privacy → Encryption & credentials → Install a certificate → CA certificate → Install anyway* and pick the downloaded file.
4. Nextcloud app (optional): install it from Google Play, enter `https://<server-IP>:8443`, and accept the certificate when asked.

**If the phone cannot reach the computer** (some office, university or guest Wi-Fi networks block devices from talking to each other): turn on the phone's hotspot
(*Settings → Network & internet → Hotspot & tethering*), connect the computer to it, run `./orbit up` (it detects the new address), and open the address from `./orbit urls` on the phone.

**Video guide:** `Video/ORBIT_CLOUD_Pixel7_Guide.mp4` shows these phone steps with real screens, narration and Roman Urdu captions (rebuild: `node tools/video/phone_shots.mjs && node tools/video/build_video.mjs`; the address shown in the video is the one from when it was made — `./orbit urls` always shows the current one).

**Desktop / mobile apps:** install the Nextcloud client, enter the server URL and a client login. Any WebDAV client works with
`https://<host>:8443/remote.php/dav/files/<user>/`.

## Daily operations

| Command | What it does |
|---|---|
| `./orbit status` | service health, per-client storage use, CPU/RAM |
| `./orbit backup` | consistent backup (database dump + config + user files + checksums) → `backups/<timestamp>/` |
| `./orbit restore backups/<timestamp>` | verifies checksums, then restores database and files (asks for confirmation) |
| `./orbit down` / `./orbit up` | stop / start (data is kept) |
| `./orbit logs app` | follow a service's logs |
| `./orbit destroy` | delete the cloud **and its data** (asks for confirmation) |

Add a client: `docker compose exec -u www-data app php occ user:add --display-name "New Client" newuser`
Change a quota: `docker compose exec -u www-data app php occ user:setting newuser files quota "20 GB"`

## Security design

- Only the gateway publishes a port (8443). PostgreSQL and Redis are reachable only inside the private `orbit-net` network.
- All traffic is TLS-encrypted; the test suite verifies the certificate chain.
- Secrets are generated per install (24 random characters), stored in `.env` with mode 600, never in code.
- Each client sees only their own files; sharing is explicit and permission-controlled (read-only by default in the tests).
- Deleted files go to a recoverable trash bin; overwritten files keep earlier versions.
- `BIND_ADDRESS=127.0.0.1` in `.env` restricts the cloud to this computer only.

Hardening before real production use: a public domain with a trusted certificate, HSTS, 2-factor authentication for admins, off-site backups, and regular `docker compose pull` updates.

## Notes

- The gateway configuration is baked into its own image (`caddy/Dockerfile`), so the cloud runs from any folder — including macOS-protected ones like Desktop — without giving Docker extra file permissions.
- Backups contain password hashes and user data: keep `backups/` and `.env` private and do not submit or share them.

## Project layout

```
orbit                 control script (setup/up/down/status/backup/restore/test…)
docker-compose.yml    the five services + private network + volumes
caddy/                gateway image: Caddyfile (TLS + reverse proxy) baked in
branding/              logo + welcome files for new clients
tests/file-ops.sh     end-to-end test: auth, ADD/UPDATE/DOWNLOAD/DELETE, isolation, sharing, trash, quota
tools/                diagram, screenshot, report and video generators
Video/                step-by-step guide for opening the cloud on an Android phone (MP4)
docs/                 architecture & request-flow diagrams, screenshots, report
```

## Troubleshooting

- **"Access through untrusted domain"** — you used a name/IP not in the list. Add it to `ORBIT_EXTRA_HOSTS` in `.env` and run `./orbit up`.
- **Other devices can't connect** — check the server's firewall allows incoming connections to Docker, that both devices are on the same network, and that the server's IP hasn't changed (`./orbit urls`; `./orbit up` refreshes it).
- **Port 8443 busy** — change `HTTPS_PORT` in `.env`.
- **First start is slow or fails during download** — re-run `./orbit up`; finished downloads are kept.
