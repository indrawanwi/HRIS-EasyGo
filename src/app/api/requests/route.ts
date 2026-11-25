import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, desc, and, ne } from 'drizzle-orm';
// @ts-ignore
import { validateLeaveRequest } from '@/features/requests/rules/leave';
// @ts-ignore
import { validateOvertimeRequest } from '@/features/requests/rules/overtime';
// @ts-ignore
import { determineApprovalRoute, processApprovalDecision } from '@/features/approvals/engine';

export async function GET(req: NextRequest) {
  try {
    const list = await db
      .select({
        id: schema.requests.id,
        empId: schema.requests.empId,
        type: schema.requests.type,
        status: schema.requests.status,
        createdAt: schema.requests.createdAt,
        details: schema.requests.details,
        notes: schema.requests.notes,
        empName: schema.employees.name,
        nik: schema.employees.nik,
        positionTitle: schema.employees.positionTitle,
      })
      .from(schema.requests)
      .leftJoin(schema.employees, eq(schema.requests.empId, schema.employees.id))
      .orderBy(desc(schema.requests.createdAt));

    const routes = await db
      .select()
      .from(schema.approvalRoutes)
      .orderBy(schema.approvalRoutes.stepOrder);

    return NextResponse.json({ requests: list, routes });
  } catch (err: any) {
    console.error('Fetch requests error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'submit_request') {
      const { type, details = {}, notes = '', empId } = payload;
      const targetEmpId = empId || 'E04';

      // 1. Fetch employee
      const [employee] = await db
        .select()
        .from(schema.employees)
        .where(eq(schema.employees.id, targetEmpId));

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      // 2. Validate leave request if type === 'cuti'
      if (type === 'cuti') {
        const leaveTypeId = details.jenis || 'JC-01';
        const [quota] = await db
          .select()
          .from(schema.leaveQuotas)
          .where(
            and(
              eq(schema.leaveQuotas.empId, targetEmpId),
              eq(schema.leaveQuotas.leaveTypeId, leaveTypeId)
            )
          );

        // Fetch existing requests for overlap validation
        const existingReqs = await db
          .select()
          .from(schema.requests)
          .where(
            and(
              eq(schema.requests.empId, targetEmpId),
              eq(schema.requests.type, 'cuti'),
              ne(schema.requests.status, 'Ditolak')
            )
          );

        const formattedExisting = existingReqs.map((r) => ({
          id: r.id,
          status: r.status,
          start_date: (r.details as any)?.mulai,
          end_date: (r.details as any)?.selesai,
        }));

        const validation = validateLeaveRequest({
          leaveType: { id: leaveTypeId, name: 'Cuti Tahunan', has_quota: true },
          startDateStr: details.mulai,
          endDateStr: details.selesai,
          quotaRemaining: quota?.remainingDays ?? 12,
          existingLeaves: formattedExisting,
        });

        if (!validation.isValid) {
          return NextResponse.json({ error: validation.errors.join('; ') }, { status: 422 });
        }
        details.hari = validation.workingDays;
      }

      // 3. Validate overtime if type === 'lembur'
      if (type === 'lembur') {
        const durationHours = Number(details.jam || 2);
        const startTimeStr = details.mulai || '18:00';
        const [sH, sM] = startTimeStr.split(':').map(Number);
        const endH = (sH + durationHours) % 24;
        const endTimeStr = details.selesai || `${String(endH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;

        const validation = validateOvertimeRequest({
          startTimeStr,
          endTimeStr,
          weeklyAccumulatedHours: 4,
          isHoliday: false,
        });

        if (!validation.isValid) {
          return NextResponse.json({ error: validation.errors.join('; ') }, { status: 422 });
        }
        details.jam = validation.hours;
      }

      // 4. Generate next Request ID
      const nextId = 'RQ-' + Math.floor(1000 + Math.random() * 9000);

      // 5. Generate Multi-tier Approval Routes (with strict Anti-Self-Approval)
      const routesToCreate = determineApprovalRoute({
        requestType: type,
        employee: {
          id: targetEmpId,
          manager_id: employee.managerId,
          position_title: employee.positionTitle,
        },
        manager: null,
        director: null,
      });

      const initialStatus = routesToCreate.length > 0 ? 'Menunggu ' + routesToCreate[0].approver_role : 'Disetujui';

      // Atomic insertion
      const [newReq] = await db.transaction(async (tx) => {
        const [insertedReq] = await tx
          .insert(schema.requests)
          .values({
            id: nextId,
            empId: targetEmpId,
            type,
            status: initialStatus,
            details,
            notes,
          })
          .returning();

        for (const route of routesToCreate) {
          await tx.insert(schema.approvalRoutes).values({
            requestId: nextId,
            stepOrder: route.step_order,
            approverRole: route.approver_role,
            approverId: route.approver_id,
            status: route.step_order === 1 ? 'Menunggu' : 'Antri',
          });
        }

        return [insertedReq];
      });

      return NextResponse.json({ success: true, request: newReq }, { status: 201 });
    }

    if (action === 'decide_approval') {
      const { routeId, decision, comments, approverId } = payload;

      const [route] = await db
        .select()
        .from(schema.approvalRoutes)
        .where(eq(schema.approvalRoutes.id, routeId));

      if (!route) {
        return NextResponse.json({ error: 'Route step not found' }, { status: 404 });
      }

      const [reqRecord] = await db
        .select()
        .from(schema.requests)
        .where(eq(schema.requests.id, route.requestId));

      if (!reqRecord) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // Anti-self-approval rule
      if (reqRecord.empId === approverId) {
        return NextResponse.json(
          { error: 'Anti-Self-Approval violation: Pemohon tidak diperkenankan menyetujui pengajuannya sendiri' },
          { status: 403 }
        );
      }

      const allRoutes = await db
        .select()
        .from(schema.approvalRoutes)
        .where(eq(schema.approvalRoutes.requestId, route.requestId))
        .orderBy(schema.approvalRoutes.stepOrder);

      const decisionStr = decision === 'approve' ? 'Disetujui' : decision === 'reject' ? 'Ditolak' : 'Revisi';
      const evaluation = processApprovalDecision({
        currentStep: route.stepOrder,
        totalSteps: allRoutes.length,
        decision: decisionStr,
        actorUserId: approverId,
        expectedApproverId: route.approverId || approverId,
      });

      await db.transaction(async (tx) => {
        await tx
          .update(schema.approvalRoutes)
          .set({
            status: decisionStr,
            comments: comments || '',
            actedAt: new Date(),
          })
          .where(eq(schema.approvalRoutes.id, routeId));

        await tx
          .update(schema.requests)
          .set({
            status: evaluation.nextRequestStatus,
            updatedAt: new Date(),
          })
          .where(eq(schema.requests.id, route.requestId));

        if (evaluation.nextStep) {
          await tx
            .update(schema.approvalRoutes)
            .set({ status: 'Menunggu' })
            .where(
              and(
                eq(schema.approvalRoutes.requestId, route.requestId),
                eq(schema.approvalRoutes.stepOrder, evaluation.nextStep)
              )
            );
        }

        // If leave approved and completed, deduct leave quota
        if (reqRecord.type === 'cuti' && evaluation.isCompleted && decisionStr === 'Disetujui') {
          const days = parseInt((reqRecord.details as any)?.hari, 10) || 1;
          const leaveTypeId = (reqRecord.details as any)?.jenis || 'JC-01';

          const [quota] = await tx
            .select()
            .from(schema.leaveQuotas)
            .where(
              and(
                eq(schema.leaveQuotas.empId, reqRecord.empId),
                eq(schema.leaveQuotas.leaveTypeId, leaveTypeId)
              )
            );

          if (quota) {
            await tx
              .update(schema.leaveQuotas)
              .set({
                usedDays: quota.usedDays + days,
                remainingDays: Math.max(0, quota.remainingDays - days),
              })
              .where(eq(schema.leaveQuotas.id, quota.id));
          }
        }
      });

      return NextResponse.json({ success: true, decision: decisionStr, nextStatus: evaluation.nextRequestStatus });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Request processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
