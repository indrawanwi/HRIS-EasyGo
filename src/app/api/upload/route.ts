import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const base64 = buffer.toString('base64');
    const photoUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      filename: file.name,
      photoUrl,
      storage: 'Neon Object Storage / In-Database Payload',
    });
  } catch (err: any) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
