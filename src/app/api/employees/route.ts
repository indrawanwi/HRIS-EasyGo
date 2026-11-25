import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const list = await db
      .select({
        id: schema.employees.id,
        nik: schema.employees.nik,
        name: schema.employees.name,
        positionTitle: schema.employees.positionTitle,
        departmentId: schema.employees.departmentId,
        directorateId: schema.employees.directorateId,
        gradeId: schema.employees.gradeId,
        email: schema.employees.email,
        phone: schema.employees.phone,
        joinDate: schema.employees.joinDate,
        ptkp: schema.employees.ptkp,
        isActive: schema.employees.isActive,
        photoUrl: schema.employees.photoUrl,
      })
      .from(schema.employees)
      .orderBy(schema.employees.id);

    return NextResponse.json(list);
  } catch (err: any) {
    console.error('Fetch employees error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      nik,
      name,
      positionTitle,
      departmentId,
      directorateId,
      gradeId,
      scheduleId,
      managerId,
      joinDate,
      phone,
      email,
      ktp,
      npwp,
      ptkp = 'TK/0',
      basicSalary = 5000000,
      contractType = 'PKWTT',
    } = body;

    const result = await db.transaction(async (tx) => {
      // 1. Insert employee
      const [newEmp] = await tx
        .insert(schema.employees)
        .values({
          id,
          nik,
          name,
          positionTitle,
          departmentId,
          directorateId,
          gradeId,
          scheduleId: scheduleId || 'JD-01',
          managerId,
          joinDate: joinDate || new Date().toISOString().slice(0, 10),
          phone,
          email,
          ktp,
          npwp,
          ptkp,
          isActive: true,
        })
        .returning();

      // 2. Insert contract
      await tx.insert(schema.contracts).values({
        id: 'CT-' + id,
        empId: id,
        contractType,
        startDate: joinDate || new Date().toISOString().slice(0, 10),
        basicSalary: String(basicSalary),
      });

      // 3. Initialize annual leave quota (JC-01)
      await tx.insert(schema.leaveQuotas).values({
        empId: id,
        leaveTypeId: 'JC-01',
        year: new Date().getFullYear(),
        allocatedDays: 12,
        usedDays: 0,
        remainingDays: 12,
      });

      return newEmp;
    });

    return NextResponse.json({ success: true, employee: result }, { status: 201 });
  } catch (err: any) {
    console.error('Create employee error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
