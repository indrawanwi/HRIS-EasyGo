import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, desc } from 'drizzle-orm';
// @ts-ignore
import { runAllGoldenScenarios, calculateEmployeePayroll, calculateDecemberPasal17Reconciliation } from '@/features/payroll/engine/calculator';

export async function GET(req: NextRequest) {
  try {
    const periods = await db
      .select()
      .from(schema.payrollPeriods)
      .orderBy(desc(schema.payrollPeriods.startDate));

    const items = await db
      .select({
        id: schema.payrollItems.id,
        periodId: schema.payrollItems.periodId,
        empId: schema.payrollItems.empId,
        basicSalary: schema.payrollItems.basicSalary,
        allowances: schema.payrollItems.allowances,
        overtimePay: schema.payrollItems.overtimePay,
        deductions: schema.payrollItems.deductions,
        bpjsEmployee: schema.payrollItems.bpjsEmployee,
        bpjsCompany: schema.payrollItems.bpjsCompany,
        pph21: schema.payrollItems.pph21,
        netPay: schema.payrollItems.netPay,
        empName: schema.employees.name,
        nik: schema.employees.nik,
        positionTitle: schema.employees.positionTitle,
      })
      .from(schema.payrollItems)
      .leftJoin(schema.employees, eq(schema.payrollItems.empId, schema.employees.id))
      .orderBy(schema.payrollItems.empId);

    return NextResponse.json({ periods, items });
  } catch (err: any) {
    console.error('Fetch payroll error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'run_golden_tests') {
      const results = runAllGoldenScenarios();
      const allPassed = results.every((r: any) => r.passed);
      return NextResponse.json({
        success: true,
        summary: {
          total: results.length,
          passed: results.filter((r: any) => r.passed).length,
          failed: results.filter((r: any) => !r.passed).length,
          rate: allPassed ? '100%' : 'Failed',
        },
        scenarios: results,
      });
    }

    if (action === 'create_period') {
      const { name, startDate, endDate, payDate, preparerId } = payload;
      const periodId = 'PR-' + Math.floor(1000 + Math.random() * 9000);

      const [newPeriod] = await db
        .insert(schema.payrollPeriods)
        .values({
          id: periodId,
          name: name || 'Gaji Periode Baru',
          periodType: 'Gaji bulanan',
          startDate: startDate || '2026-11-01',
          endDate: endDate || '2026-11-30',
          payDate: payDate || '2026-11-28',
          status: 'Draf',
          preparerId: preparerId || 'E10',
        })
        .returning();

      return NextResponse.json({ success: true, period: newPeriod }, { status: 201 });
    }

    if (action === 'calculate_batch') {
      const { periodId } = payload;

      const [period] = await db
        .select()
        .from(schema.payrollPeriods)
        .where(eq(schema.payrollPeriods.id, periodId));

      if (!period) {
        return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
      }

      // Fetch all employees and their contracts
      const empList = await db.select().from(schema.employees);
      const calculatedItems = [];

      for (const emp of empList) {
        const [contract] = await db
          .select()
          .from(schema.contracts)
          .where(eq(schema.contracts.empId, emp.id));

        const basicSalary = contract ? Number(contract.basicSalary) : 6000000;

        // Run calculator
        const calcResult = calculateEmployeePayroll({
          basicSalary,
          allowances: 1000000,
          overtimeHours: emp.positionTitle.includes('Teknisi') ? 6 : 0,
          maritalStatus: emp.ptkp || 'TK/0',
          hasNpwp: !!emp.npwp,
          month: 11,
          isDecember: false,
        });

        const itemId = `PI-${periodId}-${emp.id}`;

        // Upsert into payroll_items
        const [saved] = await db
          .insert(schema.payrollItems)
          .values({
            id: itemId,
            periodId,
            empId: emp.id,
            basicSalary: String(calcResult.basicSalary),
            allowances: String(calcResult.allowances),
            overtimePay: String(calcResult.overtimePay),
            deductions: String(calcResult.deductions),
            bpjsEmployee: String(calcResult.bpjsEmployee),
            bpjsCompany: String(calcResult.bpjsCompany),
            pph21: String(calcResult.pph21),
            netPay: String(calcResult.netPay),
            calculationDetails: calcResult,
          })
          .onConflictDoUpdate({
            target: schema.payrollItems.id,
            set: {
              basicSalary: String(calcResult.basicSalary),
              allowances: String(calcResult.allowances),
              overtimePay: String(calcResult.overtimePay),
              deductions: String(calcResult.deductions),
              bpjsEmployee: String(calcResult.bpjsEmployee),
              bpjsCompany: String(calcResult.bpjsCompany),
              pph21: String(calcResult.pph21),
              netPay: String(calcResult.netPay),
              calculationDetails: calcResult,
            },
          })
          .returning();

        calculatedItems.push(saved);
      }

      // Update period status
      await db
        .update(schema.payrollPeriods)
        .set({ status: 'Dihitung' })
        .where(eq(schema.payrollPeriods.id, periodId));

      return NextResponse.json({
        success: true,
        periodId,
        count: calculatedItems.length,
        items: calculatedItems,
      });
    }

    if (action === 'december_reconciliation') {
      const { annualGrossIncome, previousWithheldPph21, ptkpCategory, hasNpwp } = payload;
      const recon = calculateDecemberPasal17Reconciliation({
        annualGrossIncome: annualGrossIncome || 180000000,
        previousWithheldPph21: previousWithheldPph21 || 12000000,
        ptkpCategory: ptkpCategory || 'TK/0',
        hasNpwp: hasNpwp !== false,
      });

      return NextResponse.json({ success: true, reconciliation: recon });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Payroll action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
