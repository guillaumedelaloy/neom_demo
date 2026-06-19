#!/bin/bash
set -euo pipefail

# Configure for your GCP / Cloud Run deployment (no defaults committed).
BUCKET="${GCS_DATA_BUCKET:?Set GCS_DATA_BUCKET, e.g. gs://your-neom-data-bucket}"
SERVICE="${CLOUD_RUN_SERVICE:?Set CLOUD_RUN_SERVICE name}"
REGION="${CLOUD_RUN_REGION:-europe-west1}"
API_URL="${BACKEND_URL:?Set BACKEND_URL to your Cloud Run HTTPS base, e.g. https://your-service-xxxxx.run.app}"
API_KEY="${BACKEND_API_KEY:?Set BACKEND_API_KEY (same as BACKEND_API_KEY on the service)}"
DATA_DIR="$(cd "$(dirname "$0")" && pwd)/data_extract"

echo "Step 1/3: Syncing local data_extract/ to GCS (full mirror)..."
gcloud storage rsync "$DATA_DIR/" "$BUCKET/" \
  --recursive --delete-unmatched-destination-objects --checksums-only
echo "Sync complete."

echo ""
echo "Step 2/3: Triggering server-side reprocessing (streams live output)..."
echo "         This takes ~13 minutes. Do not interrupt."
echo ""

OUTPUT=$(mktemp)
HTTP_CODE=$(curl -s -o "$OUTPUT" -w "%{http_code}" --max-time 900 -N \
  -X POST "$API_URL/api/reprocess" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json")

cat "$OUTPUT"

if [ "$HTTP_CODE" -ge 400 ]; then
  echo "ERROR: Server returned HTTP $HTTP_CODE"
  rm -f "$OUTPUT"
  exit 1
fi

if ! grep -q "=== SUCCESS ===" "$OUTPUT"; then
  echo ""
  echo "ERROR: Preprocessing did not complete successfully."
  rm -f "$OUTPUT"
  exit 1
fi

rm -f "$OUTPUT"

echo ""
echo "Step 3/3: Restarting backend to load new data..."
gcloud run services update "$SERVICE" --region "$REGION" \
  --update-env-vars "REPROCESS_TS=$(date -u +%Y%m%dT%H%M%SZ)" --quiet
echo "Backend restarted."

echo " "
echo "Done. Data synced, reprocessed, and live on $API_URL"
