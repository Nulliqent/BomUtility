/**
 * @file generate_custom_report.js
 * @description Compiles detailed per-microservice HTML vulnerability reports.
 * It integrates package version diff tracking (comparing current vs. previous scans to flag NEW/UPDATED/UNCHANGED)
 * and rich EOL (End-of-Life) metrics mapping from our central EOL dataset.
 */

const fs = require('fs');
const path = require('path');

/**
 * Loads the compiled EOL dataset from the standard reports directory.
 * 
 * @returns {object|null} The parsed EOL JSON object or null if unavailable.
 */
function loadEolData() {
    const eolPath = path.join('reports', 'eol-data.json');
    if (!fs.existsSync(eolPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(eolPath, 'utf8'));
    } catch (e) {
        console.error('Warning: Could not parse eol-data.json:', e.message);
        return null;
    }
}

/**
 * Resolves a matched EOL product record for a given scanned dependency package.
 * 
 * @param {object} eolData - The global EOL dataset.
 * @param {string} baseName - The base name of the microservice service (e.g., service1).
 * @param {string} pkgName - Name of the package to query.
 * @param {string} pkgVersion - Scanned package version.
 * @returns {object|null} Product EOL details or null if no mapping exists.
 */
function findEolForPackage(eolData, baseName, pkgName, pkgVersion) {
    if (!eolData || !eolData.services) return null;

    // Retrieve EOL data specifically mapped for this service
    const serviceData = eolData.services[baseName];
    if (!serviceData) return null;

    // Check if this package matches any configured EOL technology slug/component
    for (const [, productInfo] of Object.entries(serviceData)) {
        const purl = productInfo.purl || '';
        // Match either by package URL parsing or direct component name match
        if (purl.includes(pkgName + '@') || productInfo.component_name === pkgName) {
            return productInfo;
        }
    }
    return null;
}

/**
 * Renders HTML badges, timeline indicators, and version upgrade recommendations.
 * 
 * @param {object|null} eolInfo - Resolved EOL details for the package.
 * @returns {string} Safe HTML string containing the rendered badges.
 */
function getEolBadgeHtml(eolInfo) {
    if (!eolInfo) return `<span class="eol-badge eol-na">N/A</span>`;

    const status = eolInfo.eol_status;
    const label = eolInfo.eol_label;
    const eolDate = eolInfo.eol_date;
    const latest = eolInfo.latest_supported;
    const detectedVer = eolInfo.detected_version;

    // Assign appropriate color styles based on EOL threat severity
    let badgeClass = 'eol-na';
    if (status === 'eol') badgeClass = 'eol-danger';
    else if (status === 'approaching') badgeClass = 'eol-warning';
    else if (status === 'supported') badgeClass = 'eol-ok';

    // Build subtext dates
    let dateStr = '';
    if (eolDate) dateStr = `<br><small style="color:#7f8c8d;">EOL: ${eolDate}</small>`;

    // Add green "Latest Supported" version indicator if upgrade is available
    let upgradeStr = '';
    if (latest && latest !== detectedVer) {
        upgradeStr = `<br><small style="color:#2980b9;">Latest Supported: ${latest}</small>`;
    }

    return `<span class="eol-badge ${badgeClass}">${label}</span>${dateStr}${upgradeStr}`;
}

/**
 * Parses Trivy JSON output and builds an interactive detailed HTML table report.
 * 
 * @param {string} jsonFile - Path to the current Trivy JSON scan file.
 * @param {string} outputFile - Target HTML report output path.
 */
