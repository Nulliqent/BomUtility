import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = process.cwd();

export async function POST() {
    try {
        const reportsPath = path.join(ROOT_DIR, 'reports');
        if (fs.existsSync(reportsPath)) fs.rmSync(reportsPath, { recursive: true, force: true });
        
        const filesPath = path.join(ROOT_DIR, 'files');
        if (fs.existsSync(filesPath)) {
            const files = fs.readdirSync(filesPath);
            for (const f of files) {
                if (f.endsWith('.json')) fs.unlinkSync(path.join(filesPath, f));
            }
        }
        
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
