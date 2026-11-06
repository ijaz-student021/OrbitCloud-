#!/usr/bin/env bash
# ORBIT CLOUD — end-to-end file-operation test.
#
# Acts as two real clients talking to the cloud over HTTPS (WebDAV + OCS APIs,
# the same protocols the desktop/mobile apps use):
#   • "home"   client connects through https://localhost
#   • "office" client connects through the machine's LAN address (a second device)
# The server certificate is VERIFIED against the cloud's own root CA.
#
# Covers: auth, ADD, LIST, DOWNLOAD, UPDATE (+versions), DELETE (+trash/restore),
#         large file, cross-client sharing with permissions, per-client quota.
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Run ./orbit setup && ./orbit up first"; exit 2; }
set -a; . ./.env; set +a

PORT="${HTTPS_PORT:-8443}"
CA="certs/orbit-root-ca.crt"
[ -f "$CA" ] || { echo "Missing $CA — run ./orbit up first"; exit 2; }
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
HOME_URL="https://localhost:${PORT}"
OFFICE_URL="https://${LAN_IP:-localhost}:${PORT}"
H_USER="$CLIENT_HOME_USER";   H_PASS="$CLIENT_HOME_PASSWORD"
O_USER="$CLIENT_OFFICE_USER"; O_PASS="$CLIENT_OFFICE_PASSWORD"

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0; CODE=""

ok()     { printf '  \033[32m✔\033[0m %s\n' "$1"; pass=$((pass+1)); }
bad()    { printf '  \033[31m✘\033[0m %s  (%s)\n' "$1" "${2:-}"; fail=$((fail+1)); }
step()   { printf '\n\033[1m%s\033[0m\n' "$1"; }
expect() { case "|$3|" in *"|$2|"*) ok "$1  [HTTP $2]";; *) bad "$1" "expected HTTP $3, got $2";; esac; }
same()   { if [ "$2" = "$3" ]; then ok "$1  [sha256 ${2:0:12}…]"; else bad "$1" "checksum differs"; fi; }
sha()    { shasum -a 256 "$1" | cut -d' ' -f1; }

# req USER PASS METHOD URL [curl args…]  → $CODE, body in $T/body (or in $OUT when set: OUT=file req …).
# Credentials go through a curl config on a pipe so they never appear in `ps`.
req() {
  local user="$1" pw="$2" method="$3" url="$4"; shift 4
  CODE="$(curl -sS --cacert "$CA" -K <(printf 'user = "%s:%s"\n' "$user" "$pw") \
          -X "$method" -o "${OUT:-$T/body}" -w '%{http_code}' "$@" "$url" 2>"$T/err")" || CODE="000"
}
anon() { CODE="$(curl -sS --cacert "$CA" -X "$1" -o "$T/body" -w '%{http_code}' "$2" 2>"$T/err")" || CODE="000"; }

DAV_H="$HOME_URL/remote.php/dav/files/$H_USER"
DAV_O="$OFFICE_URL/remote.php/dav/files/$O_USER"
TRASH_H="$HOME_URL/remote.php/dav/trashbin/$H_USER"
DIR="orbit-e2e"

printf '\n\033[1mORBIT CLOUD — end-to-end test\033[0m   %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
printf '  home   client → %s  (user: %s)\n' "$HOME_URL" "$H_USER"
printf '  office client → %s  (user: %s)\n' "$OFFICE_URL" "$O_USER"
TLS="$(curl -sv --cacert "$CA" -o /dev/null "$HOME_URL/status.php" 2>&1 | grep -m1 -E 'SSL connection using|TLSv1' | sed 's/^[*< ]*//')"
[ -z "$TLS" ] || printf '  transport     → %s\n' "$TLS"

# ── clean slate ──────────────────────────────────────────────────────────────
req "$H_USER" "$H_PASS" DELETE "$DAV_H/$DIR/"

step "1. Security — only authenticated clients get in"
anon PROPFIND "$DAV_H/"
expect "No credentials is rejected" "$CODE" "401"
req "$H_USER" "wrong-password" PROPFIND "$DAV_H/"
expect "Wrong password is rejected" "$CODE" "401"
req "$H_USER" "$H_PASS" PROPFIND "$DAV_H/" -H "Depth: 0"
expect "Home client logs in with valid credentials" "$CODE" "207"

