import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await db.execute(sql`SELECT 1 as ping`);
    const nowJakarta = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    return NextResponse.json({
      status: 'UP',
      app: 'HRIS EasyGo Next.js App Router',
      version: '6.3.0',
      database: 'Connected (Neon PostgreSQL)',
      timestampJakarta: nowJakarta,
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'DOWN',
        error: err.message,
      },
      { status: 503 }
    );
  }
}
