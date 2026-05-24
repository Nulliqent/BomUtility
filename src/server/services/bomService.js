const fs = require('fs');
const path = require('path');
const { readJsonSafe } = require('../../utils/file_utils');

const BOM_DIR = path.join(process.cwd(), 'files');

function getBomPackages() {
    // Left for backwards compatibility if ever needed
    const uniquePackages = new Set();
    if (fs.existsSync(BOM_DIR)) {
        const files = fs.readdirSync(BOM_DIR);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const bom = readJsonSafe(path.join(BOM_DIR, file), {});
                if (bom.components) {
                    bom.components.forEach(comp => {
                        const group = comp.group;
                        const name = comp.name;
                        if (name) {
                            uniquePackages.add(group ? `${group}:${name}` : name);
                        }
                    });
                }
            }
        }
    }
    return Array.from(uniquePackages).sort();
}

function uploadBoms(filesData) {
    if (!fs.existsSync(BOM_DIR)) fs.mkdirSync(BOM_DIR, { recursive: true });
    
    // Clear existing BOMs
    const existing = fs.readdirSync(BOM_DIR);
    for (const f of existing) {
        if (f.endsWith('.json')) fs.unlinkSync(path.join(BOM_DIR, f));
    }

    const uniquePackages = new Set();
    
    for (const fileObj of filesData) {
        if (!fileObj.name || !fileObj.content) continue;
        const safeName = path.basename(fileObj.name);
        const filePath = path.join(BOM_DIR, safeName);
        fs.writeFileSync(filePath, fileObj.content, 'utf8');
        
        try {
            const bom = JSON.parse(fileObj.content);
            if (bom.components) {
                bom.components.forEach(comp => {
                    const group = comp.group;
                    const name = comp.name;
                    if (name) uniquePackages.add(group ? `${group}:${name}` : name);
                });
            }
        } catch (e) {
            console.error('Error parsing uploaded bom', safeName);
        }
    }
    
    return Array.from(uniquePackages).sort();
}

function getExistingFiles() {
    if (fs.existsSync(BOM_DIR)) {
        return fs.readdirSync(BOM_DIR).filter(f => f.endsWith('.json')).map(f => ({ name: f }));
    }
    return [];
}

module.exports = { getBomPackages, uploadBoms, getExistingFiles };
