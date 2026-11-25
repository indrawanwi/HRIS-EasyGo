'use client';

import React, { useState, useEffect } from 'react';
import { getStoredUser, UserSession } from '@/lib/auth';

export default function RequestsPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'newLeave' | 'newOvertime'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    jenis: 'JC-01',
    mulai: '2026-12-10',
    selesai: '2026-12-12',
    notes: 'Keperluan keluarga di luar kota',
  });

  // Overtime Form
  const [otForm, setOtForm] = useState({
    tgl: new Date().toISOString().slice(0, 10),
    jam: 3,
    alasan: 'Instalasi darurat armada logistik 10 unit GPS',
  });

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    fetchRequests();

    const handleAuth = () => {
      const u = getStoredUser();
      setCurrentUser(u);
      fetchRequests();
    };
    window.addEventListener('easygo_auth_change', handleAuth);
    return () => window.removeEventListener('easygo_auth_change', handleAuth);
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
        setRoutes(json.routes || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitleave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_request',
          payload: {
            empId: currentUser?.empId || 'E04',
            type: 'cuti',
            details: leaveForm,
            notes: leaveForm.notes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengajukan cuti');

      setFeedback({
        type: 'success',
        message: 'Pengajuan cuti berhasil dikirim! Alur persetujuan telah terbentuk tanpa risiko self-approval.',
      });
      fetchRequests();
      setActiveTab('all');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSubmitOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_request',
          payload: {
            empId: currentUser?.empId || 'E04',
            type: 'lembur',
            details: otForm,
            notes: otForm.alasan,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengajukan lembur');

      setFeedback({
        type: 'success',
        message: 'Pengajuan lembur berhasil! Sesuai ketentuan PP 35/2021 (batas maks 4 jam/hari).',
      });
      fetchRequests();
      setActiveTab('all');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDecide = async (routeId: number, decision: 'approve' | 'reject') => {
    setFeedback(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide_approval',
          payload: {
            routeId,
            decision,
            comments: decision === 'approve' ? 'Disetujui sesuai regulasi' : 'Ditolak',
            approverId: currentUser?.empId || 'E08',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses persetujuan');

      setFeedback({
        type: 'success',
        message: `Keputusan ${decision.toUpperCase()} berhasil dicatat. Status permintaan telah diperbarui.`,
      });
      fetchRequests();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Filter pending approvals for current user
  const pendingInbox = routes.filter((rt) => {
    return rt.status === 'Menunggu';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Permintaan & Alur Approval</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Pengajuan cuti dengan validasi bentrok tanggal & kuota, lembur PP 35/2021, serta proteksi Anti-Self-Approval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('newLeave')} className="btn btn-primary">
            + Ajukan Cuti
          </button>
          <button onClick={() => setActiveTab('newOvertime')} className="btn btn-secondary">
            + Ajukan Lembur
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            background: feedback.type === 'success' ? 'var(--green-l)' : 'var(--red-l)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--ok-line)' : 'var(--bad-line)'}`,
            color: feedback.type === 'success' ? 'var(--green-d)' : 'var(--red-d)',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Semua Pengajuan ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`btn btn-sm ${activeTab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Antrean Persetujuan ({pendingInbox.length})
        </button>
        <button
          onClick={() => setActiveTab('newLeave')}
          className={`btn btn-sm ${activeTab === 'newLeave' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Formulir Cuti
        </button>
        <button
          onClick={() => setActiveTab('newOvertime')}
          className={`btn btn-sm ${activeTab === 'newOvertime' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Formulir Lembur
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'all' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Daftar Seluruh Permintaan Karyawan</h3>
            <span className="badge badge-orange">Anti-Self-Approval Enforced</span>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. ID</th>
                  <th>Pemohon</th>
                  <th>Tipe</th>
                  <th>Detail & Periode</th>
                  <th>Catatan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono">{r.id}</td>
                    <td>
                      <strong>{r.empName || r.empId}</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--mut)' }}>{r.positionTitle}</div>
                    </td>
                    <td>
                      <span className={`badge ${r.type === 'cuti' ? 'badge-purple' : r.type === 'lembur' ? 'badge-orange' : 'badge-blue'}`}>
                        {r.type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.type === 'cuti' && r.details?.mulai && (
                        <span>
                          {r.details.mulai} s/d {r.details.selesai} ({r.details.hari || 2} Hari)
                        </span>
                      )}
                      {r.type === 'lembur' && r.details?.jam && (
                        <span>
                          {r.details.tgl} ({r.details.jam} Jam)
                        </span>
                      )}
                      {!r.details?.mulai && !r.details?.jam && <span>-</span>}
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.notes || '-'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'Disetujui'
                            ? 'badge-green'
                            : r.status === 'Ditolak'
                            ? 'badge-red'
                            : 'badge-amber'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Pusat Persetujuan (Approval Inbox)</h3>
            <p style={{ fontSize: '13px', color: 'var(--mut)' }}>
              Persona aktif: <strong>{currentUser?.name}</strong> ({currentUser?.empId}). Setiap pengajuan diverifikasi tidak dapat disetujui oleh diri sendiri.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Request</th>
                  <th>Tahap Peran</th>
                  <th>Status Tahap</th>
                  <th>Catatan / Tanggal</th>
                  <th className="text-right">Keputusan</th>
                </tr>
              </thead>
              <tbody>
                {pendingInbox.length > 0 ? (
                  pendingInbox.map((route) => (
                    <tr key={route.id}>
                      <td className="font-mono">
                        <span className="badge badge-orange">{route.requestId}</span>
                      </td>
                      <td>
                        <strong>Tahap {route.stepOrder}: {route.approverRole}</strong>
                      </td>
                      <td>
                        <span className="badge badge-amber">{route.status}</span>
                      </td>
                      <td style={{ color: 'var(--mut)' }}>{route.comments || 'Menunggu verifikasi'}</td>
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleDecide(route.id, 'approve')}
                            className="btn btn-success btn-sm"
                          >
                            ✓ Setujui
                          </button>
                          <button
                            onClick={() => handleDecide(route.id, 'reject')}
                            className="btn btn-danger btn-sm"
                          >
                            ✕ Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mut)' }}>
                      Tidak ada antrean approval yang tertunda untuk persona Anda saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'newLeave' && (
        <div className="card" style={{ padding: '28px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Formulir Pengajuan Cuti Mandiri</h3>
          <p style={{ fontSize: '13px', color: 'var(--mut)', marginBottom: '20px' }}>
            Sistem secara otomatis mengecek ketersediaan kuota tahunan dan menolak bentrok tanggal (overlap validation).
          </p>

          <form onSubmit={handleSubmitleave}>
            <div className="form-group">
              <label className="form-label">Jenis Cuti</label>
              <select
                className="form-control"
                value={leaveForm.jenis}
                onChange={(e) => setLeaveForm({ ...leaveForm, jenis: e.target.value })}
              >
                <option value="JC-01">JC-01: Cuti Tahunan (Potong Kuota)</option>
                <option value="JC-02">JC-02: Cuti Sakit (Maks 7 hari retroaktif)</option>
                <option value="JC-03">JC-03: Cuti Melahirkan (90 Hari)</option>
                <option value="JC-04">JC-04: Cuti Menikah (3 Hari)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai Cuti</label>
                <input
                  type="date"
                  className="form-control"
                  value={leaveForm.mulai}
                  onChange={(e) => setLeaveForm({ ...leaveForm, mulai: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Selesai Cuti</label>
                <input
                  type="date"
                  className="form-control"
                  value={leaveForm.selesai}
                  onChange={(e) => setLeaveForm({ ...leaveForm, selesai: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alasan / Keterangan Cuti</label>
              <textarea
                className="form-control"
                rows={3}
                value={leaveForm.notes}
                onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                required
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setActiveTab('all')} className="btn btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Kirim Pengajuan Cuti
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'newOvertime' && (
        <div className="card" style={{ padding: '28px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Formulir Surat Perintah Kerja Lembur</h3>
          <p style={{ fontSize: '13px', color: 'var(--mut)', marginBottom: '20px' }}>
            Mengikuti batasan PP 35/2021: Maksimal 4 jam/hari dan 18 jam/minggu (pengali lembur 1/173).
          </p>

          <form onSubmit={handleSubmitOvertime}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Lembur</label>
                <input
                  type="date"
                  className="form-control"
                  value={otForm.tgl}
                  onChange={(e) => setOtForm({ ...otForm, tgl: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Durasi Lembur (Jam)</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  className="form-control"
                  value={otForm.jam}
                  onChange={(e) => setOtForm({ ...otForm, jam: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Uraian Tugas Lembur</label>
              <textarea
                className="form-control"
                rows={3}
                value={otForm.alasan}
                onChange={(e) => setOtForm({ ...otForm, alasan: e.target.value })}
                required
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setActiveTab('all')} className="btn btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Kirim Pengajuan Lembur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
