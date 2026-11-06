# Viva notes — Assignment 3 (OWN CLOUD)

Your instructor will ask you to explain and demonstrate the cloud, so read this once end to end and run the demo twice before the viva.
"Simple words" lines are Roman Urdu summaries — the answer itself should be given in English.

---

## 1. Your 30-second introduction

> "My cloud is called **ORBIT CLOUD**. It is a private cloud that runs on my computer. I used **Nextcloud** as the cloud platform and **Docker Compose** to run it as five services: a gateway, the application, a database, a cache and a background worker. Clients log in over **HTTPS** from home or office and can **add, update, download and delete** files. Each client has a quota, deleted files go to a trash bin, updated files keep versions, and I can back everything up with one command."

**Simple words:** ORBIT CLOUD meri apni private cloud hai. Nextcloud platform hai, Docker mein 5 services chalti hain. Home/office se HTTPS ke zariye files add, update, download, delete hoti hain.

---

## 2. Live demo script (about 8 minutes)

Open Terminal and go to the folder first: `cd ~/Desktop/Assignment3_ICC` (if you see “no such file or directory: ./orbit”, you are not in this folder).

| # | Do this | Say this |
|---|---|---|
| 1 | `./orbit status` | "Five services are running and healthy. Only the gateway publishes a port, 8443." |
| 2 | `./orbit credentials`, then open the URL from `./orbit urls` | "This is the login of my cloud, with my own name and logo." |
| 3 | Log in as **home** → upload a file (drag and drop) | "**ADD** — the file is stored in the data volume and its details in PostgreSQL." |
| 4 | Upload the same file name again with new content (choose *replace*), open the file's **Versions** tab | "**UPDATE** — the new content replaces the old, and the old version is kept." |
| 5 | Click the file → download, open it | "**DOWNLOAD** — I get the same bytes back." |
| 6 | Delete the file → open **Deleted files** → restore it | "**DELETE** — it is not lost; it is in the trash and can be restored." |
| 7 | On the Pixel (same Wi-Fi): Chrome → `https://<IP from ./orbit urls>:8443` → Advanced → Proceed → log in as **office** | "**Home/office access** — same cloud, different place, different client, own files only." |
| 8 | Log in as **orbitadmin** → *Users* | "The provider sees all clients and their quotas — resource metering." |
| 9 | `./orbit test` | "An automated test proves all operations, with checksums, sharing, trash and quota." |
| 10 | Show `docs/architecture.png` | "This is how a request flows through the cloud." |

Phone help: watch `Video/ORBIT_CLOUD_Pixel7_Guide.mp4` once (about 3.5 minutes) — it shows every tap on the Pixel.

Tips: log in once before the viva so the certificate notice is already accepted (or run `./orbit trust-ca`). If the cloud is stopped, run `./orbit up` — it starts in about a minute once the images exist. Keep the laptop plugged in and awake.

---

## 3. Questions you may be asked

### A. About the assignment

**Q: Why did you choose Nextcloud?**
It stores real files, has accounts/quotas/versions/trash, a web portal and mobile apps, allows our own name and logo, and runs on one computer. OpenStack (Assignment 1) is a full IaaS and needs several servers; CloudSim only simulates; LocalStack imitates AWS for developers; MinIO is just storage. *(Simple words: Nextcloud sab requirements ek saath poori karta hai.)*

**Q: Did you write the cloud yourself?**
No — Nextcloud is open-source software. My work was designing the architecture, integrating the services (Docker Compose, PostgreSQL, Redis, Caddy), securing and branding it, automating set-up, backup and testing, and documenting it. Be honest about this; it is the correct answer.

**Q: Where is your cloud's name?**
"ORBIT CLOUD" — set in `.env` (`CLOUD_NAME`), applied as the Nextcloud theme, shown on the login page and header.

**Q: How do you access it from home / office?**
Browser or app → `https://<server-IP>:8443` on the same network. From anywhere: through a VPN such as Tailscale (add its name to `ORBIT_EXTRA_HOSTS`). I did not open router ports to the Internet because it is unsafe without hardening.

### B. Cloud concepts

**Q: IaaS, PaaS, SaaS — which is yours?**
The file-storage application is **SaaS** (clients just use it). It runs on a container platform that behaves like **IaaS** (compute = containers, network = `orbit-net`, storage = volumes). PostgreSQL is a database service (**DBaaS**). It is a **private cloud** deployment.

**Q: What are the cloud characteristics (NIST) in your cloud?**
On-demand self-service (clients log in and manage files), broad network access (browser/app/WebDAV), resource pooling (many clients on one server, isolated), rapid elasticity (change a quota with one command), measured service (quota and usage reports).

**Q: How is it related to what you studied in Assignment 1?**
Same kinds of services at small scale: Keystone ≈ user accounts, Swift/Manila ≈ file storage, Horizon ≈ web portal, Neutron ≈ Docker network, Octavia/Nginx proxy ≈ Caddy gateway, Cinder ≈ Docker volumes, Heat ≈ Docker Compose, Ceilometer ≈ quota/usage, Trove ≈ PostgreSQL, Redis, self-signed SSL/TLS, rsync/backup. *(It is "comparable", not the same software.)*

**Q: Public vs private cloud — why private?**
Full control and privacy, no subscription, good for learning. Cost: we maintain it, and it is a single server.

### C. Technical

