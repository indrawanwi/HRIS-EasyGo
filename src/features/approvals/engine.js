/**
 * HRIS EasyGo — Multi-Stage Workflow & Approval Engine
 * Strictly enforces Anti-Self-Approval and Separation of Duties.
 */

/**
 * Determine approval workflow steps for a given request
 */
function determineApprovalRoute({ requestType, employee, manager, director }) {
  const steps = [];

  // Step 1: Direct Supervisor (Atasan Langsung)
  // Check Anti-Self-Approval: An employee CANNOT approve their own request!
  let step1ApproverId = employee.manager_id;
  if (!step1ApproverId || step1ApproverId === employee.id) {
    // If employee is a director or top executive with no manager:
    if (employee.id === 'E01') {
      step1ApproverId = 'E02'; // Escalated to peer director (Direktur Operasional)
    } else if (employee.id === 'E02') {
      step1ApproverId = 'E01'; // Escalated to peer director (Direktur Keuangan & SDM)
    } else if (employee.id === 'E11') {
      step1ApproverId = 'E01'; // Escalated to director
    } else {
      step1ApproverId = director ? director.id : (employee.id === 'E01' ? 'E02' : 'E01');
    }
  }

  // Double-check: under NO circumstances can step1ApproverId equal employee.id
  if (step1ApproverId === employee.id) {
    step1ApproverId = employee.id === 'E01' ? 'E02' : 'E01';
  }

  steps.push({
    step_order: 1,
    approver_role: 'atasan',
    approver_id: step1ApproverId,
    status: 'Menunggu',
  });

  // Step 2: HR Review
  // Only if request type requires HR oversight (Cuti, Dokumen, Pinjaman, Uang Muka)
  if (['cuti', 'dokumen', 'pinjaman', 'um'].includes(requestType)) {
    // If the requester IS HR Manager (E08), escalate to Direktur Keuangan & SDM (E01)
    let hrApproverId = 'E08';
    if (employee.id === 'E08') {
      hrApproverId = 'E01';
    } else if (employee.id === 'E01') {
      // If requester is E01, HR review is performed by HR Manager E08
      hrApproverId = 'E08';
    }
    steps.push({
      step_order: 2,
      approver_role: 'hr',
      approver_id: hrApproverId,
      status: 'Menunggu',
    });
  }

  // Step 3: Finance Disbursement
  // Financial transactions require payout by Finance
  if (['um', 'rb', 'pin'].includes(requestType)) {
    // If the requester IS Finance Manager (E09), escalate to Direktur Keuangan & SDM (E01)
    let finApproverId = 'E09';
    if (employee.id === 'E09') {
      finApproverId = 'E01';
    } else if (employee.id === 'E01') {
      finApproverId = 'E09';
    }
    steps.push({
      step_order: steps.length + 1,
      approver_role: 'finance',
      approver_id: finApproverId,
      status: 'Menunggu',
    });
  }

  return steps;
}

/**
 * Evaluate an approval decision
 */
function processApprovalDecision({
  currentStep,
  totalSteps,
  decision, // 'Disetujui', 'Ditolak', 'Revisi'
  actorUserId,
  expectedApproverId,
}) {
  // Security check: only designated approver (or superadmin) can act
  if (actorUserId !== expectedApproverId && actorUserId !== 'US-E11' && actorUserId !== 'E11') {
    return {
      allowed: false,
      error: 'Anda tidak berwenang menyetujui pengajuan ini (Bukan penyetuju yang ditunjuk)',
    };
  }

  if (decision === 'Ditolak') {
    return {
      allowed: true,
      nextRequestStatus: 'Ditolak',
      isCompleted: true,
    };
  }

  if (decision === 'Revisi') {
    return {
      allowed: true,
      nextRequestStatus: 'Perlu Revisi',
      isCompleted: false,
    };
  }

  if (decision === 'Disetujui') {
    if (currentStep < totalSteps) {
      return {
        allowed: true,
        nextRequestStatus: currentStep === 1 ? 'Menunggu HR' : 'Menunggu Pembayaran',
        isCompleted: false,
        nextStep: currentStep + 1,
      };
    } else {
      return {
        allowed: true,
        nextRequestStatus: 'Disetujui',
        isCompleted: true,
      };
    }
  }

  return { allowed: false, error: 'Keputusan tidak valid' };
}

module.exports = {
  determineApprovalRoute,
  processApprovalDecision,
};
