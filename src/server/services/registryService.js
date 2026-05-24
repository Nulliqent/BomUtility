const fs = require('fs');
const path = require('path');
const { fetchJson } = require('../../utils/api_utils');
const { readJsonSafe, writeJsonSafe } = require('../../utils/file_utils');

const CACHE_DIR = path.join(process.cwd(), '.eol_cache');
const REGISTRY_CACHE_FILE = path.join(CACHE_DIR, 'all_products.json');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function fetchRegistryFromAPI() {
    const parsed = await fetchJson('https://endoflife.date/api/all.json');
    writeJsonSafe(REGISTRY_CACHE_FILE, parsed);
    return parsed;
}

async function getRegistry() {
    if (fs.existsSync(REGISTRY_CACHE_FILE)) {
        const stats = fs.statSync(REGISTRY_CACHE_FILE);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < 14 * 24 * 60 * 60 * 1000) {
            const cached = readJsonSafe(REGISTRY_CACHE_FILE);
            if (cached) return cached;
        }
    }
    
    try {
        return await fetchRegistryFromAPI();
    } catch (e) {
        console.warn('⚠️ Could not fetch from API. Trying to fallback to old cache...');
        if (fs.existsSync(REGISTRY_CACHE_FILE)) {
            return readJsonSafe(REGISTRY_CACHE_FILE);
        }
        throw new Error('No internet connection and no cached registry found.');
    }
}

module.exports = {
    getRegistry
};
