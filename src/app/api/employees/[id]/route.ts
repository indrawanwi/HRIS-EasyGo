import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, params.id));

    if (!emp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Also fetch contracts and quotas
    const contracts = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.empId, params.id));

    const quotas = await db
      .select()
      .from(schema.leaveQuotas)
      .where(eq(schema.leaveQuotas.empId, params.id));

    return NextResponse.json({
      ...emp,
      contracts,
      leaveQuotas: quotas,
    });
  } catch (err: any) {
    console.error(`Fetch employee ${params.id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { contracts, leaveQuotas, ...empData } = body;

    const [updated] = await db.transaction(async (tx) => {
      const res = await tx
        .update(schema.employees)
        .set(empData)
        .where(eq(schema.employees.id, params.id))
        .returning();

      return res;
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (err: any) {
    console.error(`Update employee ${params.id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
