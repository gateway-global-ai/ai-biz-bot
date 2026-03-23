#!/usr/bin/env bash
# Used by deploy-*.sh: restart an existing PM2 app, or first-time start from ecosystem.config.cjs.
# Usage: pm2_reload_app <pm2-app-name> <repo-root>
pm2_reload_app() {
  local APP_NAME="$1"
  local REPO_ROOT="$2"
  local ECOSYSTEM="${REPO_ROOT}/ecosystem.config.cjs"

  if ! command -v pm2 &>/dev/null; then
    echo "==> PM2 not installed; start manually (e.g. doppler run -- node dist/index.mjs)."
    return 0
  fi

  if pm2 describe "$APP_NAME" &>/dev/null; then
    echo "==> Restarting PM2 app: $APP_NAME"
    pm2 restart "$APP_NAME" --update-env
  else
    if [[ ! -f "$ECOSYSTEM" ]]; then
      echo "⚠️  No ecosystem at $ECOSYSTEM — cannot first-time start $APP_NAME"
      return 1
    fi
    echo "==> First-time PM2 start: $APP_NAME (from ecosystem.config.cjs)"
    pm2 start "$ECOSYSTEM" --only "$APP_NAME" --update-env
  fi
  pm2 save
}
