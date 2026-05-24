import { NextResponse } from 'next/server';
import { uploadBoms } from '../../../src/server/services/bomService';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const packages = uploadBoms(data.files || []);
        return NextResponse.json({ success: true, packages });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
