import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dataUrl, filename } = body;
    if (!dataUrl) return NextResponse.json({ ok: false, error: 'Missing dataUrl' }, { status: 400 });

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Parse data URL
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return NextResponse.json({ ok: false, error: 'Invalid data URL' }, { status: 400 });
    const mime = matches[1];
    const b64 = matches[2];

    // choose extension from mime
    const ext = mime.split('/')[1] || 'png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try { await fs.mkdir(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }

    const filePath = path.join(uploadsDir, name);
    const buffer = Buffer.from(b64, 'base64');
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${name}`;
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
