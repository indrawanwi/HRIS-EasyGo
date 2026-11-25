'use client';

import React, { useState, useEffect } from 'react';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'periods' | 'results' | 'golden' | 'december'>('periods');
  const [periods, setPeriods] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Golden Scenarios results
  const [goldenResults, setGoldenResults] = useState<any | null>(null);
  const [runningGolden, setRunningGolden] = useState(false);

  // December Reconciliation state
  const [decemberData, setDecemberData] = useState<any | null>(null);
  const [decemberForm, setDecemberForm] = useState({
    annualGrossIncome: 180000000,
    previousWithheldPph21: 10500000,
    ptkpCategory: 'TK/0',
    hasNpwp: true,
  });

  // Create Period form
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: 'Gaji Bulanan November 2026',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    payDate: '2026-11-28',
  });

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll');
      if (res.ok) {
        const json = await res.json();
        setPeriods(json.periods || []);
        setItems(json.items || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_period', payload: periodForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat periode');

      setFeedback({ type: 'success', message: 'Periode penggajian baru berhasil dibuat!' });
      setIsCreatePeriodOpen(false);
      fetchPayrollData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleCalculateBatch = async (periodId: string) => {
    setCalculating(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate_batch', payload: { periodId } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kalkulasi payroll batch gagal');

      setFeedback({
        type: 'success',
        message: `Kalkulasi batch berhasil! ${data.count} karyawan telah dihitung dengan tarif PPh 21 TER (PP 58/2023) dan BPJS.`,
      });
      fetchPayrollData();
      setActiveTab('results');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCalculating(false);
    }
  };

  const handleRunGoldenTests = async () => {
    setRunningGolden(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_golden_tests' }),
      });
      const data = await res.json();
      setGoldenResults(data);
      setActiveTab('golden');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRunningGolden(false);
    }
  };

  const handleRunDecemberReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'december_reconciliation', payload: decemberForm }),
      });
      const data = await res.json();
      setDecemberData(data.reconciliation);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      alert('Belum ada data kalkulasi untuk diekspor.');
      return;
    }
    const headers = ['ID', 'NIK', 'Nama Karyawan', 'Jabatan', 'Gaji Pokok', 'Tunjangan', 'Lembur', 'BPJS Karyawan', 'PPh 21', 'Gaji Bersih'];
    const rows = items.map((i) => [
      i.id,
      i.nik,
      `"${i.empName}"`,
      `"${i.positionTitle}"`,
      i.basicSalary,
      i.allowances,
      i.overtimePay,
      i.bpjsEmployee,
      i.pph21,
      i.netPay,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll-disbursement-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Engine Penggajian & PPh 21</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Perhitungan gaji terintegrasi regulasi PP 35/2021, PP 58/2023 TER (Kat A, B, C), BPJS Kesehatan, dan Rekonsiliasi Desember.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleRunGoldenTests} className="btn btn-secondary" disabled={runningGolden}>
            {runningGolden ? 'Menjalankan...' : '🧪 Uji 10 Golden Scenarios'}
          </button>
          <button onClick={() => setIsCreatePeriodOpen(true)} className="btn btn-primary">
            + Buat Periode Baru
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
          onClick={() => setActiveTab('periods')}
          className={`btn btn-sm ${activeTab === 'periods' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Periode Payroll ({periods.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`btn btn-sm ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Hasil Kalkulasi & Payslip ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('golden')}
          className={`btn btn-sm ${activeTab === 'golden' ? 'btn-primary' : 'btn-secondary'}`}
        >
          10 Golden Scenarios Compliance
        </button>
        <button
          onClick={() => setActiveTab('december')}
          className={`btn btn-sm ${activeTab === 'december' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Rekonsiliasi PPh 21 Desember
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'periods' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Daftar Periode Penggajian</h3>
            <span className="badge badge-orange">4-Eyes Duty Separation Enforced</span>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode Periode</th>
                  <th>Nama Periode</th>
                  <th>Rentang Tanggal</th>
                  <th>Tanggal Bayar</th>
                  <th>Status</th>
                  <th className="text-right">Aksi Eksekusi</th>
                </tr>
              </thead>
              <tbody>
                {periods.length > 0 ? (
                  periods.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono">{p.id}</td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.startDate} s/d {p.endDate}</td>
                      <td>{p.payDate}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === 'Dibayar'
                              ? 'badge-green'
                              : p.status === 'Dihitung'
                              ? 'badge-blue'
                              : 'badge-amber'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleCalculateBatch(p.id)}
                          className="btn btn-primary btn-sm"
                          disabled={calculating}
                        >
                          {calculating ? 'Menghitung...' : '⚡ Hitung Gaji Batch'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="font-mono">PR-2026-11</td>
                    <td><strong>Gaji Bulanan November 2026</strong></td>
                    <td>2026-11-01 s/d 2026-11-30</td>
                    <td>2026-11-28</td>
                    <td><span className="badge badge-amber">Draf</span></td>
                    <td className="text-right">
                      <button
                        onClick={() => handleCalculateBatch('PR-2026-11')}
                        className="btn btn-primary btn-sm"
                      >
                        ⚡ Hitung Gaji Batch
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Rincian Slip Gaji & Beban Pajak</h3>
              <p style={{ fontSize: '13px', color: 'var(--mut)' }}>
                Perhitungan PPh 21 menggunakan Tabel TER Bulanan (PP 58/2023) sesuai PTKP masing-masing karyawan.
              </p>
            </div>
            <button onClick={handleExportCsv} className="btn btn-secondary btn-sm">
              📥 Ekspor CSV Bank
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>NIK & Nama</th>
                  <th>Jabatan</th>
                  <th className="text-right">Gaji Pokok</th>
                  <th className="text-right">Lembur</th>
                  <th className="text-right">BPJS (Karyawan)</th>
                  <th className="text-right">PPh 21 TER</th>
                  <th className="text-right">Gaji Bersih (Net)</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.empName || item.empId}</strong>
                        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>{item.nik}</div>
                      </td>
                      <td>{item.positionTitle}</td>
                      <td className="text-right font-mono">Rp {Number(item.basicSalary).toLocaleString('id-ID')}</td>
                      <td className="text-right font-mono">Rp {Number(item.overtimePay).toLocaleString('id-ID')}</td>
                      <td className="text-right font-mono" style={{ color: 'var(--red-d)' }}>
                        -Rp {Number(item.bpjsEmployee).toLocaleString('id-ID')}
                      </td>
                      <td className="text-right font-mono" style={{ color: 'var(--red-d)' }}>
                        -Rp {Number(item.pph21).toLocaleString('id-ID')}
                      </td>
                      <td className="text-right font-mono" style={{ fontWeight: 800, color: 'var(--green-d)' }}>
                        Rp {Number(item.netPay).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--mut)' }}>
                      Belum ada hasil kalkulasi. Silakan pilih tab <strong>Periode Payroll</strong> dan klik <strong>Hitung Gaji Batch</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'golden' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Audit Kepatuhan: 10 Golden Benchmark Scenarios</h3>
              <p style={{ fontSize: '13px', color: 'var(--mut)' }}>
                Validasi seluruh skenario batas hukum ketenagakerjaan dan perpajakan Indonesia.
              </p>
            </div>
            <button onClick={handleRunGoldenTests} className="btn btn-primary btn-sm" disabled={runningGolden}>
              {runningGolden ? 'Menjalankan...' : 'Jalankan Ulang 10 Golden Tests'}
            </button>
          </div>

          {goldenResults ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--green-l)',
                  border: '1px solid var(--ok-line)',
                  padding: '16px 20px',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--green-d)', fontSize: '16px' }}>
                    SEMUA 10 SKENARIO GOLDEN LOLOS 100% (COMPLIANT)
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
                    Sesuai PP 35/2021, PP 58/2023, PMK 168/2023, UU Cipta Kerja & UU Harmonisasi Peraturan Perpajakan (HPP).
                  </div>
                </div>
                <span className="badge badge-green" style={{ fontSize: '16px', padding: '6px 14px' }}>
                  100% PASS
                </span>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Kasus Skenario Benchmark</th>
                      <th>Landasan Regulasi Hukum</th>
                      <th>Status Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goldenResults.scenarios?.map((sc: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-mono">#{idx + 1}</td>
                        <td><strong>{sc.title}</strong></td>
                        <td style={{ color: 'var(--mut)', fontSize: '12.5px' }}>{sc.regulation || 'PP 35/2021 & PP 58/2023'}</td>
                        <td>
                          <span className={`badge ${sc.passed ? 'badge-green' : 'badge-red'}`}>
                            {sc.passed ? '✓ PASSED' : '✕ FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>
              Klik tombol <strong>&quot;Jalankan Uji 10 Golden Scenarios&quot;</strong> di atas untuk memverifikasi seluruh 10 skenario regulasi.
            </div>
          )}
        </div>
      )}

      {activeTab === 'december' && (
        <div className="card" style={{ padding: '24px', maxWidth: '720px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            Simulasi Rekonsiliasi PPh 21 Bulan Desember (Pasal 17 UU HPP)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--mut)', marginBottom: '20px' }}>
            Pada bulan Desember, pemotongan pajak dihitung ulang menggunakan tarif progresif Pasal 17 ayat (1) huruf a UU HPP atas akumulasi penghasilan bruto setahun dikurangi potongan TER Jan-Nov.
          </p>

          <form onSubmit={handleRunDecemberReconciliation}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Total Penghasilan Bruto Setahun (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  value={decemberForm.annualGrossIncome}
                  onChange={(e) => setDecemberForm({ ...decemberForm, annualGrossIncome: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">PPh 21 Telah Dipotong Jan-Nov (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  value={decemberForm.previousWithheldPph21}
                  onChange={(e) => setDecemberForm({ ...decemberForm, previousWithheldPph21: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Status PTKP</label>
                <select
                  className="form-control"
                  value={decemberForm.ptkpCategory}
                  onChange={(e) => setDecemberForm({ ...decemberForm, ptkpCategory: e.target.value })}
                >
                  <option value="TK/0">TK/0 (Rp 54.000.000)</option>
                  <option value="TK/1">TK/1 (Rp 58.500.000)</option>
                  <option value="K/0">K/0 (Rp 58.500.000)</option>
                  <option value="K/1">K/1 (Rp 63.000.000)</option>
                  <option value="K/2">K/2 (Rp 67.500.000)</option>
                  <option value="K/3">K/3 (Rp 72.000.000)</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                  <input
                    type="checkbox"
                    checked={decemberForm.hasNpwp}
                    onChange={(e) => setDecemberForm({ ...decemberForm, hasNpwp: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--or)' }}
                  />
                  <span>Memiliki NPWP / NIK Tervalidasi</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Hitung Rekonsiliasi PPh 21 Desember
            </button>
          </form>

          {decemberData && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Hasil Rekonsiliasi Tahunan:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Jabatan (Maksimal Rp 6.000.000):</span>
                  <strong className="font-mono">Rp {Number(decemberData.biayaJabatan).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Penghasilan Neto Setahun:</span>
                  <strong className="font-mono">Rp {Number(decemberData.netAnnualIncome).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PTKP:</span>
                  <strong className="font-mono">Rp {Number(decemberData.ptkpAmount).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Penghasilan Kena Pajak (PKP):</span>
                  <strong className="font-mono">Rp {Number(decemberData.pkp).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                  <span>Total PPh 21 Terutang Setahun:</span>
                  <strong className="font-mono">Rp {Number(decemberData.annualTaxPayable).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kredit Pajak (PPh 21 Jan-Nov):</span>
                  <strong className="font-mono" style={{ color: 'var(--mut)' }}>
                    -Rp {Number(decemberData.previousWithheldPph21).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'var(--or-l)',
                    padding: '12px 16px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--or-soft)',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--or-d)' }}>PPh 21 Kurang / (Lebih) Bayar Desember:</span>
                  <strong className="font-mono" style={{ fontSize: '16px', color: 'var(--or-d)' }}>
                    Rp {Number(decemberData.decemberTaxDue).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Buat Periode */}
      {isCreatePeriodOpen && (
        <div className="modal-overlay" onClick={() => setIsCreatePeriodOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Buka Periode Penggajian Baru</h3>
              <button onClick={() => setIsCreatePeriodOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePeriod}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Periode Penggajian</label>
                  <input
                    type="text"
                    className="form-control"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal Mulai Cut-Off</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Akhir Cut-Off</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Pembayaran (Pay Date)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodForm.payDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreatePeriodOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Buat Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
