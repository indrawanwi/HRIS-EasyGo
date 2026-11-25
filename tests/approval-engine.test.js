const test = require('node:test');
const assert = require('node:assert/strict');
const { determineApprovalRoute, processApprovalDecision } = require('../src/features/approvals/engine');

test('Approval Engine & Security (Anti-Self-Approval)', async (t) => {
  await t.test('Routes standard employee request to manager then HR', () => {
    const employee = { id: 'E04', name: 'Rizky Pratama', manager_id: 'E03' };
    const routes = determineApprovalRoute({ requestType: 'cuti', employee });
    assert.equal(routes.length, 2);
    assert.equal(routes[0].approver_role, 'atasan');
    assert.equal(routes[0].approver_id, 'E03');
    assert.equal(routes[1].approver_role, 'hr');
    assert.equal(routes[1].approver_id, 'E08');
  });

  await t.test('Anti-Self-Approval: Manager cannot approve their own request', () => {
    const manager = { id: 'E03', name: 'Hendra Wijaya', manager_id: 'E02' };
    const routes = determineApprovalRoute({ requestType: 'cuti', employee: manager });
    assert.equal(routes[0].approver_id, 'E02', 'Should route to Direktur Bambang, NOT E03');
    assert.notEqual(routes[0].approver_id, manager.id);
  });

  await t.test('Anti-Self-Approval: HR Manager request escalates HR step to Director', () => {
    const hrManager = { id: 'E08', name: 'Sari Utami', manager_id: 'E01' };
    const routes = determineApprovalRoute({ requestType: 'cuti', employee: hrManager });
    assert.equal(routes[0].approver_id, 'E01');
    assert.equal(routes[1].approver_id, 'E01', 'HR review cannot be done by E08 for own request');
    assert.notEqual(routes[0].approver_id, hrManager.id);
    assert.notEqual(routes[1].approver_id, hrManager.id);
  });

  await t.test('Anti-Self-Approval: Director E01 request escalates to peer Director E02 (NO self-approval deadlock)', () => {
    const directorE01 = { id: 'E01', name: 'Wulan Kusumawati', manager_id: null };
    const routes = determineApprovalRoute({ requestType: 'cuti', employee: directorE01 });
    assert.equal(routes[0].approver_id, 'E02', 'Step 1 must escalate to peer Director E02, NOT E01');
    assert.notEqual(routes[0].approver_id, directorE01.id, 'Self-approval is strictly forbidden');
  });

  await t.test('Anti-Self-Approval: Director E02 request escalates to peer Director E01', () => {
    const directorE02 = { id: 'E02', name: 'Bambang Hartono', manager_id: null };
    const routes = determineApprovalRoute({ requestType: 'cuti', employee: directorE02 });
    assert.equal(routes[0].approver_id, 'E01', 'Step 1 must escalate to peer Director E01');
    assert.notEqual(routes[0].approver_id, directorE02.id);
  });

  await t.test('Financial transaction includes Finance step', () => {
    const employee = { id: 'E04', name: 'Rizky Pratama', manager_id: 'E03' };
    const routes = determineApprovalRoute({ requestType: 'um', employee });
    assert.equal(routes.length, 3);
    assert.equal(routes[2].approver_role, 'finance');
    assert.equal(routes[2].approver_id, 'E09');
  });

  await t.test('Enforces authority check during decision processing', () => {
    const res = processApprovalDecision({
      currentStep: 1,
      totalSteps: 2,
      decision: 'Disetujui',
      actorUserId: 'E04', // Unauthorized employee
      expectedApproverId: 'E03', // Manager
    });
    assert.equal(res.allowed, false);
    assert.ok(res.error.includes('Bukan penyetuju yang ditunjuk'));
  });

  await t.test('Progresses workflow state upon legitimate approval', () => {
    const res = processApprovalDecision({
      currentStep: 1,
      totalSteps: 2,
      decision: 'Disetujui',
      actorUserId: 'E03',
      expectedApproverId: 'E03',
    });
    assert.equal(res.allowed, true);
    assert.equal(res.nextRequestStatus, 'Menunggu HR');
    assert.equal(res.nextStep, 2);
    assert.equal(res.isCompleted, false);
  });

  await t.test('Final step approval completes the request', () => {
    const res = processApprovalDecision({
      currentStep: 2,
      totalSteps: 2,
      decision: 'Disetujui',
      actorUserId: 'E08',
      expectedApproverId: 'E08',
    });
    assert.equal(res.allowed, true);
    assert.equal(res.nextRequestStatus, 'Disetujui');
    assert.equal(res.isCompleted, true);
  });
});