step "2. ADD — upload a folder and a file from Home"
req "$H_USER" "$H_PASS" MKCOL "$DAV_H/$DIR/"
expect "Create folder '$DIR'" "$CODE" "201"
printf 'ORBIT CLOUD test file — version 1\nuploaded %s\n' "$(date)" > "$T/v1.txt"
req "$H_USER" "$H_PASS" PUT "$DAV_H/$DIR/hello.txt" --data-binary "@$T/v1.txt"
expect "Upload hello.txt" "$CODE" "201"
req "$H_USER" "$H_PASS" PROPFIND "$DAV_H/$DIR/" -H "Depth: 1"
if grep -q "hello.txt" "$T/body"; then ok "File appears in the folder listing"; else bad "listing" "hello.txt not found"; fi

step "3. DOWNLOAD — fetch it back and verify integrity"
OUT="$T/dl1.txt" req "$H_USER" "$H_PASS" GET "$DAV_H/$DIR/hello.txt"
expect "Download hello.txt" "$CODE" "200"
same "Downloaded copy is byte-identical to the original" "$(sha "$T/v1.txt")" "$(sha "$T/dl1.txt")"

step "3b. Isolation — one client cannot touch another client's files"
HOME_FILE="$HOME_URL/remote.php/dav/files/$H_USER/$DIR/hello.txt"
req "$O_USER" "$O_PASS" GET "$HOME_FILE"
expect "Office cannot READ Home's file" "$CODE" "403|404"
req "$O_USER" "$O_PASS" PUT "$HOME_URL/remote.php/dav/files/$H_USER/$DIR/intruder.txt" --data "intruder"
expect "Office cannot WRITE into Home's folder" "$CODE" "403|404"
req "$O_USER" "$O_PASS" DELETE "$HOME_FILE"
expect "Office cannot DELETE Home's file" "$CODE" "403|404"
req "$O_USER" "$O_PASS" PROPFIND "$HOME_URL/remote.php/dav/files/$H_USER/$DIR/" -H "Depth: 1"
if grep -q "hello.txt" "$T/body"; then bad "Office can list Home's files" "hello.txt visible"; else ok "Office cannot LIST Home's files"; fi
req "$H_USER" "$H_PASS" GET "$HOME_FILE"
expect "Home's file is untouched after the intrusion attempts" "$CODE" "200"

step "4. UPDATE — overwrite the file, old version is kept"
printf 'ORBIT CLOUD test file — version 2 (UPDATED)\nmodified %s\n' "$(date)" > "$T/v2.txt"
req "$H_USER" "$H_PASS" PUT "$DAV_H/$DIR/hello.txt" --data-binary "@$T/v2.txt"
expect "Upload new content over hello.txt" "$CODE" "204|201"
OUT="$T/dl2.txt" req "$H_USER" "$H_PASS" GET "$DAV_H/$DIR/hello.txt"
same "Download returns the NEW content" "$(sha "$T/v2.txt")" "$(sha "$T/dl2.txt")"
req "$H_USER" "$H_PASS" PROPFIND "$DAV_H/$DIR/hello.txt" -H "Depth: 0" \
    --data '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>'
FILEID="$(grep -o '<oc:fileid>[0-9]*' "$T/body" | head -1 | grep -o '[0-9]*$')"
VLIST="$HOME_URL/remote.php/dav/versions/$H_USER/versions/$FILEID"
req "$H_USER" "$H_PASS" PROPFIND "$VLIST" -H "Depth: 1"
VERSIONS="$(grep -o '<d:href>[^<]*' "$T/body" | sed 's|<d:href>||' | tail -n +2)"
FOUND=""; NV=0
for v in $VERSIONS; do
  OUT="$T/ver.dl" req "$H_USER" "$H_PASS" GET "$HOME_URL$v"
  [ "$CODE" = "200" ] || continue          # the newest list entry is the live file itself, not a stored copy
  NV=$((NV+1))
  [ "$(sha "$T/ver.dl")" = "$(sha "$T/v1.txt")" ] && FOUND=1
done
if [ -n "$FOUND" ]; then ok "Earlier version is kept: $NV stored version(s), and version 1 downloads byte-identical to the original upload"
else bad "version history" "no stored version matches the original upload ($NV found)"; fi

