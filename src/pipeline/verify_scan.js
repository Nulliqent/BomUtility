/**
 * @file verify_scan.js
 * @description Verifies scan integrity by comparing package counts between
 * the source CycloneDX BOM file and the output Trivy security scan report.
 */

const fs = require('fs');

/**
 * Checks if the number of parsed packages in CycloneDX BOM equals the package count scanned by Trivy.
 * 
 * @param {string} bomFile - Path to the original CycloneDX JSON BOM file.
 * @param {string} resultsFile - Path to the Trivy scan output JSON file.
 */
function verifyScan(bomFile, resultsFile) {
    try {
        // 1. Parse original CycloneDX BOM to count total packages
        const bomData = JSON.parse(fs.readFileSync(bomFile, 'utf8'));
        let bomCount = (bomData.components || []).length;
        
        // Include the root component if it has metadata details (e.g., standard Gradle builds)
        if (bomData.metadata && bomData.metadata.component) {
            bomCount += 1;
        }

        // 2. Parse Trivy output report to count audited packages
        const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        let trivyCount = 0;
        
        // Sum up package items across all target layers/Result groups
        for (const result of (resultsData.Results || [])) {
            trivyCount += (result.Packages || []).length;
        }

        // 3. Print match results to ensure scan coverage is exactly 100% (No missing packages)
        if (bomCount === trivyCount) {
            console.log(`✅ VERIFICATION PASSED: CycloneDX BOM has ${bomCount} packages, Trivy scanned exactly ${trivyCount} packages.`);
        } else {
            console.log(`❌ VERIFICATION FAILED: CycloneDX BOM has ${bomCount} packages, but Trivy scanned ${trivyCount} packages.`);
        }
    } catch (e) {
        console.error(`⚠️ Verification error:`, e.message);
    }
}

// ── Command Line Arguments Parsing ───────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error("Usage: node verify_scan.js <bom_file> <trivy_results_file>");
    process.exit(1);
}

// Run the verification task
verifyScan(args[0], args[1]);
