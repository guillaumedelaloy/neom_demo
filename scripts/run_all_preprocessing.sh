#!/bin/bash
# ============================================================
#  PREPROCESSING ORCHESTRATOR
#  If you add or change a preprocessing script, UPDATE THIS FILE.
#  If your script writes to a new output directory, add it to OUTPUT_DIRS.
#  Called by POST /api/reprocess on Cloud Run.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# Output directories to clean before reprocessing (relative to data_extract/)
OUTPUT_DIRS=("processed" "chroma_db")

# Scripts to run in order
SCRIPTS=(
  "scripts/process_financial_data.py"
  "scripts/process_schedule_data.py"
  "scripts/build_workbook_index.py"
)

echo "=== Cleaning output directories ==="
for dir in "${OUTPUT_DIRS[@]}"; do
  target="data_extract/$dir"
  if [ -d "$target" ]; then
    rm -rf "$target"
    echo "Deleted $target"
  fi
done

echo "=== Running preprocessing scripts ==="
for script in "${SCRIPTS[@]}"; do
  echo "--- $script ---"
  python "$script"
done

# ChromaDB uses SQLite which doesn't work on GCS FUSE.
# Build to a local temp dir, then copy to the mount.
echo "--- scripts/build_rag_index.py (local build + copy) ---"
LOCAL_CHROMA=$(mktemp -d)/chroma_db
export CHROMA_PATH="$LOCAL_CHROMA"
python scripts/build_rag_index.py
cp -r "$LOCAL_CHROMA" data_extract/chroma_db
rm -rf "$(dirname "$LOCAL_CHROMA")"

echo "=== All preprocessing complete ==="
