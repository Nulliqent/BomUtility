/**
 * @file templates.js
 * @description Extracts monolithic HTML and Markdown string generation logic into clean functions.
 */

function renderDashboard(servicesData, eolData) {
    let html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global Security Dashboard</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Shared Theme -->
    <link rel="stylesheet" href="../theme.css">
    <style>
        .badge { display: inline-block; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; color: white; border: 1px solid rgba(255,255,255,0.1); }
        .sev-CRITICAL { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: rgba(239, 68, 68, 0.5); }
        .sev-HIGH { background-color: rgba(249, 115, 22, 0.2); color: #f97316; border-color: rgba(249, 115, 22, 0.5); }
        .sev-MEDIUM { background-color: rgba(234, 179, 8, 0.2); color: #eab308; border-color: rgba(234, 179, 8, 0.5); }
        .sev-LOW { background-color: rgba(59, 130, 246, 0.2); color: #3b82f6; border-color: rgba(59, 130, 246, 0.5); }
    </style>
</head>
<body>
    <div class="ambient-glow"></div>
    <div class="ambient-glow-2"></div>
    
    <header>
        <div class="header-container">
            <div class="logo-section">
                <span class="logo-icon">🌐</span>
                <div class="logo-text">
                    <h1>Global Security Dashboard</h1>
                    <p>Microservice Vulnerability Status</p>
                </div>
            </div>
            <div class="controls-section">
                <button class="theme-btn" id="theme-toggle">🌙 Dark Mode</button>
                <a href="/" class="theme-btn" style="text-decoration: none;">⚙️ Configurator</a>
                <a href="eol-dashboard.html" class="file-select-btn" style="text-decoration: none;">📊 Open EOL Dashboard</a>
            </div>
        </div>
    </header>

    <main>
        <div class="dashboard-grid">
            <div class="glass-panel" style="grid-column: 1 / -1;">
                <h2>Microservice Overview</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Microservice</th>
                            <th>Dependencies</th>
                            <th>Vulnerabilities</th>
                            <th>Critical</th>
                            <th>High</th>
                            <th>Medium</th>
                            <th>Low</th>
                        </tr>
                    </thead>
                    <tbody>`;

    for (const s of servicesData) {
        html += `
                        <tr>
                            <td><a href="${s.report_html}" style="font-weight: bold; color: #2980b9;">${s.name}</a></td>
                            <td>${s.total_installed}</td>
                            <td><b>${s.total_vulns}</b></td>
                            <td><span class="badge sev-CRITICAL">${s.critical}</span></td>
                            <td><span class="badge sev-HIGH">${s.high}</span></td>
                            <td><span class="badge sev-MEDIUM">${s.medium}</span></td>
                            <td><span class="badge sev-LOW">${s.low}</span></td>
                        </tr>`;
    }

    html += `
                    </tbody>
                </table>`;

    if (eolData && eolData.summary) {
        const summary = eolData.summary;
        const allProducts = summary.all_products || {};

        html += `
                <div class="glass-panel" style="grid-column: 1 / -1; margin-top: 30px;">
                <h2>📅 End-of-Life Status</h2>
                <p class="timestamp">Last checked: ${eolData.generated_at || 'N/A'}</p>
                <div class="summary-cards" style="display: flex; gap: 16px; margin-bottom: 24px;">
                    <div class="metric-card" style="border-top: 4px solid var(--primary);">
                        <div class="value">${summary.total_products_tracked}</div>
                        <div class="label">Products Tracked</div>
                    </div>
                    <div class="metric-card" style="border-top: 4px solid var(--success);">
                        <div class="value">${summary.supported}</div>
                        <div class="label">Supported</div>
                    </div>
                    <div class="metric-card" style="border-top: 4px solid var(--warning);">
                        <div class="value">${summary.approaching_eol}</div>
                        <div class="label">Approaching EOL</div>
                    </div>
                    <div class="metric-card" style="border-top: 4px solid var(--danger);">
                        <div class="value">${summary.eol}</div>
                        <div class="label">End of Life</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Detected Version</th>
                            <th>Cycle</th>
                            <th>Latest Supported</th>
                            <th>EOL Status</th>
                            <th>EOL Date</th>
                            <th>Support Until</th>
                            <th>LTS</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (const [productName, info] of Object.entries(allProducts)) {
            let eolBadgeClass = 'eol-na';
            if (info.eol_status === 'eol') eolBadgeClass = 'eol-danger';
            else if (info.eol_status === 'approaching') eolBadgeClass = 'eol-warning';
            else if (info.eol_status === 'supported') eolBadgeClass = 'eol-ok';

            const upgradeAvail = info.latest_supported && info.latest_supported !== info.detected_version;

            let ltsDisplay = 'No';
            if (info.lts === true) ltsDisplay = '✅ Yes';
            else if (typeof info.lts === 'string') ltsDisplay = `✅ Since ${info.lts}`;

            html += `
                        <tr>
                            <td style="font-weight: bold;">${productName}</td>
                            <td>${info.detected_version}${upgradeAvail ? ' ⬆️' : ''}</td>
                            <td>${info.cycle || 'N/A'}</td>
                            <td>${info.latest_supported || 'N/A'}${info.latest_supported_release_date ? `<br><small style="color:#95a5a6;">${info.latest_supported_release_date}</small>` : ''}</td>
                            <td><span class="eol-badge ${eolBadgeClass}">${info.eol_label}</span></td>
                            <td>${info.eol_date || 'N/A'}</td>
                            <td>${info.support_date || 'N/A'}</td>
                            <td>${ltsDisplay}</td>
                        </tr>`;
        }

        html += `
                    </tbody>
                </table>
                </div>`;
    }

    html += `
            </div>
        </div>
    </main>
    <script src="../app.js"></script>
</body>
</html>`;

    return html;
}

function renderConfluenceReport(servicesData, eolData) {
    let md = "## Security Dashboard Overview\n\n";
    md += "| Microservice | Total Dependencies | Total Vulnerabilities | Critical | High | Medium | Low |\n";
    md += "|---|---|---|---|---|---|---|\n";

    for (const s of servicesData) {
        md += `| [${s.name}](${s.report_html}) | ${s.total_installed} | ${s.total_vulns} | ${s.critical} | ${s.high} | ${s.medium} | ${s.low} |\n`;
    }

    md += "\n---\n\n";

    if (eolData && eolData.summary) {
        const summary = eolData.summary;
        const allProducts = summary.all_products || {};

        md += "## 📅 End-of-Life Status\n\n";
        md += `> **Last checked:** ${eolData.generated_at || 'N/A'}  \n`;
        md += `> 🟢 Supported: **${summary.supported}** | 🟡 Approaching EOL: **${summary.approaching_eol}** | 🔴 End of Life: **${summary.eol}**\n\n`;
        md += "| Product | Detected Version | Cycle | Latest Supported | EOL Status | EOL Date | Support Until | LTS |\n";
        md += "|---|---|---|---|---|---|---|---|\n";

        for (const [productName, info] of Object.entries(allProducts)) {
            let statusEmoji = '⚪';
            if (info.eol_status === 'eol') statusEmoji = '🔴';
            else if (info.eol_status === 'approaching') statusEmoji = '🟡';
            else if (info.eol_status === 'supported') statusEmoji = '🟢';

            const upgradeAvail = info.latest_supported && info.latest_supported !== info.detected_version;
            let ltsDisplay = 'No';
            if (info.lts === true) ltsDisplay = '✅ Yes';
            else if (typeof info.lts === 'string') ltsDisplay = `✅ Since ${info.lts}`;

            md += `| ${productName} | ${info.detected_version}${upgradeAvail ? ' ⬆️' : ''} | ${info.cycle || 'N/A'} | ${info.latest_supported || 'N/A'} | ${statusEmoji} ${info.eol_label} | ${info.eol_date || 'N/A'} | ${info.support_date || 'N/A'} | ${ltsDisplay} |\n`;
        }
        md += "\n---\n\n";
    }

    for (const s of servicesData) {
        md += `## ${s.name} Dependencies\n\n`;
        md += "| Status | Package Group | Package Name | Vulnerability | Installed Version | Fixed Version |\n";
        md += "|---|---|---|---|---|---|\n";
        for (const p of s.packages) {
            let vulnStr = p.severity === 'SAFE' ? p.vuln : `${p.vuln} (${p.severity})`;
            let group = String(p.group).replace(/\\|/g, '&#124;');
            let name = String(p.name).replace(/\\|/g, '&#124;');
            let status = String(p.status).replace(/\\|/g, '&#124;');
            vulnStr = String(vulnStr).replace(/\\|/g, '&#124;');
            md += `| ${status} | ${group} | ${name} | ${vulnStr} | ${p.installed} | ${p.fixed} |\n`;
        }
        md += "\n";
    }

    return md;
}

module.exports = {
    renderDashboard,
    renderConfluenceReport
};
