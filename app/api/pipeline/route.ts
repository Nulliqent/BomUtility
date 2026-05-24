import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const ROOT_DIR = process.cwd();

export async function POST() {
    const scriptPath = path.join(ROOT_DIR, 'src/pipeline/scan.sh');

    const stream = new ReadableStream({
        start(controller) {
            const scanProc = spawn('bash', [scriptPath], { cwd: ROOT_DIR });

            scanProc.stdout.on('data', (data) => {
                controller.enqueue(data);
            });

            scanProc.stderr.on('data', (data) => {
                controller.enqueue(data);
            });

            scanProc.on('close', (code) => {
                controller.enqueue(new TextEncoder().encode(`\n\nProcess exited with code ${code}\n`));
                controller.close();
            });

            scanProc.on('error', (err) => {
                controller.enqueue(new TextEncoder().encode(`\n\nProcess error: ${err.message}\n`));
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