**Q: In the Versions tab I see "Current version" and "Initial version" — why?**
The list always shows the live file as the newest entry ("Current version") followed by the stored older copies. After one update there is exactly one stored older version (the "Initial version"). In the automated test I download that older version and compare its checksum with the original upload.

**Q: What is Docker and Docker Compose?**
Docker runs applications in isolated **containers** that share the host's kernel (lighter than VMs). **Compose** describes several containers, their network and volumes in one file (`docker-compose.yml`) and starts them together. *(On a Mac, Docker Desktop runs a small Linux VM and the containers run inside it.)*

**Q: Explain each service.**
- **gateway (Caddy):** the only door. Decrypts HTTPS, forwards to the app.
- **app (Nextcloud):** login, file API (WebDAV), sharing, versions, trash, quotas, web portal.
- **db (PostgreSQL):** users, file index (metadata), shares, quotas.
- **cache (Redis):** file locks and fast cache, so two clients cannot corrupt a file.
- **cron:** background jobs — clean expired trash/versions, indexing.

**Q: Where are the files physically stored?**
In the Docker volume `orbit_data` (inside Docker's storage on this computer). The database is in `orbit_db`. Volumes survive container restarts.

**Q: What happens when I upload a file?** *(see `docs/request-flow.png`)*
Client → HTTPS → gateway → app. The app checks login/permission/quota in PostgreSQL, locks the path in Redis, writes the file to the volume (the old copy goes to versions), saves metadata in PostgreSQL, releases the lock and answers 201 (new) or 204 (replaced).

**Q: How is UPDATE different from ADD?**
Same request (HTTP PUT). If the name exists, the old content is moved to the version history, the new content replaces it, and the server answers 204 instead of 201.

**Q: What happens on DELETE?**
The file moves to the trash bin (still recoverable) and is only erased after the trash retention expires or the user empties it. The cron worker does the clean-up.

**Q: What is HTTPS/TLS and the "certificate warning"?**
TLS encrypts traffic so passwords and files cannot be read on the network. The certificate comes from the cloud's own private certificate authority (Caddy's internal CA), which browsers do not know yet → warning. `./orbit trust-ca` exports the CA certificate so a device can trust it once. A public domain would use a public CA (e.g. Let's Encrypt) and show no warning.

**Q: What is a reverse proxy?**
A server in front of the application that receives all requests and forwards them. Benefits: one controlled entry point, TLS in one place, hides internal services.

**Q: Why PostgreSQL and Redis (not the defaults)?**
SQLite (Nextcloud's default) is for tiny single-user installs; PostgreSQL handles many users safely. Redis provides fast caching and file locking.

**Q: What is WebDAV?**
An extension of HTTP for managing remote files (PUT = upload, GET = download, DELETE = delete, PROPFIND = list). Desktop and mobile apps use it, and so does my automated test.

**Q: How do quotas work / how do you add a client?**
`docker compose exec -u www-data app php occ user:add --display-name "Name" username` and `occ user:setting username files quota "20 GB"`. Or through the admin web portal → Users.

**Q: How is it secured?**
HTTPS only; login required (401 otherwise); only port 8443 is exposed, the database and cache are on a private network; random passwords stored in `.env` with permissions 600; clients are isolated; versions and trash protect against mistakes.

**Q: Backup and restore?**
`./orbit backup` puts the cloud in maintenance mode, dumps the database (`pg_dump`), archives the files, writes SHA-256 checksums, and turns maintenance off — saved in `backups/<date-time>/`. `./orbit restore` verifies the checksums first.

**Q: What are the limitations?**
Single server (if my computer is off, the cloud is off), private certificate, Internet access needs a VPN, and production would add 2-factor authentication, HSTS, off-site backups and updates.

**Q: How would you scale it?**
Move storage to shared/object storage, put several app containers behind the gateway (sessions and locks are already in Redis), and replicate PostgreSQL. In a real provider this is what Kubernetes/OpenStack do.

**Q: What does `./orbit up` do?**
Detects the network address, starts the five containers, waits until they are healthy, applies branding, configures the proxy and trusted names, creates the clients and quotas, exports the HTTPS certificate.

**Q: How did you test it?**
`./orbit test` plays two clients (home via localhost, office via the LAN address) and checks: wrong/no password rejected; ADD; DOWNLOAD with SHA-256 comparison; UPDATE with version history; 25 MB file; read-only share between clients; DELETE with trash restore; quota reporting. Results are in Appendix B of the report.

---

## 4. If something goes wrong in the viva

| Problem | Fix |
|---|---|
| Page does not open | `./orbit status`; if stopped, `./orbit up` |
| Certificate warning | Click *Advanced → Continue* (explain the private CA) or run `./orbit trust-ca` |
| "Access through untrusted domain" | You used a new IP/name → `./orbit up` refreshes it (or add it to `ORBIT_EXTRA_HOSTS`) |
| Forgot a password | `./orbit credentials` |
| Phone cannot connect | Same Wi-Fi? Mac awake and Docker open? Wi-Fi may block device-to-device traffic → turn on the **Pixel hotspot**, join the Mac to it, run `./orbit up`, then use the new address from `./orbit urls` |
| Remove the Chrome warning on the Pixel | `./orbit share-ca`, open the printed address on the phone, install the certificate (Settings → Security & privacy → More security & privacy → Encryption & credentials → Install a certificate → CA certificate) |
| Wi-Fi is bad | Demo on `https://localhost:8443` — it needs no network |
