'use client';

import React, { useState, useEffect } from 'react';

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<'fptk' | 'candidates' | 'onboarding' | 'jobOrders'>('fptk');
  const [data, setData] = useState<{
    fptks: any[];
    candidates: any[];
    jobOrders: any[];
    onboarding: any[];
  }>({
    fptks: [],
    candidates: [],
    jobOrders: [],
    onboarding: [],
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // FPTK Modal State
  const [isFptkModalOpen, setIsFptkModalOpen] = useState(false);
  const [fptkForm, setFptkForm] = useState({
    positionTitle: 'Junior GPS Field Technician',
    departmentId: 'DP-01',
    requestedCount: 2,
    reason: 'Ekspansi armada klien logistik Jabodetabek',
    minSalary: 6000000,
    maxSalary: 8000000,
  });

  // Candidate Modal State
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    candidateId: '',
    stage: 'Interview',
    offeringSalary: 6500000,
  });

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const fetchRecruitmentData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recruitment');
      if (!res.ok) throw new Error('Gagal memuat data rekrutmen');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFptk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_fptk', payload: fptkForm }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal mengajukan FPTK');

      setFeedback({ type: 'success', message: 'FPTK berhasil diajukan dan masuk ke antrean Direktur!' });
      setIsFptkModalOpen(false);
      fetchRecruitmentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleUpdateCandidateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_candidate_stage', payload: candidateForm }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal mengubah stage');

      setFeedback({ type: 'success', message: 'Tahapan kandidat dan penawaran gaji berhasil diperbarui!' });
      setIsCandidateModalOpen(false);
      fetchRecruitmentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleOnboarding = async (stepId: number, currentCompleted: boolean) => {
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_onboarding_step',
          payload: { stepId, isCompleted: !currentCompleted },
        }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui progres onboarding');

      fetchRecruitmentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Rekrutmen & Onboarding</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Kelola pengajuan tenaga kerja (FPTK), pipeline evaluasi kandidat, dan onboarding checklist karyawan baru.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsFptkModalOpen(true)} className="btn btn-primary">
            + Ajukan FPTK Baru
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
          onClick={() => setActiveTab('fptk')}
          className={`btn btn-sm ${activeTab === 'fptk' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Formulir Tenaga Kerja (FPTK)
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`btn btn-sm ${activeTab === 'candidates' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Pipeline Kandidat & Offering
        </button>
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`btn btn-sm ${activeTab === 'onboarding' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Checklist Onboarding
        </button>
        <button
          onClick={() => setActiveTab('jobOrders')}
          className={`btn btn-sm ${activeTab === 'jobOrders' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Job Orders Penugasan
        </button>
      </div>

      {/* Tab Panels */}
      <div className="card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>Memuat data rekrutmen...</div>
        ) : activeTab === 'fptk' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Daftar FPTK (Permintaan Kebutuhan Personel)</h3>
              <span className="badge badge-orange">{data.fptks.length} Pengajuan</span>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID FPTK</th>
                    <th>Posisi yang Dibutuhkan</th>
                    <th>Jumlah</th>
                    <th>Kisaran Gaji</th>
                    <th>Alasan</th>
                    <th>Status Persetujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fptks.length > 0 ? (
                    data.fptks.map((f) => (
                      <tr key={f.id}>
                        <td className="font-mono">{f.id}</td>
                        <td><strong>{f.positionTitle}</strong></td>
                        <td>{f.requestedCount} Orang</td>
                        <td className="font-mono">
                          Rp {Number(f.minSalary).toLocaleString('id-ID')} - Rp {Number(f.maxSalary).toLocaleString('id-ID')}
                        </td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.reason}</td>
                        <td>
                          <span
                            className={`badge ${
                              f.status === 'Disetujui'
                                ? 'badge-green'
                                : f.status.includes('Menunggu')
                                ? 'badge-amber'
                                : 'badge-red'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="font-mono">FP-01</td>
                      <td><strong>Teknisi Instalasi GPS Senior</strong></td>
                      <td>2 Orang</td>
                      <td className="font-mono">Rp 7.500.000 - Rp 9.000.000</td>
                      <td>Kebutuhan ekspansi armada pool Surabaya & Semarang</td>
                      <td><span className="badge badge-amber">Menunggu Direktur</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'candidates' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Pipeline Evaluasi & Seleksi Kandidat</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {['Screening', 'Interview', 'Offering', 'Hired'].map((stage) => {
                const candidatesInStage = data.candidates.filter((c) => c.stage === stage);
                return (
                  <div key={stage} style={{ background: 'var(--seg)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{stage}</strong>
                      <span className="badge badge-gray">{candidatesInStage.length}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {candidatesInStage.length > 0 ? (
                        candidatesInStage.map((cand) => (
                          <div
                            key={cand.id}
                            className="card"
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              border: '1px solid var(--line)',
                            }}
                            onClick={() => {
                              setCandidateForm({
                                candidateId: cand.id,
                                stage: cand.stage,
                                offeringSalary: Number(cand.offeringSalary || 6500000),
                              });
                              setIsCandidateModalOpen(true);
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{cand.name}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--mut)', marginTop: '2px' }}>{cand.email}</div>
                            {cand.offeringSalary && (
                              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--green-d)', fontWeight: 600 }}>
                                Offer: Rp {Number(cand.offeringSalary).toLocaleString('id-ID')}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--mut)', textAlign: 'center', padding: '16px 0' }}>
                          Tidak ada kandidat
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'onboarding' ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Onboarding Checklist Karyawan Baru</h3>
              <p style={{ fontSize: '13px', color: 'var(--mut)' }}>
                Daftar tahapan berurutan (Sequential locked checklist) serah terima fasilitas dan orientasi.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(data.onboarding.length > 0
                ? data.onboarding
                : [
                    { id: 1, stepOrder: 1, stepName: 'Pengambilan ID Card & Akses Fasilitas', isCompleted: true },
                    { id: 2, stepOrder: 2, stepName: 'Serah Terima Toolkit & Perlengkapan GPS', isCompleted: true },
                    { id: 3, stepOrder: 3, stepName: 'Briefing K3 & Pengenalan Lapangan', isCompleted: false },
                    { id: 4, stepOrder: 4, stepName: 'Penandatanganan Pakta Integritas & Kontrak Final', isCompleted: false },
                  ]
              ).map((step: any, idx: number) => (
                <div
                  key={step.id || idx}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderLeft: `4px solid ${step.isCompleted ? 'var(--green)' : 'var(--amber)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: step.isCompleted ? 'var(--green-l)' : 'var(--seg)',
                        color: step.isCompleted ? 'var(--green-d)' : 'var(--mut)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {step.stepOrder || idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', textDecoration: step.isCompleted ? 'line-through' : 'none' }}>
                        {step.stepName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                        {step.isCompleted ? '✓ Selesai Diverifikasi' : 'Menunggu pelaksanaan oleh HR & Lead'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleOnboarding(step.id, step.isCompleted)}
                    className={`btn btn-sm ${step.isCompleted ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {step.isCompleted ? 'Tandai Belum' : 'Selesaikan Tahap'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Job Orders Penugasan Lapangan</h3>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>No. Order</th>
                    <th>Judul Penugasan</th>
                    <th>Teknisi Ditugaskan</th>
                    <th>Kota</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobOrders.length > 0 ? (
                    data.jobOrders.map((jo) => (
                      <tr key={jo.id}>
                        <td className="font-mono">{jo.code}</td>
                        <td><strong>{jo.title}</strong></td>
                        <td>{jo.empId} (Rizky Pratama)</td>
                        <td>{jo.city}</td>
                        <td>{jo.date}</td>
                        <td><span className="badge badge-green">{jo.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="font-mono">JO-2026-001</td>
                      <td><strong>Instalasi GPS 5 Unit Truk Tronton PT Logistik Sejahtera</strong></td>
                      <td>E04 (Rizky Pratama)</td>
                      <td>Jakarta Barat</td>
                      <td>2026-11-24</td>
                      <td><span className="badge badge-green">Ditetapkan</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajukan FPTK */}
      {isFptkModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFptkModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Ajukan Formulir Permintaan Tenaga Kerja (FPTK)</h3>
              <button onClick={() => setIsFptkModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateFptk}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Posisi / Judul Jabatan</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fptkForm.positionTitle}
                    onChange={(e) => setFptkForm({ ...fptkForm, positionTitle: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Jumlah Orang</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fptkForm.requestedCount}
                      onChange={(e) => setFptkForm({ ...fptkForm, requestedCount: Number(e.target.value) })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departemen</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fptkForm.departmentId}
                      onChange={(e) => setFptkForm({ ...fptkForm, departmentId: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Gaji Minimum (IDR)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fptkForm.minSalary}
                      onChange={(e) => setFptkForm({ ...fptkForm, minSalary: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gaji Maksimum (IDR)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fptkForm.maxSalary}
                      onChange={(e) => setFptkForm({ ...fptkForm, maxSalary: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alasan & Urgensi Permintaan</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={fptkForm.reason}
                    onChange={(e) => setFptkForm({ ...fptkForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsFptkModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Kirim Pengajuan FPTK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Evaluasi Kandidat */}
      {isCandidateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCandidateModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Ubah Tahapan Kandidat & Offering</h3>
              <button onClick={() => setIsCandidateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateCandidateStage}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tahapan Seleksi</label>
                  <select
                    className="form-control"
                    value={candidateForm.stage}
                    onChange={(e) => setCandidateForm({ ...candidateForm, stage: e.target.value })}
                  >
                    <option value="Screening">Screening Administrasi</option>
                    <option value="Interview">Interview Teknis & User</option>
                    <option value="Offering">Offering Letter</option>
                    <option value="Hired">Hired (Diterima)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nominal Gaji Penawaran (Offering Salary)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={candidateForm.offeringSalary}
                    onChange={(e) => setCandidateForm({ ...candidateForm, offeringSalary: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCandidateModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Tahapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
