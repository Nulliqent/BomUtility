#!/bin/bash

# ==============================================================================
# Script: scan.sh
# Description: Central scanning pipeline coordinator.
#              1. Sanitizes CycloneDX BOM files.
#              2. Backs up previous reports to enable diff comparison.
#              3. Runs Trivy offline scan using Docker.
#              4. Verifies scan accuracy.
#              5. Generates detailed per-microservice HTML reports.
#              6. Enriches dependencies with EOL information.
#              7. Compiles global dashboards (index.html & Confluence MD).
# ==============================================================================

echo "Starting Batch Scan for all BOM files in the 'files' directory..."
echo ""

# Ensure central reports output directory exists
mkdir -p reports

# Loop through all JSON BOM files in the 'files' folder
for BOM_FILE in files/*.json; do
  if [ -f "$BOM_FILE" ]; then
    # Extract basename (e.g. 'app-service-0.0.1-SNAPSHOT-bom')
    BASENAME=$(basename "$BOM_FILE" .json)
    
    echo "============================================="
    
    # ── Step 0: Sanitization ──────────────────────────────────────────────────
    # Check if we should skip sanitization via environment flags or command options
    if [ "${SKIP_SANITIZE:-false}" = "true" ] || [ "$1" = "--no-sanitize" ]; then
      echo "⚠️ Step 0: Skipping Sanitization for $BOM_FILE..."
    else
      echo "🛡️ Step 0: Sanitizing $BOM_FILE (using config/sanitize_config.json)..."
      node src/pipeline/sanitize_bom.js "$BOM_FILE" --config config/sanitize_config.json
    fi
      
    # ── Step 0.5: Diff backup ─────────────────────────────────────────────────
    # If a previous results report exists, back it up so node scripts can calculate
    # new vs updated vs unchanged package status logs.
    if [ -f "reports/${BASENAME}-results.json" ]; then
      cp "reports/${BASENAME}-results.json" "reports/${BASENAME}-results.previous.json"
    fi

    # ── Step 1: Scan BOM using Trivy ──────────────────────────────────────────
    # Strictly offline scan using our local Trivy db container network
    echo "🚀 Step 1: Scanning $BOM_FILE using Trivy (Strictly Offline)..."
    
    # Check if we have the trivy binary natively installed (e.g. inside our Next.js Docker container)
    if command -v trivy &> /dev/null; then
      echo "  👉 Using native Trivy CLI..."
      trivy sbom "$BOM_FILE" \
        --server ${TRIVY_SERVER:-http://localhost:4954} \
        --list-all-pkgs \
        --offline-scan \
        --skip-db-update \
        --skip-java-db-update \
        --skip-version-check \
        -f json \
        -o "reports/${BASENAME}-results.json"
    else
      # Fallback to DinD if running natively on a host without Trivy installed
      echo "  👉 Using Dockerized Trivy (DinD fallback)..."
      docker run --rm -v $(pwd):/app --network host aquasec/trivy:latest sbom "/app/$BOM_FILE" \
        --server http://host.docker.internal:4954 \
        --list-all-pkgs \
        --offline-scan \
        --skip-db-update \
        --skip-java-db-update \
        --skip-version-check \
        -f json \
        -o "/app/reports/${BASENAME}-results.json"
    fi

    # ── Step 2: Verification ──────────────────────────────────────────────────
    # Verify that the package count in the original BOM matches Trivy scanned packages
    echo "🔍 Step 2: Verifying Scan Integrity..."
    node src/pipeline/verify_scan.js "$BOM_FILE" "reports/${BASENAME}-results.json"

    # ── Step 3: Detailed Report Generation ────────────────────────────────────
    # Render the styled microservice report with diff-tracking and EOL statuses
    echo "📊 Step 3: Generating Custom HTML Report for $BOM_FILE..."
    node src/pipeline/generate_custom_report.js "reports/${BASENAME}-results.json" "reports/${BASENAME}-report.html"

    echo "✅ Finished: reports/${BASENAME}-report.html"
    echo ""
  fi
done

echo "============================================="

# ── Step 4: EOL API Querying ──────────────────────────────────────────────────
# Pull End-of-Life statuses from endoflife.date for all configured technologies.
# Can be skipped if running in restricted air-gapped offline modes.
if [ "${SKIP_EOL:-false}" = "true" ] || [ "$1" = "--skip-eol" ]; then
  echo "⚠️ Step 4: Skipping EOL data fetch (offline mode)..."
else
  echo "📅 Step 4: Fetching End-of-Life data from endoflife.date..."
  node src/pipeline/fetch_eol.js
fi

# ── Step 5: Global Dashboard Indexing ─────────────────────────────────────────
# Generates the central reports/index.html and reports/confluence-report.md files
echo "🌐 Step 5: Generating Dashboard Index and Combined Confluence Report..."
node src/pipeline/generate_index.js

echo "🎉 All scans complete! Check the 'reports' folder for the new outputs."
