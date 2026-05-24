import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = process.cwd();

export async function GET(req: Request, context: { params: Promise<{ slug: string[] }> }) {
    try {
        const { slug } = await context.params;
        const filePath = path.join(ROOT_DIR, 'reports', ...slug);
        
        if (!fs.existsSync(filePath)) {
            return new NextResponse('Report not found', { status: 404 });
        }

        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.html') contentType = 'text/html';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.js') contentType = 'application/javascript';

        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
            headers: { 'Content-Type': contentType }
        });
    } catch (e: any) {
        return new NextResponse('Error loading report: ' + e.message, { status: 500 });
    }
}
