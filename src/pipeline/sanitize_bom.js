/**
 * @file sanitize_bom.js
 * @description Sanitization script for Software Bill of Materials (SBOM) JSON files.
 * This utility parses CycloneDX SBOM files, filters out internal/private components based on group matches,
 * and recursively redacts sensitive information (e.g., credentials or proprietary URLs) specified in a config file.
 */

const fs = require('fs');

/**
 * Sanitizes a CycloneDX BOM file by redacting sensitive data and filtering out specified components.
 * 
 * @param {string} bomFile - Path to the CycloneDX JSON BOM file to sanitize in place.
 * @param {string|null} configPath - Optional path to the configuration JSON file specifying redaction lists.
 */
function sanitizeBom(bomFile, configPath) {
    let filterGroups = [];
    let redactTexts = [];

    // 1. Load configuration if provided and exists
    if (configPath && fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Load text patterns we want to redact (e.g., private nexus URLs, internal domains)
            redactTexts = config.redact_texts || [];
            
            // Load component groups to filter out entirely
            filterGroups = config.filter_groups || config.filter_group || [];
        } catch (e) {
            console.error(`❌ Error reading config file ${configPath}:`, e.message);
            process.exit(1);
        }
    }

    // 2. Read and parse the target BOM file
    let data;
    try {
        data = JSON.parse(fs.readFileSync(bomFile, 'utf8'));
    } catch (e) {
        console.error(`❌ Error reading BOM file ${bomFile}:`, e.message);
        process.exit(1);
    }

    // 3. Filter out internal components (if any internal group matches were configured)
    if (filterGroups.length > 0 && data.components) {
        const originalCount = data.components.length;
        // Keep only components whose group does not include any filtered group substring
        data.components = data.components.filter(c => {
            const group = String(c.group || '').toLowerCase();
            return !filterGroups.some(fg => group.includes(fg.toLowerCase()));
        });
        const removed = originalCount - data.components.length;
        if (removed > 0) {
            console.log(`[${bomFile}] Filtered out ${removed} internal components matching requested groups.`);
        }
    }

    /**
     * Recursively traverses a JSON object or array to replace matched sensitive strings with redacting badges.
     * 
     * @param {any} obj - The target sub-object or array to traverse.
     */
    function recursiveRedact(obj) {
        if (Array.isArray(obj)) {
            // Traverse array elements
            obj.forEach(item => recursiveRedact(item));
        } else if (obj !== null && typeof obj === 'object') {
            // Traverse object keys
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    let val = obj[key];
                    // Replace all occurrences of target strings with a placeholder
                    for (const st of redactTexts) {
                        if (val.includes(st)) {
                            val = val.split(st).join("***REDACTED***");
                            obj[key] = val;
                        }
                    }
                } else {
                    // Recursively process nested structures
                    recursiveRedact(obj[key]);
                }
            }
        }
    }

    // 4. Run the recursive redaction step if patterns are defined
    if (redactTexts.length > 0) {
        recursiveRedact(data);
        console.log(`[${bomFile}] Redacted sensitive URLs/text.`);
    }

    // 5. Write the sanitized BOM data back to the same file in place
    fs.writeFileSync(bomFile, JSON.stringify(data, null, 2));
}

// ── Command-Line Interface Parsing ───────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: node sanitize_bom.js <bom_file> [--config <config.json>]");
    process.exit(1);
}

const bomFile = args[0];
let configPath = null;

// Parse optional --config argument
const configIdx = args.indexOf('--config');
if (configIdx !== -1 && configIdx + 1 < args.length) {
    configPath = args[configIdx + 1];
}

// Run the sanitization routine
sanitizeBom(bomFile, configPath);
