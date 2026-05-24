import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getBomPackages, getExistingFiles } from '../../../src/server/services/bomService';
import { getRegistry } from '../../../src/server/services/registryService';

const ROOT_DIR = process.cwd();

export async function GET() {
    try {
        const configPath = path.join(ROOT_DIR, 'config', 'eol_config.json');
        const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : { tracked_products: [] };
        
        const registry = await getRegistry();
        
        return NextResponse.json({ 
            registry,
            config,
            packages: getBomPackages(),
            files: getExistingFiles()
        });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to load registry', details: e.message }, { status: 500 });
    }
}
