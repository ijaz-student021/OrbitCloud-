#!/usr/bin/env python3
"""Generate the ORBIT CLOUD diagrams (SVG) for Question 3.

    python3 tools/make_diagrams.py        # writes docs/architecture.svg + docs/request-flow.svg

Then tools/render.sh converts them to PNG with headless Chrome.
Everything is plain SVG so the diagrams stay editable and crisp at any size.
"""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "docs")
FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

# palette ---------------------------------------------------------------
INK, MUTED, LINE = "#1B1F3B", "#5B6178", "#C9CDE0"
BRAND, BRAND_L = "#3B3FD8", "#ECEDFF"
DATA, DATA_L = "#0B8F7F", "#E1F5F2"
ADMIN, ADMIN_L = "#B45309", "#FDF1E3"
GREY_L, GREY_M = "#F5F6FA", "#EAECF4"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size=14, weight=400, fill=INK, anchor="start", extra=""):
    return (f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" {extra}>{esc(s)}</text>')


def rect(x, y, w, h, fill="#fff", stroke=LINE, rx=12, sw=1.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"{d}/>')


def line(x1, y1, x2, y2, color=INK, sw=2.2, both=False, dash=None, marker=True):
    m = f' marker-end="url(#arr-{color[1:]})"' if marker else ""
    if both and marker:
        m += f' marker-start="url(#arrs-{color[1:]})"'
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{sw}"{d}{m}/>')


def badge(x, y, n, color=BRAND):
    return (f'<circle cx="{x}" cy="{y}" r="13" fill="{color}"/>'
            + text(x, y + 5, str(n), 14, 700, "#fff", "middle"))


def card(x, y, w, h, title, sub, lines, color, light, sub_size=13):
    out = [rect(x, y, w, h, "#fff", color, 12, 2),
           f'<path d="M{x} {y+12} a12 12 0 0 1 12 -12 h{w-24} a12 12 0 0 1 12 12 v22 h-{w} z" fill="{color}"/>',
           text(x + 14, y + 23, title, 13.5, 700, "#fff", extra='letter-spacing="0.4"'),
           text(x + 14, y + 58, sub, sub_size, 700, INK)]
    for i, ln in enumerate(lines):
        out.append(text(x + 14, y + 80 + i * 20, ln, 12.5, 400, MUTED))
    return "\n".join(out)


def cylinder(x, y, w, h, color, light):
    ry = 16
    return "\n".join([
        f'<path d="M{x} {y+ry} v{h-2*ry} a{w/2} {ry} 0 0 0 {w} 0 v-{h-2*ry}" fill="{light}" stroke="{color}" stroke-width="2"/>',
        f'<ellipse cx="{x+w/2}" cy="{y+ry}" rx="{w/2}" ry="{ry}" fill="{light}" stroke="{color}" stroke-width="2"/>',
    ])


def svg_open(w, h):
    markers = []
    for c in (INK, BRAND, DATA, ADMIN, MUTED):
        k = c[1:]
        markers.append(f'<marker id="arr-{k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
                       f'<path d="M0 0 L10 5 L0 10 z" fill="{c}"/></marker>')
        markers.append(f'<marker id="arrs-{k}" viewBox="0 0 10 10" refX="1.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
                       f'<path d="M10 0 L0 5 L10 10 z" fill="{c}"/></marker>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'font-family="{FONT}"><defs>{"".join(markers)}</defs>'
            f'<rect width="{w}" height="{h}" fill="#ffffff"/>')


# ═════════════════════════════════════════════════════════════════════════
# Diagram 1 — architecture
# ═════════════════════════════════════════════════════════════════════════
def architecture():
    W, H = 1600, 1110
    s = [svg_open(W, H)]
    s.append(text(40, 56, "ORBIT CLOUD", 32, 800, BRAND)
             + text(292, 56, "System architecture — how the cloud works", 24, 400, INK))
    s.append(text(40, 86, "A private cloud for storing files: ADD · UPDATE · DOWNLOAD · DELETE from home, office or mobile, over encrypted HTTPS.", 15, 400, MUTED))

    # clients -----------------------------------------------------------
    s.append(rect(40, 120, 970, 150, GREY_L, LINE, 14))
    s.append(text(60, 146, "CLIENTS  —  the people who use the cloud", 12.5, 700, MUTED, extra='letter-spacing="0.8"'))
    for x, icon, ttl, l1, l2 in [
        (60, "🏠", "Home", "Laptop or phone", "Web browser · desktop app"),
        (375, "🏢", "Office", "Desktop PC", "Web browser · sync client"),
        (690, "📱", "On the move", "Mobile / tablet", "Nextcloud app (WebDAV)"),
    ]:
        s.append(rect(x, 160, 290, 90, "#fff", LINE, 12))
        s.append(text(x + 18, 214, icon, 34))
        s.append(text(x + 72, 192, ttl, 17, 700))
        s.append(text(x + 72, 214, l1, 13, 400, INK))
        s.append(text(x + 72, 233, l2, 12.5, 400, MUTED))
    for x in (205, 520, 835):
        s.append(line(x, 250, x, 298, BRAND))

    # network -----------------------------------------------------------
    s.append(rect(40, 300, 970, 72, GREY_M, "#B9BED6", 36))
    s.append(text(525, 330, "NETWORK  —  home Wi-Fi · office LAN · Internet (VPN / tunnel)", 15, 700, INK, "middle"))
    s.append(text(525, 354, "every request is encrypted with HTTPS (TLS) and enters through ONE port: 8443", 13, 400, MUTED, "middle"))
    s.append(badge(545, 275, 1))

    # provider host -----------------------------------------------------
    s.append(rect(40, 412, 1010, 640, "#FBFBFF", BRAND, 16, 2.5))
    s.append(text(545, 438, "PROVIDER'S SERVER  —  your computer + Docker  (virtualisation = IaaS layer)", 14, 700, BRAND, "middle"))
    s.append(rect(60, 452, 970, 560, "none", "#8A90B0", 12, 1.6, "7 6"))
    s.append(text(1018, 474, "private network  orbit-net · 172.30.77.0/24  —  not reachable from outside", 12, 400, MUTED, "end"))

    s.append(line(205, 372, 205, 508, BRAND))
    s.append(badge(228, 400, 2))
    s.append(text(248, 405, "HTTPS", 12, 700, BRAND))

    # gateway
    s.append(card(80, 510, 250, 190, "GATEWAY  ·  orbit-gateway", "Caddy 2  (reverse proxy)",
                  ["• Terminates HTTPS / TLS", "• Certificate from private CA", "• Checks the host name", "• Forwards to the app", "• Only published port: 8443"],
                  BRAND, BRAND_L))
    # app
    s.append(card(400, 496, 340, 250, "APPLICATION  ·  orbit-app   (SaaS)", "Nextcloud 34  (Apache + PHP)",
                  ["• Web portal + WebDAV file API", "• Login, sessions, brute-force guard", "• ADD · UPDATE · DOWNLOAD · DELETE", "• Sharing & permissions", "• Versions + trash bin (undo)", "• Per-client storage quota (metering)"],
                  BRAND, BRAND_L))
    # cron
    s.append(card(80, 752, 250, 100, "WORKER  ·  orbit-cron", "Background jobs",
                  ["clean-up · trash expiry · indexing"], BRAND, BRAND_L))
    # db, cache
    s.append(card(800, 496, 210, 170, "DATABASE  ·  orbit-db", "PostgreSQL 17",
                  ["• users & password hashes", "• file index / metadata", "• shares, quotas", "volume: orbit_db"], DATA, DATA_L))
    s.append(card(800, 696, 210, 130, "CACHE  ·  orbit-cache", "Redis 7",
                  ["• file locks (no clashes)", "• fast session cache"], DATA, DATA_L))

    # file storage cylinder
    s.append(cylinder(440, 806, 260, 150, DATA, DATA_L))
    s.append(text(570, 862, "FILE STORAGE", 14, 700, DATA, "middle", 'letter-spacing="0.6"'))
    s.append(text(570, 884, "Docker volume  orbit_data", 13, 700, INK, "middle"))
    s.append(text(570, 905, "documents · photos · versions · trash", 12.5, 400, MUTED, "middle"))

    # arrows inside
    s.append(line(330, 612, 398, 612, BRAND))
    s.append(badge(364, 590, 3))
    s.append(line(742, 560, 798, 560, DATA, both=True))
    s.append(badge(770, 538, 4, DATA))
    s.append(line(742, 730, 798, 730, DATA, both=True))
    s.append(line(570, 748, 570, 804, DATA, both=True))
    s.append(badge(594, 778, 5, DATA))
    s.append(line(330, 810, 442, 880, DATA, sw=1.8, dash="6 5"))
    s.append(text(340, 874, "housekeeping", 11.5, 400, MUTED))

    s.append(text(545, 1034, "Docker volumes keep the data safe when containers restart:  orbit_data · orbit_db · orbit_html", 12.5, 400, MUTED, "middle"))

    # steps panel ------------------------------------------------------
    s.append(rect(1120, 120, 440, 292, "#fff", LINE, 14))
    s.append(text(1140, 146, "WHAT HAPPENS ON ONE REQUEST   (e.g. upload report.pdf)", 12.5, 700, MUTED, extra='letter-spacing="0.6"'))
    steps = [
        ("1", BRAND, ["The client (browser / app) sends the request", "and the user's login."]),
        ("2", BRAND, ["It crosses Wi-Fi / LAN / Internet, encrypted (TLS),", "and reaches the gateway."]),
        ("3", BRAND, ["The gateway decrypts it and forwards it to the", "app inside the private network."]),
        ("4", DATA, ["The app checks login, permission and quota", "(PostgreSQL) and locks the file (Redis)."]),
        ("5", DATA, ["The app reads / writes / deletes the file in the", "data volume; versions & trash keep the old copy."]),
        ("6", BRAND, ["The answer (201 / 204 / 200) returns the same way."]),
    ]
    y = 174
    for n, col, ls in steps:
        s.append(badge(1148, y - 5, n, col))
        for i, ln in enumerate(ls):
            s.append(text(1172, y + i * 16, ln, 12.8, 400, INK))
        y += 16 * len(ls) + 12

    # admin panel ------------------------------------------------------
    s.append(rect(1120, 442, 440, 206, ADMIN_L, ADMIN, 14, 2))
    s.append(text(1140, 470, "PROVIDER / ADMINISTRATOR  —  the cloud operator", 12.5, 700, ADMIN, extra='letter-spacing="0.6"'))
    for i, ln in enumerate(["• Admin web portal: create clients, set quotas, install apps",
                            "• ./orbit up · down · status · test · backup",
                            "• occ command line for automation & maintenance",
                            "• Clients are isolated: each sees only their own files",
                            "• Secrets live in .env (permissions 600), never in code"]):
        s.append(text(1140, 502 + i * 26, ln, 12.8, 400, INK))
    s.append(line(1120, 545, 1052, 545, ADMIN))
    s.append(text(1086, 534, "manages", 11, 700, ADMIN, "middle"))

    # backup panel -----------------------------------------------------
    s.append(rect(1120, 680, 440, 206, "#fff", ADMIN, 14, 2))
    s.append(text(1140, 708, "BACKUP SERVICE   ./orbit backup  ·  ./orbit restore", 12.5, 700, ADMIN, extra='letter-spacing="0.6"'))
    for i, ln in enumerate(["1  pause writes (maintenance mode)",
                            "2  pg_dump the database  →  database.dump",
                            "3  archive all files  →  files.tar.gz",
                            "4  checksums  →  SHA256SUMS (verified on restore)",
                            "Saved in  backups/<date-time>/  — disaster recovery"]):
        s.append(text(1140, 740 + i * 28, ln, 12.8, 400 if i < 4 else 700, INK if i < 4 else ADMIN))
    s.append(line(1052, 783, 1120, 783, ADMIN, both=True))
    s.append(text(1086, 772, "backup", 11, 700, ADMIN, "middle"))

    # legend -----------------------------------------------------------
    lx = 60
    for col, lab in [(BRAND, "Access & application layer"), (DATA, "Data layer (stateful)"), (ADMIN, "Provider operations")]:
        s.append(f'<rect x="{lx}" y="1072" width="16" height="16" rx="4" fill="{col}"/>')
        s.append(text(lx + 24, 1085, lab, 12.5, 400, MUTED))
        lx += 240
    s.append(text(1560, 1085, "Cloud model:  SaaS (Nextcloud)  ·  IaaS (Docker host, network, volumes)  ·  DBaaS (PostgreSQL)", 12.5, 400, MUTED, "end"))
    s.append("</svg>")
    return "\n".join(s)


# ═════════════════════════════════════════════════════════════════════════
# Diagram 2 — request lifecycle (sequence)
# ═════════════════════════════════════════════════════════════════════════
def sequence():
    W, H = 1600, 1215
    s = [svg_open(W, H)]
    s.append(text(40, 56, "ORBIT CLOUD", 32, 800, BRAND)
             + text(292, 56, "Request lifecycle — ADD · UPDATE · DOWNLOAD · DELETE", 24, 400, INK))
    s.append(text(40, 86, "The order of events when a client works on a file. Time flows downward.", 15, 400, MUTED))

    cols = [("Client", "home / office / mobile", 150, GREY_M, INK),
            ("Gateway", "Caddy · HTTPS", 450, BRAND, "#fff"),
            ("Application", "Nextcloud", 760, BRAND, "#fff"),
            ("Cache", "Redis", 1010, DATA, "#fff"),
            ("Database", "PostgreSQL", 1240, DATA, "#fff"),
            ("File storage", "volume orbit_data", 1470, DATA, "#fff")]
    top, bottom = 120, 1175
    for name, sub, x, fill, fg in cols:
        s.append(rect(x - 95, top, 190, 56, fill, fill if fill != GREY_M else "#B9BED6", 12))
        s.append(text(x, top + 25, name, 15.5, 700, fg, "middle"))
        s.append(text(x, top + 44, sub, 11.5, 400, fg if fill != GREY_M else MUTED, "middle"))
        s.append(f'<line x1="{x}" y1="{top+56}" x2="{x}" y2="{bottom}" stroke="#B9BED6" stroke-width="1.6" stroke-dasharray="5 6"/>')
    X = {c[0]: c[2] for c in cols}

    def band(y, h, label, color, light):
        return (rect(30, y, 1540, h, light, "none", 10, 0)
                + text(48, y + 22, label, 13, 700, color, extra='letter-spacing="0.8"'))

    def msg(y, a, b, label, color=INK, note=None, dashed=False, n=None):
        x1, x2 = X[a], X[b]
        d = 7 if x2 > x1 else -7
        out = [line(x1 + (d if True else 0) * 0, y, x2 - d, y, color, 2, dash="6 5" if dashed else None)]
        mid = (x1 + x2) / 2
        out.append(text(mid, y - 9, label, 12.8, 600 if not dashed else 400, color if not dashed else MUTED, "middle"))
        if note:
            out.append(text(mid, y + 17, note, 11.5, 400, MUTED, "middle"))
        if n is not None:
            out.append(badge(min(x1, x2) - 0 + 0, y, n, color) if False else "")
        return "\n".join(out)

    y = 205
    # ---- ADD / UPDATE
    s.append(band(y, 442, "A   ADD  /  UPDATE   (upload a file)", BRAND, "#F3F4FF"))
    y += 52
    s.append(msg(y, "Client", "Gateway", "PUT /remote.php/dav/files/office/report.pdf", INK, "HTTPS (TLS) + username & password"))
    y += 46
    s.append(msg(y, "Gateway", "Application", "forward request", BRAND, "plain HTTP inside the private network"))
    y += 46
    s.append(msg(y, "Application", "Database", "who is this user? may they write? quota left?", DATA))
    y += 38
    s.append(msg(y, "Database", "Application", "OK — 9.8 GB free", DATA, dashed=True))
    y += 40
    s.append(msg(y, "Application", "Cache", "lock the file path", DATA))
    y += 40
    s.append(msg(y, "Application", "File storage", "write report.pdf   (UPDATE: old copy moved to versions)", DATA))
    y += 40
    s.append(msg(y, "Application", "Database", "save metadata: size · owner · etag · time", DATA))
    y += 38
    s.append(msg(y, "Application", "Cache", "release the lock", DATA, dashed=True))
    y += 40
    s.append(msg(y, "Application", "Gateway", "201 Created   (204 if it replaced a file)", BRAND, dashed=True))
    y += 36
    s.append(msg(y, "Gateway", "Client", "201 Created  ✔  file is now in the cloud", INK, dashed=True))

    # ---- DOWNLOAD
    y = 668
    s.append(band(y, 218, "B   DOWNLOAD   (fetch a file)", DATA, "#EEF9F7"))
    y += 52
    s.append(msg(y, "Client", "Application", "GET /…/report.pdf    (via Gateway, HTTPS)", INK))
    y += 40
    s.append(msg(y, "Application", "Database", "is this user allowed to read it?", DATA))
    y += 38
    s.append(msg(y, "Database", "Application", "yes", DATA, dashed=True))
    y += 38
    s.append(msg(y, "File storage", "Application", "read file bytes", DATA, dashed=True))
    y += 40
    s.append(msg(y, "Application", "Client", "200 OK + file content   (identical bytes — verified by SHA-256 in ./orbit test)", INK, dashed=True))

    # ---- DELETE
    y = 910
    s.append(band(y, 240, "C   DELETE   (remove a file — recoverable)", ADMIN, "#FEF6EC"))
    y += 52
    s.append(msg(y, "Client", "Application", "DELETE /…/report.pdf    (via Gateway, HTTPS)", INK))
    y += 42
    s.append(msg(y, "Application", "File storage", "move file to the trash bin (not erased yet)", DATA))
    y += 40
    s.append(msg(y, "Application", "Database", "mark as deleted · record in trash table", DATA))
    y += 40
    s.append(msg(y, "Application", "Client", "204 No Content  ✔   (restore any time before the trash expires)", INK, dashed=True))
    y += 40
    s.append(text(48, y + 8, "Behind the scenes:  orbit-cron later empties expired trash and old versions  ·  ./orbit backup protects everything in all three steps.", 12.5, 400, MUTED))
    s.append("</svg>")
    return "\n".join(s)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (("architecture", architecture), ("request-flow", sequence)):
        path = os.path.join(OUT, f"{name}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(fn())
        print("wrote", os.path.abspath(path))
