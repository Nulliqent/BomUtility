/**
 * @file generate_index.js
 * @description Compiles the global security portal dashboard using external templates.
 */

const fs = require('fs');
const path = require('path');
const { readJsonSafe } = require('../utils/file_utils');
const { renderDashboard, renderConfluenceReport } = require('./templates');

function getServicesData(reportsDir) {
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('-results.json') && !f.includes('.previous.'));
    const servicesData = [];

    for (const file of files) {
        const fullPath = path.join(reportsDir, file);
        const baseName = file.replace('-results.json', '');
        const data = readJsonSafe(fullPath, {});

        const prevPath = fullPath.replace('-results.json', '-results.previous.json');
        const prevPkgMap = {};
        if (fs.existsSync(prevPath)) {
            const prevData = readJsonSafe(prevPath, {});
            for (const result of (prevData.Results || [])) {
                for (const pkg of (result.Packages || [])) {
                    if (!prevPkgMap[pkg.Name]) prevPkgMap[pkg.Name] = new Set();
                    prevPkgMap[pkg.Name].add(pkg.Version);
                }
            }
        }
        const hasPreviousRun = Object.keys(prevPkgMap).length > 0;

        let totalVulns = 0, critical = 0, high = 0, medium = 0, low = 0, totalInstalled = 0;
        const packages = [];
        const results = data.Results || [];

        for (const result of results) {
            if (!result.Packages) continue;

            const vulnMap = {};
            for (const v of (result.Vulnerabilities || [])) {
                if (!vulnMap[v.PkgName]) vulnMap[v.PkgName] = [];
                vulnMap[v.PkgName].push(v);
            }

            for (const pkg of result.Packages) {
                totalInstalled++;
                let group = "N/A", name = pkg.Name;
                if (pkg.Name.includes(':')) {
                    const parts = pkg.Name.split(':');
                    group = parts[0]; name = parts[1];
                }

                let status = "";
                if (hasPreviousRun) {
                    if (!prevPkgMap[pkg.Name]) status = "🆕 NEW";
                    else if (prevPkgMap[pkg.Name].has(pkg.Version)) status = "Unchanged";
                    else status = `🔄 UPDATED (from ${Array.from(prevPkgMap[pkg.Name]).join(", ")})`;
                }

                const vulns = vulnMap[pkg.Name] || [];
                if (vulns.length === 0) {
                    packages.push({ group, name, status, severity: 'SAFE', vuln: 'None', installed: pkg.Version, fixed: '-' });
                } else {
                    for (const v of vulns) {
                        totalVulns++;
                        const sev = v.Severity || 'UNKNOWN';
                        if (sev === 'CRITICAL') critical++;
                        else if (sev === 'HIGH') high++;
                        else if (sev === 'MEDIUM') medium++;
                        else if (sev === 'LOW') low++;

                        packages.push({ group, name, status, severity: sev, vuln: v.VulnerabilityID || 'N/A', installed: v.InstalledVersion, fixed: v.FixedVersion || 'None' });
                    }
                }
            }
        }

        servicesData.push({
            name: baseName.toUpperCase().replace('-BOM', '').replace('_BOM', ''),
            report_html: `${baseName}-report.html`,
            total_installed: totalInstalled,
            total_vulns: totalVulns,
            critical, high, medium, low, packages
        });
    }
    return servicesData;
}

function generateIndex() {
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) return;

    const servicesData = getServicesData(reportsDir);
    const eolData = readJsonSafe(path.join(reportsDir, 'eol-data.json'));

    const html = renderDashboard(servicesData, eolData);
    fs.writeFileSync(path.join(reportsDir, 'index.html'), html);

    const md = renderConfluenceReport(servicesData, eolData);
    fs.writeFileSync(path.join(reportsDir, 'confluence-report.md'), md);

    console.log("Generated reports/index.html and reports/confluence-report.md with DIFF tracking and EOL data!");
}

generateIndex();
