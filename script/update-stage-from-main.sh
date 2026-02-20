#!/usr/bin/env bash
# Updates the 'stage' branch to include the latest 'main' commits.
# Run this LOCALLY after the main PR is merged, then push the stage branch.
#
# Usage: ./script/update-stage-from-main.sh
# This will:
#   1. Fetch origin
#   2. Merge main into stage
#   3. Push stage to origin
#
# Then on the staging server, run:
#   ./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai

set -e

echo "==> Fetching origin..."
git fetch origin

echo "==> Switching to stage branch..."
git checkout stage
git pull origin stage

echo "==> Merging main into stage..."
git merge origin/main -m "Merge main into stage for release candidate deployment"

echo "==> Pushing updated stage branch..."
git push origin stage

echo ""
echo "==> Stage branch updated with latest main."
echo "    Now deploy to staging server:"
echo "    ssh root@72.61.4.44"
echo "    cd /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai"
echo "    ./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai"
