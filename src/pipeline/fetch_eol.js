/**
 * @file fetch_eol.js
 * @description Scans microservice CycloneDX BOM files, queries the endoflife.date API
 * (with built-in local caching), determines the EOL support lifecycle for each package,
 * and outputs a unified `eol-data.json` database.
 * 
 * Major Feature: It calculates the absolute "Latest Supported" version of a product
 * across all product cycles (falling back to the absolute latest version if all are EOL).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const {
    determineEolStatus,
    findMatchingCycle,
    findLatestSupportedCycle
} = require('./eol_logic');

// Constant configurations & workspace directories
const CONFIG_FILE = 'config/eol_config.json';
const FILES_DIR = 'files';
const REPORTS_DIR = 'reports';
const CACHE_DIR = path.join(REPORTS_DIR, '.eol-cache');
const OUTPUT_FILE = path.join(REPORTS_DIR, 'eol-data.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Loads the user-defined mappings from eol_config.json.
 * 
 * @returns {object} Parsed configuration object.
 */
function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
        console.error(`❌ Could not read ${CONFIG_FILE}:`, e.message);
        process.exit(1);
    }
}

/**
 * Executes a secure HTTP GET request with redirect handling and parses the response as JSON.
 * 
 * @param {string} url - Target API URL to query.
 * @param {number} [maxRedirects=3] - Maximum redirection limits to avoid infinite loops.
 * @returns {Promise<any|null>} Promise resolving to parsed JSON data, or null on 404 (not found).
 */
function httpGet(url, maxRedirects = 3) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'sbom-eol-checker/1.0' } }, (res) => {
            // Follow HTTP 301/302 redirects automatically
            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                if (maxRedirects <= 0) {
                    reject(new Error(`Too many redirects for ${url}`));
                    res.resume();
                    return;
                }
                res.resume();
                return resolve(httpGet(res.headers.location, maxRedirects - 1));
            }
            // 404 implies the queried technology isn't supported or mapped on endoflife.date
            if (res.statusCode === 404) {
                resolve(null);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                res.resume();
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`JSON parse error for ${url}`)); }
            });
        }).on('error', reject);
    });
}

/**
 * Recursively creates a directory if it does not already exist.
 * 
 * @param {string} dir - Directory path to create.
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Cache Management ─────────────────────────────────────────────────────────

/**
 * Resolves the cache file path for a specific product.
 * 
 * @param {string} slug - Product identifier (e.g., 'spring-boot').
 * @returns {string} Path to the cache JSON file.
 */
function getCachePath(slug) {
    return path.join(CACHE_DIR, `${slug}.json`);
}

/**
 * Reads local cached EOL data if it has not expired yet.
 * 
 * @param {string} slug - Product identifier.
 * @param {number} ttlHours - Time-To-Live expiration window in hours.
 * @returns {object|null} The cached JSON data, or null if expired/non-existent.
 */
