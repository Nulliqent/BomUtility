const fs = require('fs');

/**
 * Safely reads and parses a JSON file, returning a default value if it fails.
 */
function readJsonSafe(filePath, defaultReturn = null) {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Failed to parse JSON at ${filePath}:`, e.message);
        }
    }
    return defaultReturn;
}

/**
 * Safely writes a JSON object to disk.
 */
function writeJsonSafe(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Failed to write JSON to ${filePath}:`, e.message);
        return false;
    }
}

module.exports = {
    readJsonSafe,
    writeJsonSafe
};
