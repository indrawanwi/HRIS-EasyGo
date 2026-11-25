import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50);
    const dbLatencyMs = Date.now() - startTime;

    // RBAC Permission Matrix definition
    const rbacMatrix = [
      {
        role: 'super / admin',
        description: 'Akses penuh ke semua modul, konfigurasi master, dan audit sistem',
        modules: ['Data Master', 'Karyawan', 'Presensi', 'Approval', 'Rekrutmen', 'Payroll', 'Audit Trail'],
      },
      {
        role: 'direksi',
        description: 'Persetujuan tingkat akhir (Director Step), review eksekutif, dan FPTK',
        modules: ['Dasbor Eksekutif', 'Approval Direksi', 'Rekrutmen FPTK', 'Laporan Payroll'],
      },
      {
        role: 'hr',
        description: 'Manajemen karyawan, kuota cuti, rekrutmen, dan alur HR review',
        modules: ['Data Master SDM', 'Karyawan', 'Presensi', 'Approval HR', 'Rekrutmen', 'Onboarding'],
      },
      {
        role: 'finance',
        description: 'Pencairan dana (Disbursement), verifikasi rekening, dan eksekusi payroll',
        modules: ['Data Master Keuangan', 'Disbursement', 'Approval Finance', 'Payroll Batch', 'Rekonsiliasi PPh 21'],
      },
      {
        role: 'atasan (manager)',
        description: 'Persetujuan bawahan langsung, review timesheet, penugasan job order',
        modules: ['Approval Atasan', 'Job Orders', 'Review Timesheet'],
      },
      {
        role: 'karyawan',
        description: 'Portal mandiri: clock-in/out GPS, timesheet, pengajuan cuti & lembur',
        modules: ['Presensi Mandiri', 'Isi Timesheet', 'Ajukan Cuti & Lembur', 'Slip Gaji Pribadi'],
      },
    ];

    return NextResponse.json({
      health: {
        status: 'UP',
        database: 'Connected (Neon Serverless PostgreSQL)',
        branch: process.env.NEON_BRANCH || 'main',
        dbLatencyMs,
        runtime: 'Next.js App Router & Node.js ' + process.version,
        environment: process.env.NODE_ENV || 'production',
        timezone: 'Asia/Jakarta (WIB)',
      },
      logs,
      rbacMatrix,
    });
  } catch (err: any) {
    console.error('Fetch audit logs error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, entityType, entityId, payload } = body;

    const [newLog] = await db
      .insert(schema.auditLogs)
      .values({
        userId: userId || 'US-SYSTEM',
        action: action || 'SECURITY_AUDIT_LOG',
        entityType: entityType || 'System',
        entityId: entityId || '0',
        payload: payload || {},
        ipAddress: '127.0.0.1',
      })
      .returning();

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (err: any) {
    console.error('Create audit log error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
