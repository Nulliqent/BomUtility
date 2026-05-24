import { NextResponse } from 'next/server';
import { saveConfig } from '../../../src/server/services/configService';

export async function POST(req: Request) {
    try {
        const config = await req.json();
        saveConfig(config);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
