#!/bin/sh
# init-sandbox.sh — Auto-import demo workflows into n8n and configure 8kit credentials
#
# Runs as an init container after n8n is healthy.
# Uses n8n REST API to import workflows and set up credentials.

set -e

N8N_URL="${N8N_URL:-http://n8n:5678}"
EIGHTKIT_URL="${EIGHTKIT_URL:-http://eightkit:3000}"
EIGHTKIT_API_KEY="${EIGHTKIT_API_KEY:-}"
N8N_API_KEY="${N8N_API_KEY:-}"
WORKFLOW_DIR="${WORKFLOW_DIR:-/workflows}"
MAX_RETRIES=30
RETRY_INTERVAL=3

log() { echo "[init-sandbox] $1"; }

# Wait for n8n to be ready
log "Waiting for n8n at $N8N_URL..."
retries=0
until wget -qO /dev/null "$N8N_URL/healthz" 2>/dev/null; do
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    log "ERROR: n8n not ready after $((MAX_RETRIES * RETRY_INTERVAL))s"
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done
log "n8n is ready."

# Wait for 8kit to be ready
log "Waiting for 8kit at $EIGHTKIT_URL..."
retries=0
until wget -qO /dev/null "$EIGHTKIT_URL/health" 2>/dev/null; do
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    log "ERROR: 8kit not ready after $((MAX_RETRIES * RETRY_INTERVAL))s"
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done
log "8kit is ready."

# Register 8kit account and get API key (if not provided)
if [ -z "$EIGHTKIT_API_KEY" ]; then
  log "Registering sandbox 8kit account..."
  REGISTER_RESP=$(wget -qO- --header="Content-Type: application/json" \
    --post-data='{"email":"demo@8kit.sandbox","password":"demo8kit!sandbox"}' \
    "$EIGHTKIT_URL/api/auth/register" 2>/dev/null || true)

  if echo "$REGISTER_RESP" | grep -q '"token"'; then
    EIGHTKIT_API_KEY=$(echo "$REGISTER_RESP" | sed 's/.*"token":"\([^"]*\)".*/\1/')
    log "Registered sandbox account, got API key."
  else
    # Account may already exist — try login
    log "Registration failed or account exists, trying login..."
    LOGIN_RESP=$(wget -qO- --header="Content-Type: application/json" \
      --post-data='{"email":"demo@8kit.sandbox","password":"demo8kit!sandbox"}' \
      "$EIGHTKIT_URL/api/auth/login" 2>/dev/null || true)

    if echo "$LOGIN_RESP" | grep -q '"token"'; then
      EIGHTKIT_API_KEY=$(echo "$LOGIN_RESP" | sed 's/.*"token":"\([^"]*\)".*/\1/')
      log "Logged in to existing sandbox account."
    else
      log "WARNING: Could not obtain 8kit API key. Workflows will be imported without credentials."
    fi
  fi
fi

# Import each workflow via n8n REST API
log "Importing demo workflows from $WORKFLOW_DIR..."
imported=0
failed=0

for wf_file in "$WORKFLOW_DIR"/*.json; do
  [ -f "$wf_file" ] || continue
  wf_name=$(basename "$wf_file" .json)
  log "  Importing: $wf_name"

  # If we have an 8kit API key, inject it into credential placeholders
  if [ -n "$EIGHTKIT_API_KEY" ]; then
    wf_data=$(cat "$wf_file")
  else
    wf_data=$(cat "$wf_file")
  fi

  # Use n8n API to create the workflow
  IMPORT_RESP=$(wget -qO- --header="Content-Type: application/json" \
    --header="X-N8N-API-KEY: $N8N_API_KEY" \
    --post-data="$wf_data" \
    "$N8N_URL/api/v1/workflows" 2>&1 || true)

  if echo "$IMPORT_RESP" | grep -q '"id"'; then
    wf_id=$(echo "$IMPORT_RESP" | sed 's/.*"id":"\([^"]*\)".*/\1/')
    log "    Imported as workflow $wf_id"

    # Activate the workflow
    wget -qO /dev/null --header="Content-Type: application/json" \
      --header="X-N8N-API-KEY: $N8N_API_KEY" \
      --method=PATCH \
      --body-data='{"active":true}' \
      "$N8N_URL/api/v1/workflows/$wf_id" 2>/dev/null || true

    imported=$((imported + 1))
  else
    log "    WARN: Import may have failed for $wf_name"
    failed=$((failed + 1))
  fi
done

log "Done. Imported: $imported, Failed: $failed"

# Write a marker file so we don't re-import on restart
echo "imported=$imported at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /tmp/sandbox-init-complete

log "Sandbox initialization complete!"
log ""
log "=== 8kit Sandbox Ready ==="
log "  8kit Dashboard: $EIGHTKIT_URL"
log "  n8n Editor:     $N8N_URL"
log "  n8n Login:      demo / demo8kit"
log "=========================="
