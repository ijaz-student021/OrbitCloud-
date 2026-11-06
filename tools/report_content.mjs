// Report content for Assignment No-3 (OWN CLOUD) — one source, rendered to DOCX and PDF.
// Inline markup:  **bold**   `code`
// Facts that depend on the live cloud (versions, test results, screenshots) are passed in
// from make_report.mjs so the report never claims anything that was not actually observed.

export function buildReport(f) {
  const B = [];
  let fig = 0;
  const h1 = (text) => B.push({ t: 'h1', text });
  const h2 = (text) => B.push({ t: 'h2', text });
  const p = (text) => B.push({ t: 'p', text });
  const ul = (items) => B.push({ t: 'ul', items });
  const ol = (items) => B.push({ t: 'ol', items });
  const code = (text) => B.push({ t: 'code', text });
  const note = (text) => B.push({ t: 'callout', text });
  const table = (widths, head, rows, opts = {}) => B.push({ t: 'table', widths, head, rows, ...opts });
  const pb = () => B.push({ t: 'pagebreak' });
  const section = (o) => B.push({ t: 'section', o });
  const img = (file, caption, widthPct = 76) => {
    if (!file) return;
    fig += 1;
    B.push({ t: 'img', file, caption: `Figure ${fig} — ${caption}`, widthPct });
  };
  const S = f.shots;

  // ── Cover ────────────────────────────────────────────────────────────────
  B.push({
    t: 'cover',
    course: 'Cloud Computing',
    title: 'Assignment No-3 (OWN CLOUD)',
    cloud: f.cloudName,
    slogan: f.slogan,
    date: f.date,
    student: f.studentName, regNo: f.regNo, enrolment: f.enrolment, groupNo: f.groupNo, instructor: f.instructor,
  });
  pb();

  // ── Summary ──────────────────────────────────────────────────────────────
  h1('Summary');
  p(`This assignment builds a working private cloud named **${f.cloudName}**. Clients store files in it and can **ADD, UPDATE, DOWNLOAD and DELETE** them from home, from the office or from a phone, through a web browser, a desktop/mobile app or any WebDAV client, over encrypted HTTPS.`);
  table([30, 70], ['Question', 'Answer in one line'], [
    ['Q1  Tool', `**Nextcloud ${f.ncVersion}** (open-source private-cloud platform) running on **Docker Compose**, chosen after comparing seven tools.`],
    ['Q2  Own cloud', `**${f.cloudName}**: gateway + application + database + cache + background worker, a provider account and two client accounts (home, office) with storage quotas, version history, trash bin and backups.`],
    ['Q3  Diagram', 'An architecture diagram (Figure A) and a request-lifecycle diagram (Figure B) show how a request travels through the cloud.'],
    ['Evidence', `${f.testSummary} in the automated test; backup and restore proven by recovering a permanently deleted file.`],
  ], { firstColBold: true });

  // ── Question 1 ───────────────────────────────────────────────────────────
  h1('Question 1 — Tool to create the cloud');
  h2('1.1  What the tool must do');
  p('Question 2 asks for a cloud that the owner can reach from home or the office and use to download, delete, add and update files, offering services that cloud providers give to clients. So the tool must:');
  ul([
    'store **real files** for **separate user accounts** (a provider and clients), not only simulate load;',
    'be reachable over a **network** through a web interface and standard protocols;',
    'run on **one ordinary computer**, quick to deploy, with **our own name and branding** (the “TIGER CLOUD” idea of the question).',
  ]);

  h2('1.2  Tools compared');
  table([15, 30, 35, 20], ['Tool', 'What it is', 'Fit for this assignment', 'Verdict'], [
    ['**Nextcloud**', 'Open-source, self-hosted file storage, sync and sharing platform (web, desktop, mobile, WebDAV).', 'Real uploads/downloads, accounts, quotas, versions, trash, sharing, theming. Runs on one machine.', '**Selected**'],
    ['ownCloud', 'Older project from which Nextcloud was forked (2016); same idea.', 'Would work, but a smaller feature and app ecosystem.', 'Alternative'],
    ['Seafile', 'File sync and share server focused on speed.', 'Good for files; fewer built-in cloud-style management features.', 'Alternative'],
    ['OpenStack', 'Full IaaS cloud (compute, network, storage, identity) — studied in Assignment 1.', 'Needs several servers/VMs and a lot of RAM; far more than one laptop can host comfortably.', 'Too heavy'],
    ['CloudSim', 'Java simulator of data centres, VMs and schedulers.', 'Simulates behaviour only — no real files, no users, no remote access.', 'Cannot meet Q2'],
    ['LocalStack', 'Local emulator of AWS APIs (S3, etc.) for developers.', 'API-only, no end-user portal; imitates AWS rather than being our own named cloud.', 'Not suitable'],
    ['MinIO', 'S3-compatible object storage server.', 'Strong storage engine, but a building block, not a ready cloud for end users.', 'Not suitable'],
  ]);

  h2('1.3  Decision');
  p(`**Nextcloud ${f.ncVersion}** was selected because it is the only option that satisfies every requirement at once: real file operations, accounts and quotas, a web portal plus mobile/desktop apps, custom branding, and light enough to run on one computer. It is also widely used in practice, so the skills transfer.`);

  h2('1.4  Supporting tools');
  table([22, 78], ['Tool', 'Why it is used'], [
    ['Docker + Docker Compose', 'Virtualisation at operating-system level. The whole cloud is described in one file (`docker-compose.yml`) and can be built, stopped, moved or rebuilt with one command.'],
    ['PostgreSQL 17', 'Database service holding users, file index, shares and quotas (more robust than the default SQLite).'],
    ['Redis 7', 'Cache and file-locking service so two clients cannot corrupt the same file.'],
    ['Caddy 2', 'Gateway: terminates HTTPS with a certificate from a private certificate authority and forwards requests to the application.'],
  ], { firstColBold: true });

  // ── Question 2 ───────────────────────────────────────────────────────────
  h1(`Question 2 — Our own cloud: ${f.cloudName}`);
  h2('2.1  Identity of the cloud');
  p(`The cloud carries its own name, slogan, colour and logo (theme settings applied automatically at start-up): **${f.cloudName}** — “${f.slogan}”. The name is a single setting (\`CLOUD_NAME\` in \`.env\`), so it can be changed to the group’s own name at any time.`);
  img(S.login, `${f.cloudName} login page with its own name, logo and slogan.`, 78);
  p('The cloud has the two roles the question describes — a **provider** and **clients**:');
  table([22, 18, 60], ['Role', 'Account', 'Purpose'], [
    ['Provider (administrator)', f.adminUser, 'Runs the cloud: creates clients, sets quotas, monitors services.'],
    ['Client — home', f.homeUser, `Uses the cloud from home. Storage quota: **5 GB**.`],
    ['Client — office', f.officeUser, `Uses the cloud from the office. Storage quota: **10 GB**.`],
  ]);
  p('Passwords are generated randomly during set-up and kept only in a private `.env` file (permissions 600); they are not written in this report or in the source code.');

  img(S.admin_users, 'Provider view: the administrator sees every client account with its storage quota.', 100);
  h2('2.2  Services provided and how they relate to Assignment 1');
  p('Assignment 1 listed the building blocks of a cloud platform (OpenStack components, Docker and Compose, web/proxy servers, databases, SSL/TLS, quotas, backup tools). The cloud below is built from the same kinds of services, scaled to one machine:');
  table([24, 18, 14, 44], ['Service in the cloud', 'Technology', 'Model', 'Comparable service from Assignment 1'], [
    ['File storage & sharing (the main service)', 'Nextcloud Files', 'SaaS', 'OpenStack Swift (object storage) and Manila (shared file system)'],
    ['Web portal', 'Nextcloud web UI', 'SaaS', 'OpenStack Horizon (dashboard)'],
    ['Identity & access (accounts, groups, passwords)', 'Nextcloud users', '—', 'OpenStack Keystone (user management)'],
    ['Metering & quotas', 'Quota + usage report', '—', 'OpenStack Ceilometer (usage measurement); disk quota'],
    ['Database service', 'PostgreSQL 17', 'DBaaS', 'OpenStack Trove; PostgreSQL server'],
    ['Cache / locking service', 'Redis 7', '—', 'Redis server'],
    ['Virtual network', 'Docker network `orbit-net`', 'IaaS', 'OpenStack Neutron; Docker network basics'],
    ['Reverse proxy + TLS', 'Caddy 2', '—', 'OpenStack Octavia; Nginx reverse proxy; self-signed SSL/TLS'],
    ['Compute (virtualisation)', 'Docker containers', 'IaaS', 'OpenStack Nova; Docker'],
    ['Block storage', 'Docker volumes', 'IaaS', 'OpenStack Cinder; external storage for containers'],
    ['Images', 'Docker images', 'IaaS', 'OpenStack Glance'],
    ['Orchestration', 'Docker Compose', '—', 'OpenStack Heat; Docker Compose'],
    ['Backup & recovery', '`./orbit backup` / `restore`', '—', 'Cinder Backup; rsync'],
  ]);
  note('The comparison is by function: ORBIT CLOUD is not OpenStack, but a small private cloud that delivers the same kinds of services from one computer.');

  h2('2.3  How it was built');
  p('Everything is automated by one control script (`./orbit`) so the cloud can be rebuilt on any computer with Docker:');
  code(`./orbit setup        # create .env with random passwords
./orbit up           # download, install, brand, create clients and quotas
./orbit credentials  # show the logins
./orbit test         # prove ADD / UPDATE / DOWNLOAD / DELETE work`);
  p('What `./orbit up` does, step by step:');
  ol([
    'Detects the computer’s network address and lists every name the cloud will answer to.',
    'Starts five containers on a private network: **gateway**, **app**, **db**, **cache**, **cron**. Only the gateway publishes a port (8443); the database and cache are unreachable from outside.',
    'Waits until the database, cache and application report healthy.',
    'Applies the branding, enables background jobs, and trusts the gateway as a proxy.',
    'Removes the product-tour pop-up and installs ORBIT CLOUD’s own welcome files for new clients.',
    'Creates the group “Clients”, the two client accounts and their quotas.',
    'Exports the HTTPS root certificate so devices can trust the cloud.',
  ]);

  h2('2.4  Access from home or office');
  p('The cloud listens on HTTPS port 8443 of the server computer. Any device that can reach the server opens:');
  table([30, 70], ['From', 'Address'], [
    ['The server itself', `\`https://localhost:8443\``],
    ['Home or office (same Wi-Fi / LAN)', f.lanUrl ? `\`${f.lanUrl}\`` : '`https://<server-IP>:8443`'],
    ['Anywhere on the Internet', 'Through a private VPN or tunnel (e.g. Tailscale): add the VPN name to `ORBIT_EXTRA_HOSTS`, run `./orbit up`, open `https://<vpn-name>:8443`.'],
    ['Android phone (e.g. Google Pixel)', 'Same Wi-Fi: open the address in Chrome, accept the one-time certificate notice, log in. Optionally install the Nextcloud app from Google Play and enter the same address.'],
  ]);
  p('The browser shows a certificate notice the first time, because the certificate comes from the cloud’s own certificate authority. `./orbit trust-ca` exports that certificate, and `./orbit share-ca` lets a phone download it over Wi-Fi, so each device can trust it once.');
  img(S.office_mobile, `Left: client “${f.officeUser}” signed in through the network address (${f.lanHost || 'LAN IP'}), the way an office device reaches the cloud. Right: the same cloud in a phone-sized window (mobile layout, emulated in the browser).`, 100);
  note('Scope of testing: access was verified through `localhost` and through the computer’s LAN address on this machine. A second physical device on the same network uses the identical LAN address; Internet access additionally needs the VPN/tunnel step above, which was documented but not exercised here.');

  h2('2.5  File operations: ADD, UPDATE, DOWNLOAD, DELETE');
  p('The four operations the question asks for were performed in two independent ways: through the **web interface** (screenshots below: ADD and DELETE were done by clicking in the browser) and through an **automated test** that talks to the cloud exactly as the desktop and mobile apps do (WebDAV over HTTPS, certificate verified).');
  h2('A.  ADD — upload a file');
  img(S.files_home, `Client “${f.homeUser}” signed in: the personal file area.`, 100);
  img(S.upload, 'ADD: a new file uploaded through the web interface appears in the list immediately.', 100);
  h2('B.  UPDATE — change a file (old version is kept)');
  p('Uploading new content under the same name replaces the file, and the cloud keeps the earlier copy in the version history so a mistake can be undone. Here the update was sent with the same WebDAV request the desktop and mobile apps use, and the web interface then shows the history.');
  img(S.versions, 'UPDATE: version history after the second upload — “Current version” (106 B, the new content) and “Initial version” (73 B, the original, still stored).', 100);
  h2('C.  DOWNLOAD — fetch a file');
  p('The automated test downloads each file and compares its SHA-256 checksum with the original; they were byte-identical (see Appendix B).');
  h2('D.  DELETE — remove a file (recoverable)');
  img(S.trash, 'DELETE: a removed file moves to “Deleted files” and can be restored until the trash expires.', 100);

  h2('2.6  Automated verification');
  p(`The test \`./orbit test\` acts as two clients: “${f.homeUser}” connects through \`localhost\`, and “${f.officeUser}” connects through the LAN address like a second device. Result: **${f.testSummary}**`);
  table([7, 93], ['Test', 'What was proved'], [
    ['1', 'Security: requests without credentials or with a wrong password are rejected (HTTP 401); valid credentials are accepted.'],
    ['2', 'ADD: a folder and a file are created and listed.'],
    ['3', 'DOWNLOAD: the file comes back byte-identical (SHA-256 match).'],
    ['3b', 'Isolation: the Office client cannot read, write, delete or list the Home client’s files (HTTP 404 / 404 / 404 / not listed); Home’s file is untouched afterwards.'],
    ['4', 'UPDATE: the new content is served, and the earlier version is stored and downloads byte-identical to the original upload.'],
    ['5', 'Large file: a 25 MB upload and download are byte-identical.'],
    ['6', 'SHARE: Home shares a file read-only with Office; Office downloads it from the LAN address, cannot modify it (HTTP 403), and loses access when the share is removed.'],
    ['7', 'DELETE: the file disappears (HTTP 404), appears in the trash bin, and is restored with the latest content.'],
    ['8', 'METERING: each client has a storage quota; used and available space are reported.'],
    ['9', 'Clean-up: test data and trash are removed.'],
  ]);

  h2('2.7  Security and reliability features');
  table([27, 73], ['Feature', 'How it is provided'], [
    ['Encryption in transit', 'All traffic uses HTTPS; the test connects with TLS 1.3 and verifies the certificate chain.'],
    ['Authentication', 'Every request needs a valid login; wrong or missing credentials get HTTP 401.'],
    ['Isolation between clients', 'Each client sees only their own files; sharing is explicit and permission-controlled. Tested: another client’s attempts to read, write, delete or list files all fail.'],
    ['Reduced attack surface', 'Only port 8443 is published; the database and cache live on the private `orbit-net` network.'],
    ['Secrets handling', 'Random passwords generated per installation, stored in `.env` with mode 600, never in code.'],
    ['Mistake recovery', 'Version history for updated files and a trash bin for deleted files.'],
    ['Consistency', 'Redis file locking and database transactions prevent two clients from corrupting one file.'],
    ['Backup & restore', f.backupLine],
    ['Metering', 'Per-client quotas (5 GB / 10 GB) and usage reports (`./orbit status`).'],
  ], { firstColBold: true });

  h2('2.8  Limitations and possible improvements');
  ul([
    '**Single server:** if the host computer is off, the cloud is unavailable (a cluster with replicated storage would remove this single point of failure).',
    '**Private certificate:** devices must trust the cloud’s certificate authority once; a public domain with a public certificate would remove the notice.',
    '**Internet access** needs a VPN or tunnel (opening router ports to the Internet is deliberately avoided). **Production hardening** would add two-factor authentication, HSTS, off-site backups and regular image updates.',
  ]);

  // ── Question 3 ───────────────────────────────────────────────────────────
  section('landscape');
  h1('Question 3 — Diagram of the cloud and how it works');
  h2('3.1  Architecture diagram');
  B.push({ t: 'img', file: f.diagrams.architecture, caption: 'Figure A — Architecture of ' + f.cloudName + ' and the path of one request (numbers 1–6).', maxWcm: 27, maxHcm: 16.2 });
  section('landscape');
  h2('3.2  Request lifecycle diagram');
  B.push({ t: 'img', file: f.diagrams.sequence, caption: 'Figure B — Order of events for ADD / UPDATE, DOWNLOAD and DELETE.', maxWcm: 27, maxHcm: 17 });
  section('portrait');
  h2('3.3  Reading the architecture diagram');
  table([8, 92], ['Step', 'What happens'], [
    ['1', 'A **client** (home laptop, office PC or phone) sends a request, for example “upload report.pdf”, together with the user’s login.'],
    ['2', 'The request crosses the **network** (home Wi-Fi, office LAN or a VPN) **encrypted with HTTPS**, and enters the provider’s server through the single published port 8443.'],
    ['3', 'The **gateway** (Caddy) decrypts it, checks the requested host name and forwards it to the application over the private network `orbit-net`.'],
    ['4', 'The **application** (Nextcloud) checks the login, the permissions and the quota in **PostgreSQL**, and locks the file in **Redis**.'],
    ['5', 'The application **adds, updates, reads or deletes** the file in the **data volume**; old versions and deleted files are kept for recovery, and the metadata is saved in PostgreSQL.'],
    ['6', 'The result (HTTP 201 / 204 / 200) returns along the same path to the client.'],
  ], { firstColBold: true });
  p('Besides the request path, the **cron** worker does housekeeping (expired trash, old versions, indexing), the **administrator** manages the cloud through the web portal and the `./orbit` script, and the **backup service** protects the database and files.');

  h2('3.4  Cloud characteristics demonstrated');
  table([26, 74], ['Characteristic (NIST)', 'Where it is visible in this cloud'], [
    ['On-demand self-service', 'Clients log in and manage files themselves; the provider creates a new client with a single command.'],
    ['Broad network access', 'Browser, desktop app, mobile app and WebDAV, from any network that can reach the server.'],
    ['Resource pooling', 'One server, database and storage pool shared by several isolated clients (multi-tenancy).'],
    ['Rapid elasticity', 'A client’s capacity changes instantly with one command (`occ user:setting <user> files quota "20 GB"`).'],
    ['Measured service', 'Per-client quota and usage reporting (`./orbit status`), like metering in a public cloud.'],
  ], { firstColBold: true });
  p('**Deployment model:** private cloud (hosted on our own hardware for our own users). **Service models used:** SaaS (file-storage application) running on an IaaS-style container platform, with a database service (DBaaS) behind it.');

  h2('3.5  Design trade-offs');
  table([30, 35, 35], ['Decision', 'Benefit', 'Cost'], [
    ['Private, self-hosted cloud', 'Full control and privacy; no subscription.', 'We maintain updates, backups and uptime.'],
    ['Containers instead of virtual machines', 'Light, quick to start, one-file description.', 'Weaker isolation than full VMs.'],
    ['Single host', 'Simple to build and explain.', 'Single point of failure (mitigated by backups).'],
    ['HTTPS-only gateway with a private CA', 'Encrypted, one controlled entry point.', 'Certificate must be trusted once per device.'],
    ['Nextcloud instead of custom code', 'Mature features: sharing, versions, apps.', 'Less freedom to change internals.'],
  ]);

  // ── Appendices ───────────────────────────────────────────────────────────
  pb();
  h1('Appendix A — Project contents');
  code(`Assignment3_ICC/
  Assignment3_ICC_Report.docx / .pdf   this report
  Q3_Diagrams/                         architecture + request-flow diagrams (PNG, SVG)
  Screenshots/                         screenshots used in the report
  Video/                               step-by-step video: opening the cloud on an Android phone
  VIVA_NOTES.md                        preparation notes for the viva
  docs/                                diagram sources, screenshots and test output
  README.md                            how to run the cloud
  orbit                                control script (setup, up, down, status, backup, restore, test)
  docker-compose.yml                   the five services, private network and volumes
  caddy/Caddyfile                      gateway configuration (HTTPS + reverse proxy)
  branding/                            logo and welcome files for new clients
  tests/file-ops.sh                    end-to-end ADD/UPDATE/DOWNLOAD/DELETE test
  tools/                               diagram and report generators`);
  h1('Appendix B — Output of `./orbit test`');
  p(`Captured on ${f.testDate}. A green tick marks each check that passed.`);
  code(f.testOutput || '(test output not available)');

  return B;
}
