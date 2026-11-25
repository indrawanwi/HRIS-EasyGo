import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, asc } from 'drizzle-orm';

const SCHEMA_MAP: Record<string, any> = {
  directorates: schema.directorates,
  departments: schema.departments,
  units: schema.units,
  grades: schema.grades,
  positions: schema.positions,
  'work-patterns': schema.workPatterns,
  'work-schedules': schema.workSchedules,
  banks: schema.banks,
  'payment-methods': schema.paymentMethods,
  'expense-items': schema.expenseItems,
  activities: schema.activities,
  'leave-types': schema.leaveTypes,
  users: schema.users,
  contracts: schema.contracts,
  'leave-quotas': schema.leaveQuotas,
};

export async function GET(
  req: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    const table = SCHEMA_MAP[params.entity];
    if (!table) {
      return NextResponse.json({ error: `Master entity '${params.entity}' not found` }, { status: 404 });
    }

    const data = await db.select().from(table);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`Error fetching master ${params.entity}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    const table = SCHEMA_MAP[params.entity];
    if (!table) {
      return NextResponse.json({ error: `Master entity '${params.entity}' not found` }, { status: 404 });
    }

    const body = await req.json();
    const insertData = { ...body };
    // If ID is falsy or 0 for serial/auto-generated tables, delete it so PostgreSQL can auto-increment
    if ('id' in insertData && (!insertData.id || insertData.id === 0 || insertData.id === '')) {
      delete insertData.id;
    }

    // Atomic transaction using Drizzle ORM
    const result = await db.transaction(async (tx) => {
      return await tx.insert(table).values(insertData).returning();
    });

    return NextResponse.json({ success: true, item: result[0] }, { status: 201 });
  } catch (err: any) {
    console.error(`Error creating master ${params.entity}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    const table = SCHEMA_MAP[params.entity];
    if (!table) {
      return NextResponse.json({ error: `Master entity '${params.entity}' not found` }, { status: 404 });
    }

    const body = await req.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required for update' }, { status: 400 });
    }

    const targetId = !isNaN(Number(id)) && ['banks', 'positions', 'leave-quotas'].includes(params.entity)
      ? Number(id)
      : id;

    // Atomic transaction using Drizzle ORM
    const result = await db.transaction(async (tx) => {
      return await tx.update(table).set(updateFields).where(eq(table.id, targetId as any)).returning();
    });

    return NextResponse.json({ success: true, item: result[0] });
  } catch (err: any) {
    console.error(`Error updating master ${params.entity}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    const table = SCHEMA_MAP[params.entity];
    if (!table) {
      return NextResponse.json({ error: `Master entity '${params.entity}' not found` }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Query param id is required for deletion' }, { status: 400 });
    }

    const targetId = !isNaN(Number(id)) && ['banks', 'positions', 'leave-quotas'].includes(params.entity)
      ? Number(id)
      : id;

    await db.transaction(async (tx) => {
      await tx.delete(table).where(eq(table.id, targetId as any));
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error(`Error deleting master ${params.entity}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