function generateCustomReport(jsonFile, outputFile) {
    let currentData = { Results: [] };
    let previousData = { Results: [] };

    // 1. Read current Trivy results
    try {
        currentData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${jsonFile}:`, e.message);
        process.exit(1);
    }

    // 2. Locate and load the previous scan data if available to enable diff analysis
    const prevJsonFile = jsonFile.replace('-results.json', '-results.previous.json');
    if (fs.existsSync(prevJsonFile)) {
        try {
            previousData = JSON.parse(fs.readFileSync(prevJsonFile, 'utf8'));
        } catch (e) {
            console.error(`Warning: Could not parse previous scan file ${prevJsonFile}`);
        }
    }

    // Load EOL dataset
    const eolData = loadEolData();
    // Normalize base service name key matching
    const baseName = path.basename(jsonFile).replace('-results.json', '').replace('-bom', '').replace('_bom', '');

    // 3. Map package versions from the previous scan to look up change states
    const prevPkgMap = {};
    for (const result of (previousData.Results || [])) {
        for (const pkg of (result.Packages || [])) {
            if (!prevPkgMap[pkg.Name]) prevPkgMap[pkg.Name] = new Set();
            prevPkgMap[pkg.Name].add(pkg.Version);
        }
    }
    const hasPreviousRun = Object.keys(prevPkgMap).length > 0;

    // 4. Initialize premium UI layout skeleton
    let html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detailed Security Report</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Shared Theme -->
    <link rel="stylesheet" href="../theme.css">
    <style>
        .badge { padding: 5px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; display: inline-block; }
        .sev-CRITICAL { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: rgba(239, 68, 68, 0.5); border: 1px solid; }
        .sev-HIGH { background-color: rgba(249, 115, 22, 0.2); color: #f97316; border-color: rgba(249, 115, 22, 0.5); border: 1px solid; }
        .sev-MEDIUM { background-color: rgba(234, 179, 8, 0.2); color: #eab308; border-color: rgba(234, 179, 8, 0.5); border: 1px solid; }
        .sev-LOW { background-color: rgba(59, 130, 246, 0.2); color: #3b82f6; border-color: rgba(59, 130, 246, 0.5); border: 1px solid; }
        .sev-SAFE { background-color: rgba(46, 204, 113, 0.2); color: #2ecc71; border-color: rgba(46, 204, 113, 0.5); border: 1px solid; }
        .status-NEW { background-color: #8e44ad; color: white; border: 1px solid rgba(142,68,173,0.5); }
        .status-UPDATED { background-color: #9b59b6; color: white; border: 1px solid rgba(155,89,182,0.5); }
        .status-UNCHANGED { color: #95a5a6; font-size: 0.9em; }
        .eol-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; display: inline-block; }
        .eol-ok { background-color: #2ecc71; color: white; }
        .eol-warning { background-color: #f39c12; color: white; }
        .eol-danger { background-color: #e74c3c; color: white; }
        .eol-na { background-color: rgba(255,255,255,0.05); color: #95a5a6; border: 1px solid rgba(255,255,255,0.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { background-color: rgba(255,255,255,0.05); color: var(--text-primary); font-weight: 600; }
        tr:hover { background-color: rgba(255,255,255,0.02); }
    </style>
</head>
<body>
    <div class="ambient-glow"></div>
    <div class="ambient-glow-2"></div>
    
    <header>
        <div class="header-container">
            <div class="logo-section">
                <span class="logo-icon">📦</span>
                <div class="logo-text">
                    <h1>Dependency Security Report</h1>
                    <p>${path.basename(jsonFile).replace('-results.json', '')}</p>
                </div>
            </div>
            <div class="controls-section">
                <button class="theme-btn" id="theme-toggle">🌙 Dark Mode</button>
                <a href="index.html" class="theme-btn" style="text-decoration: none;">← Back to Dashboard</a>
            </div>
        </div>
    </header>

    <main>
        <div class="dashboard-grid">
            <div class="glass-panel" style="grid-column: 1 / -1; overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Change Status</th>
                            <th>Package Group</th>
                            <th>Package Name</th>
                            <th>Severity</th>
                            <th>Vulnerability ID</th>
                            <th>Installed Version</th>
                            <th>Fixed Version</th>
                            <th>EOL Status</th>
                        </tr>
                    </thead>
                    <tbody>`;

    const results = currentData.Results || [];
    let hasPackages = false;

    // 5. Traverse package lists and match vulnerability severity details
    for (const result of results) {
        if (!result.Packages) continue;
        
        // Index vulnerabilities by package name for high performance lookups
        const vulnMap = {};
        for (const v of (result.Vulnerabilities || [])) {
            if (!vulnMap[v.PkgName]) vulnMap[v.PkgName] = [];
            vulnMap[v.PkgName].push(v);
        }

        // Generate rows for each component package
        for (const pkg of result.Packages) {
            hasPackages = true;
            let group = "N/A";
            let name = pkg.Name;
            
            // Format group/name strings if maven coordinates format exists (group:artifact)
            if (pkg.Name.includes(':')) {
                const parts = pkg.Name.split(':');
                group = parts[0];
                name = parts[1];
            }

            // Map and calculate Diff state (NEW / UPDATED / UNCHANGED)
            let statusHtml = `<span class="status-UNCHANGED">Unchanged</span>`;
            if (hasPreviousRun) {
                if (!prevPkgMap[pkg.Name]) {
                    statusHtml = `<span class="badge status-NEW">NEW</span>`;
                } else if (!prevPkgMap[pkg.Name].has(pkg.Version)) {
                    const prevVersions = Array.from(prevPkgMap[pkg.Name]).join(", ");
                    statusHtml = `<span class="badge status-UPDATED">UPDATED</span><br><small style="color:#7f8c8d;">was ${prevVersions}</small>`;
                }
            }

            // Find EOL details and HTML tags
            const eolInfo = findEolForPackage(eolData, baseName, pkg.Name, pkg.Version);
            const eolBadge = getEolBadgeHtml(eolInfo);

            const vulns = vulnMap[pkg.Name] || [];
            
            // Render safe package row
            if (vulns.length === 0) {
                html += `
                <tr>
                    <td>${statusHtml}</td>
                    <td>${group}</td>
                    <td>${name}</td>
                    <td><span class="badge sev-SAFE">SAFE</span></td>
                    <td>None</td>
                    <td>${pkg.Version || 'N/A'}</td>
                    <td>-</td>
                    <td>${eolBadge}</td>
                </tr>`;
            } else {
                // Render one row for each vulnerability matching this package
                for (const v of vulns) {
                    html += `
                <tr>
                    <td>${statusHtml}</td>
                    <td>${group}</td>
                    <td>${name}</td>
                    <td><span class="badge sev-${v.Severity || 'UNKNOWN'}">${v.Severity || 'UNKNOWN'}</span></td>
                    <td>${v.VulnerabilityID || 'N/A'}</td>
                    <td>${v.InstalledVersion || 'N/A'}</td>
                    <td>${v.FixedVersion || 'None Available'}</td>
                    <td>${eolBadge}</td>
                </tr>`;
                }
            }
        }
    }

    // Graceful empty table fallbacks
    if (!hasPackages) {
        html += `<tr><td colspan="8" style="text-align: center;">No dependencies found in this file.</td></tr>`;
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    </main>
    <script src="../app.js"></script>
</body>
</html>`;

    // 6. Save target compiled report file
    fs.writeFileSync(outputFile, html);
}

// ── Command-Line Execution Entry ─────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error("Usage: node generate_custom_report.js <input_json> <output_html>");
    process.exit(1);
}

// Invoke the HTML generator
generateCustomReport(args[0], args[1]);
