import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const fptks = await db.select().from(schema.fptkRequests).orderBy(schema.fptkRequests.id);
    const candidateList = await db.select().from(schema.candidates).orderBy(schema.candidates.id);
    const jobs = await db.select().from(schema.jobOrders).orderBy(schema.jobOrders.id);
    const onboarding = await db.select().from(schema.onboardingSteps).orderBy(asc(schema.onboardingSteps.stepOrder));

    return NextResponse.json({
      fptks,
      candidates: candidateList,
      jobOrders: jobs,
      onboarding,
    });
  } catch (err: any) {
    console.error('Fetch recruitment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'create_fptk') {
      const nextId = 'FP-' + Math.floor(1000 + Math.random() * 9000);
      const [res] = await db
        .insert(schema.fptkRequests)
        .values({
          id: nextId,
          positionTitle: payload.positionTitle,
          departmentId: payload.departmentId || 'DP-01',
          requestedCount: payload.requestedCount || 1,
          reason: payload.reason || '',
          minSalary: String(payload.minSalary || 6000000),
          maxSalary: String(payload.maxSalary || 8500000),
          status: 'Menunggu Direktur',
        })
        .returning();
      return NextResponse.json({ success: true, fptk: res });
    }

    if (action === 'update_candidate_stage') {
      const [res] = await db
        .update(schema.candidates)
        .set({ stage: payload.stage, offeringSalary: payload.offeringSalary ? String(payload.offeringSalary) : null })
        .where(eq(schema.candidates.id, payload.candidateId))
        .returning();
      return NextResponse.json({ success: true, candidate: res });
    }

    if (action === 'toggle_onboarding_step') {
      const [res] = await db
        .update(schema.onboardingSteps)
        .set({
          isCompleted: payload.isCompleted,
          completedAt: payload.isCompleted ? new Date() : null,
        })
        .where(eq(schema.onboardingSteps.id, payload.stepId))
        .returning();
      return NextResponse.json({ success: true, step: res });
    }

    if (action === 'create_job_order') {
      const nextId = 'JO-' + Math.floor(1000 + Math.random() * 9000);
      const [res] = await db
        .insert(schema.jobOrders)
        .values({
          id: nextId,
          code: 'JO-2026-' + Math.floor(100 + Math.random() * 900),
          title: payload.title,
          empId: payload.empId || 'E04',
          city: payload.city || 'Jakarta',
          date: payload.date || new Date().toISOString().slice(0, 10),
          status: 'Ditetapkan',
          notes: payload.notes || '',
        })
        .returning();
      return NextResponse.json({ success: true, jobOrder: res });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Recruitment action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
