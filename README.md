# Global Security & EOL Dashboard

An automated, air-gapped security dependency pipeline that ingests CycloneDX SBOMs, sanitizes proprietary components, executes offline Trivy vulnerability scans, fetches End-of-Life (EOL) data, and compiles everything into a stunning, centralized HTML & Markdown dashboard.

## 🏗️ Architecture

The codebase has been highly modularized into specialized domains:

```text
AI-TestProject/
├── config/              # User-defined configurations
│   ├── eol_config.json        # Dynamic mappings for EOL tracking
│   └── sanitize_config.json   # Filters for redacting/stripping BOM data
├── files/               # Drop your input CycloneDX *-bom.json files here!
├── reports/             # Output destination for all generated dashboards
├── src/
│   ├── pipeline/        # Core execution scripts (Sanitization, EOL, HTML Generation)
│   ├── public/          # Frontend Web UI assets (HTML, CSS, JS)
│   ├── server/          # Backend Node.js API services and routing
│   └── utils/           # Shared File I/O and Network utilities
├── configurator.js      # Minimalist Node.js Server Entry Point
└── README.md
```

## 🚀 Getting Started

### 1. Drop your BOMs
Place your generated CycloneDX BOM files (e.g., `app-service-bom.json`) directly into the `files/` directory.

### 2. Configure Mappings via the UI
Start the local configuration server to map your dependencies to the EOL registry and configure your dashboard visually:

```bash
node configurator.js
```
Then open your web browser and navigate to **http://localhost:3000**.
* You can search for products (like `spring-boot`, `react`, `postgresql`).
* Select components and map them to the specific packages detected in your BOM files.
* Click **💾 Save Configuration**.

### 3. Run the Pipeline
You can trigger the pipeline directly from the Web UI by clicking **🚀 Run Pipeline**, or you can run it headlessly in a CI/CD environment using:

```bash
./src/pipeline/scan.sh
```

## ⚙️ How the Pipeline Works (`scan.sh`)

When triggered, the pipeline executes the following sequence:

1. **Sanitization (`sanitize_bom.js`)**: Reads `config/sanitize_config.json`. Any components whose group name matches a `filter_groups` string are completely stripped from the BOM. Any sensitive domains or internal strings matching `redact_texts` are redacted.
2. **Trivy Offline Scan**: Executes a local `trivy sbom` scan against the sanitized BOM to detect vulnerabilities without sending data to the cloud.
3. **Integrity Verification (`verify_scan.js`)**: Compares the package count from the original BOM against the Trivy output to ensure no dependencies were dropped.
4. **EOL Fetching (`fetch_eol.js`)**: Queries the `endoflife.date` API for mapped technologies, calculates the newest supported release cycles, and caches the data locally in `.eol-cache`.
5. **Dashboard Generation (`generate_index.js`)**: Stitches together the Trivy vulnerability metrics, package diffs, and EOL lifecycles into a master HTML index and a Confluence-compatible Markdown file (`reports/confluence-report.md`).

## 🛡️ Configuration Options

### Sanitization (`config/sanitize_config.json`)
```json
{
  "redact_texts": [
    "github.com/PrivateInternal"
  ],
  "filter_groups": [
    "com.mycompany.internal",
    "org.private.proprietary"
  ]
}
```
* **`filter_groups`**: Any CycloneDX component whose group contains these substrings will be silently dropped before vulnerability scanning.
* **`redact_texts`**: These strings will be masked with `***REDACTED***` across all fields.

### EOL Tracking (`config/eol_config.json`)
This file is generally managed automatically by the Web UI Configurator, but can be manually edited to force version mappings.