step "5. Large file — 25 MB round trip"
dd if=/dev/urandom of="$T/big.bin" bs=1048576 count=25 2>/dev/null
req "$H_USER" "$H_PASS" PUT "$DAV_H/$DIR/big.bin" --data-binary "@$T/big.bin"
expect "Upload 25 MB file" "$CODE" "201"
OUT="$T/big.dl" req "$H_USER" "$H_PASS" GET "$DAV_H/$DIR/big.bin"
same "25 MB download is byte-identical" "$(sha "$T/big.bin")" "$(sha "$T/big.dl")"

step "6. SHARE — Home shares a file read-only with Office (Office connects from another device)"
req "$H_USER" "$H_PASS" POST "$HOME_URL/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json" \
    -H "OCS-APIRequest: true" --data "path=/$DIR/hello.txt&shareType=0&shareWith=$O_USER&permissions=1"
expect "Create share Home → Office (read-only)" "$CODE" "200"
SHARE_ID="$(grep -o '"id":"[0-9]*"' "$T/body" | head -1 | grep -o '[0-9]*')"
OUT="$T/office.txt" req "$O_USER" "$O_PASS" GET "$DAV_O/hello.txt"
expect "Office client downloads the shared file via $OFFICE_URL" "$CODE" "200"
same "Office copy matches Home's latest version" "$(sha "$T/v2.txt")" "$(sha "$T/office.txt")"
req "$O_USER" "$O_PASS" PUT "$DAV_O/hello.txt" --data-binary "@$T/v1.txt"
expect "Office cannot modify a read-only share" "$CODE" "403"
[ -z "$SHARE_ID" ] || req "$H_USER" "$H_PASS" DELETE "$HOME_URL/ocs/v2.php/apps/files_sharing/api/v1/shares/$SHARE_ID?format=json" -H "OCS-APIRequest: true"
req "$O_USER" "$O_PASS" GET "$DAV_O/hello.txt"
expect "After un-sharing, Office loses access" "$CODE" "404"

step "7. DELETE — remove a file, then recover it from the trash bin"
req "$H_USER" "$H_PASS" DELETE "$DAV_H/$DIR/hello.txt"
expect "Delete hello.txt" "$CODE" "204"
req "$H_USER" "$H_PASS" GET "$DAV_H/$DIR/hello.txt"
expect "File is gone from the cloud" "$CODE" "404"
req "$H_USER" "$H_PASS" PROPFIND "$TRASH_H/trash" -H "Depth: 1"
ITEM="$(grep -o "trash/hello\.txt\.d[0-9]*" "$T/body" | head -1)"
if [ -n "$ITEM" ]; then ok "Deleted file is held in the trash bin ($ITEM)"; else bad "trash" "item not found"; fi
if [ -n "$ITEM" ]; then
  req "$H_USER" "$H_PASS" MOVE "$TRASH_H/$ITEM" -H "Destination: $TRASH_H/restore/hello.txt"
  expect "Restore hello.txt from trash" "$CODE" "201"
  OUT="$T/dl3.txt" req "$H_USER" "$H_PASS" GET "$DAV_H/$DIR/hello.txt"
  same "Restored file has the latest content" "$(sha "$T/v2.txt")" "$(sha "$T/dl3.txt")"
fi

step "8. Metering — each client has a storage quota"
req "$H_USER" "$H_PASS" PROPFIND "$DAV_H/" -H "Depth: 0" \
    --data '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:quota-used-bytes/><d:quota-available-bytes/></d:prop></d:propfind>'
USED="$(grep -o '<d:quota-used-bytes>[0-9]*' "$T/body" | grep -o '[0-9]*$')"
AVAIL="$(grep -o '<d:quota-available-bytes>[0-9-]*' "$T/body" | grep -o '[-0-9]*$')"
if [ -n "$USED" ] && [ -n "$AVAIL" ] && [ "$AVAIL" -gt 0 ]; then
  ok "Home quota: $((USED/1048576)) MB used, $((AVAIL/1048576)) MB still available (limit $(( (USED+AVAIL)/1073741824 )) GB)"
else bad "quota" "used='$USED' available='$AVAIL'"; fi

step "9. Cleanup"
req "$H_USER" "$H_PASS" DELETE "$DAV_H/$DIR/"
expect "Remove test folder" "$CODE" "204"
req "$H_USER" "$H_PASS" DELETE "$TRASH_H/trash"
expect "Empty trash" "$CODE" "204"

printf '\n\033[1mResult: %d passed, %d failed\033[0m\n\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