function readCache(slug, ttlHours) {
    const cachePath = getCachePath(slug);
    if (!fs.existsSync(cachePath)) return null;

    try {
        const stat = fs.statSync(cachePath);
        const ageMs = Date.now() - stat.mtimeMs;
        // Verify age limits against TTL rules
        if (ageMs > ttlHours * 3600 * 1000) return null;

        return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Writes fetched API data to the local product cache.
 * 
 * @param {string} slug - Product identifier.
 * @param {object} data - EOL cycles array payload to cache.
 */
function writeCache(slug, data) {
    ensureDir(CACHE_DIR);
    fs.writeFileSync(getCachePath(slug), JSON.stringify(data, null, 2));
}

// ── BOM Scanning & Product Mapping ───────────────────────────────────────────

/**
 * Parses package URL (purl) formats to extract Maven group coordinates.
 * 
 * @param {string} purl - The package url string.
 * @returns {string} Extracted group coordinate or empty string.
 */
function extractGroupFromPurl(purl) {
    if (!purl) return '';
    const match = purl.match(/^pkg:maven\/([^/]+)\//);
    return match ? match[1] : '';
}

/**
 * Determines whether a scanned component matches a configured EOL technology mapping.
 * 
 * @param {object} comp - CycloneDX BOM component object.
 * @param {object} mapping - User-configured EOL mapping rule.
 * @returns {boolean} True if the component matches the mapping rule.
 */
function matchesMapping(comp, mapping) {
    const compGroup = comp.group || extractGroupFromPurl(comp.purl) || '';
    const compName = comp.name || '';

    const mGroup = mapping.group;
    const mName = mapping.name;

    // NPM-style packages (group is null, match solely on component name)
    if ((mGroup === null || mGroup === undefined) && mName) {
        return compName === mName;
    }

    // Wildcard Group mappings (group is set, name is null, match any package inside the group)
    if (mGroup && (mName === null || mName === undefined)) {
        return compGroup === mGroup;
    }

    // Maven-style explicit coordinates (both are set, must match exactly)
    if (mGroup && mName) {
        return compGroup === mGroup && compName === mName;
    }

    return false;
}

/**
 * Scans a single CycloneDX BOM file to extract dependencies matching EOL mappings.
 * 
 * @param {string} bomFile - Path to the BOM JSON file.
 * @param {Array<object>} mappings - List of EOL product mappings.
 * @returns {object} Map of matched products (eolSlug -> package details).
 */
function scanBomForProducts(bomFile, mappings) {
    let bom;
    try {
        bom = JSON.parse(fs.readFileSync(bomFile, 'utf8'));
    } catch (e) {
        console.error(`  ⚠️  Could not parse ${bomFile}:`, e.message);
        return {};
    }

    const components = bom.components || [];
    const detected = {};

    for (const mapping of mappings) {
        const slug = mapping.eolSlug;
        if (detected[slug]) continue; // Skip if this slug has already been matched

        for (const comp of components) {
            if (matchesMapping(comp, mapping)) {
                const version = comp.version || '';
                if (version) {
                    detected[slug] = {
                        slug,
                        version,
                        componentName: comp.name || '',
                        group: comp.group || extractGroupFromPurl(comp.purl) || '',
                        purl: comp.purl || ''
                    };
                    break; // Keep only one dominant match per product slug per BOM
                }
            }
        }
    }
    return detected;
}

// ── Main Pipeline Execution ──────────────────────────────────────────────────

async function main() {
    const config = loadConfig();
    const trackedProducts = config.tracked_products || [];
    const ttlHours = config.cache_ttl_hours || 24;
    const today = new Date();

    if (trackedProducts.length === 0) {
        console.log('⚠️  No tracked products found in eol_config.json.');
        return;
    }

    ensureDir(REPORTS_DIR);

    // Build flat mappings array for CycloneDX BOM scanning
    const scanMappings = [];
    for (const tp of trackedProducts) {
        if (tp.mappings) {
            for (const m of tp.mappings) {
                scanMappings.push({
                    ...m,
                    eolSlug: tp.slug
                });
            }
        }
    }

    // 1. Scan the pipeline files directory for CycloneDX BOMs (if directory exists and contains BOMs)
    let bomFiles = [];
    if (fs.existsSync(FILES_DIR)) {
        bomFiles = fs.readdirSync(FILES_DIR).filter(f => f.endsWith('.json'));
    }

    const allDetected = {};

    if (bomFiles.length > 0) {
        console.log(`📅 Scanning ${bomFiles.length} BOM file(s) for EOL products...`);
        for (const bomFile of bomFiles) {
            const fullPath = path.join(FILES_DIR, bomFile);
            const baseName = bomFile.replace('.json', '');
            console.log(`  📦 ${bomFile}`);

            // Scan this BOM and collect technology hits
            const detected = scanBomForProducts(fullPath, scanMappings);
            allDetected[baseName] = detected;
        }
    } else {
        console.log('⚠️  No BOM files found in files/ directory. EOL audit will run in pure preconfigured/static mode.');
    }

    // Identify unique slugs needed based on what was actually detected in the BOMs
    const detectedSlugs = new Set();
    Object.values(allDetected).forEach(detectedMap => {
        Object.keys(detectedMap).forEach(slug => detectedSlugs.add(slug));
    });

    const slugsNeeded = new Set();
    trackedProducts.forEach(tp => {
        slugsNeeded.add(tp.slug);
    });

    console.log(`  🔎 Filtered down to ${slugsNeeded.size} product(s) that were actively detected: ${[...slugsNeeded].join(', ')}`);

    // 2. Fetch/resolve EOL data for all unique slugs (with caching layer)
    const eolResponses = {};

    for (const slug of slugsNeeded) {
        const cached = readCache(slug, ttlHours);
        if (cached) {
            console.log(`  ✅ ${slug} (cached)`);
            eolResponses[slug] = cached;
            continue;
        }

        const url = `https://endoflife.date/api/${slug}.json`;
        console.log(`  🌐 Fetching ${url}...`);
        try {
            const data = await httpGet(url);
            if (data) {
                eolResponses[slug] = data;
                writeCache(slug, data);
                console.log(`  ✅ ${slug} (${data.length} cycles)`);
            } else {
                console.log(`  ⚠️  ${slug}: product not found on endoflife.date`);
                eolResponses[slug] = [];
            }
        } catch (e) {
            console.error(`  ❌ ${slug}: ${e.message}`);
            eolResponses[slug] = [];
        }

        // Small respectful API pacing delay
        await new Promise(r => setTimeout(r, 200));
    }

    // 3. Build enriched EOL outputs mapped per microservice
    const output = {
        generated_at: today.toISOString(),
        services: {}
    };

    // Populate service-specific product EOL information if BOM files were scanned
    for (const [baseName, detected] of Object.entries(allDetected)) {
        const serviceProducts = {};

        for (const [productName, info] of Object.entries(detected)) {
            const cycles = eolResponses[info.slug] || [];
            const matchedCycle = findMatchingCycle(cycles, info.version);
            const eolStatus = determineEolStatus(matchedCycle, today);
            const latestSupportedCycle = findLatestSupportedCycle(cycles, today);

            serviceProducts[productName] = {
                slug: info.slug,
                detected_version: info.version,
                component_name: info.componentName,
                group: info.group,
                purl: info.purl,
                cycle: matchedCycle ? String(matchedCycle.cycle) : null,
                eol_status: eolStatus.status,
                eol_label: eolStatus.label,
                eol_date: matchedCycle ? (typeof matchedCycle.eol === 'string' ? matchedCycle.eol : null) : null,
                support_date: matchedCycle ? (typeof matchedCycle.support === 'string' ? matchedCycle.support : null) : null,
                lts: matchedCycle ? matchedCycle.lts : null,
                latest_supported: latestSupportedCycle ? latestSupportedCycle.latest : null,
                latest_supported_release_date: latestSupportedCycle ? latestSupportedCycle.latestReleaseDate : null
            };
        }

        output.services[baseName] = serviceProducts;
    }

    // If BOM files were present, ensure all scanned services are initialized in output.services
    if (bomFiles.length > 0) {
        for (const bomFile of bomFiles) {
            const baseName = bomFile.replace('.json', '');
            if (!output.services[baseName]) {
                output.services[baseName] = {};
            }
        }
    }

    // 4. Compile flat technology summary mapped with usage details
    // Build this directly from preconfigured tracked_products to ensure they are all displayed,
    // and enrich it with service usage details.
    const allProducts = {};

    for (const tp of trackedProducts) {
        if (!slugsNeeded.has(tp.slug)) continue;

        const cycles = eolResponses[tp.slug] || [];
        const matchedCycle = findMatchingCycle(cycles, tp.version);
        const eolStatus = determineEolStatus(matchedCycle, today);
        const latestSupportedCycle = findLatestSupportedCycle(cycles, today);

        // Find service names using this product (from BOM scan)
        const servicesUsing = [];
        for (const [baseName, serviceProducts] of Object.entries(output.services)) {
            if (serviceProducts[tp.slug]) {
                servicesUsing.push(baseName);
            }
        }

        allProducts[tp.slug] = {
            slug: tp.slug,
            detected_version: tp.version,
            component_name: tp.mappings && tp.mappings[0] ? tp.mappings[0].name : null,
            group: tp.mappings && tp.mappings[0] ? tp.mappings[0].group : null,
            purl: tp.mappings && tp.mappings[0] ? `pkg:generic/${tp.slug}@${tp.version}` : null,
            cycle: matchedCycle ? String(matchedCycle.cycle) : null,
            eol_status: eolStatus.status,
            eol_label: eolStatus.label,
            eol_date: matchedCycle ? (typeof matchedCycle.eol === 'string' ? matchedCycle.eol : null) : null,
            support_date: matchedCycle ? (typeof matchedCycle.support === 'string' ? matchedCycle.support : null) : null,
            lts: matchedCycle ? matchedCycle.lts : null,
            latest_supported: latestSupportedCycle ? latestSupportedCycle.latest : null,
            latest_supported_release_date: latestSupportedCycle ? latestSupportedCycle.latestReleaseDate : null,
            services: servicesUsing
        };
    }

    // Aggregate summary statuses
    let eolCount = 0, approachingCount = 0, supportedCount = 0;
    for (const p of Object.values(allProducts)) {
        if (p.eol_status === 'eol') eolCount++;
        else if (p.eol_status === 'approaching') approachingCount++;
        else if (p.eol_status === 'supported') supportedCount++;
    }

    output.summary = {
        total_products_tracked: Object.keys(allProducts).length,
        eol: eolCount,
        approaching_eol: approachingCount,
        supported: supportedCount,
        all_products: allProducts
    };

    // 5. Write database JSON out
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n📄 EOL data written to ${OUTPUT_FILE}`);
    console.log(`   🟢 Supported: ${supportedCount}  🟡 Approaching EOL: ${approachingCount}  🔴 EOL: ${eolCount}`);
}

// Run async main executor
main().catch(e => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
});
