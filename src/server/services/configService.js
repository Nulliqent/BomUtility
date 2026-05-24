const path = require('path');
const { readJsonSafe, writeJsonSafe } = require('../../utils/file_utils');

const CONFIG_FILE = path.join(process.cwd(), 'config/eol_config.json');

function getConfig() {
    return readJsonSafe(CONFIG_FILE, { tracked_products: [] });
}

function saveConfig(data) {
    return writeJsonSafe(CONFIG_FILE, data);
}

module.exports = { getConfig, saveConfig };
