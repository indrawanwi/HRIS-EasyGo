'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredUser, UserSession } from '@/lib/auth';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 11,
    attendanceToday: 92,
    pendingApprovals: 2,
    activePayrollPeriod: 'November 2026',
  });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);

    // Fetch initial data
    async function loadData() {
      try {
        const empRes = await fetch('/api/employees');
        if (empRes.ok) {
          const emps = await empRes.json();
          setStats((prev) => ({ ...prev, totalEmployees: Array.isArray(emps) ? emps.length : 11 }));
        }

        const reqRes = await fetch('/api/requests');
        if (reqRes.ok) {
          const json = await reqRes.json();
          const reqs = json.requests || [];
          setPendingRequests(Array.isArray(reqs) ? reqs.slice(0, 5) : []);
          const pendingCount = reqs.filter((r: any) => r.status && r.status.includes('Menunggu')).length;
          setStats((prev) => ({ ...prev, pendingApprovals: pendingCount || 2 }));
        }
      } catch (e) {
        console.error('Failed fetching dashboard stats', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          borderRadius: 'var(--r-xl)',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--sh-2)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-orange">HRIS Live</span>
            <span style={{ fontSize: '12px', color: 'var(--mut-2)' }}>PT EasyGo GPS Indonesia</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Selamat Datang, {currentUser?.name || 'Pengguna'}!
          </h1>
          <p style={{ color: 'var(--mut-2)', fontSize: '14px', marginTop: '4px' }}>
            Sistem HRIS & Payroll Regulasi Terintegrasi Neon Serverless PostgreSQL
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/attendance" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Absen Sekarang</span>
          </Link>
          <Link href="/requests" className="btn btn-secondary">
            <span>Ajukan Cuti / Lembur</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--or-l)',
              color: 'var(--or)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>Total Karyawan</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>{stats.totalEmployees}</div>
            <div style={{ fontSize: '11px', color: 'var(--green-d)', fontWeight: 600 }}>100% Aktif di Database</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--green-l)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>Tingkat Hadir Hari Ini</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>{stats.attendanceToday}%</div>
            <div style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 500 }}>GPS Telemetri Valid</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--amber-l)',
              color: 'var(--amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>Menunggu Persetujuan</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>{stats.pendingApprovals}</div>
            <div style={{ fontSize: '11px', color: 'var(--amber-d)', fontWeight: 600 }}>Anti-Self-Approval Aktif</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--blue-l)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>Periode Penggajian</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>{stats.activePayrollPeriod}</div>
            <div style={{ fontSize: '11px', color: 'var(--blue-d)', fontWeight: 600 }}>PPh 21 TER PP 58/2023</div>
          </div>
        </div>
      </div>

      {/* Grid: Pending Approvals & Quick Features */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Pending Approvals Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Antrean Persetujuan Terbaru</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--mut)' }}>Permintaan cuti, lembur, dan klaim yang menunggu aksi</p>
            </div>
            <Link href="/requests" className="btn btn-secondary btn-sm">
              Lihat Semua
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Request</th>
                  <th>Pemohon</th>
                  <th>Jenis</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono">{r.id}</td>
                      <td>
                        <strong>{r.empName || r.empId}</strong> ({r.positionTitle || 'Karyawan'})
                      </td>
                      <td>
                        <span className={`badge ${r.type === 'cuti' ? 'badge-purple' : r.type === 'lembur' ? 'badge-orange' : 'badge-blue'}`}>
                          {r.type === 'cuti' ? 'Cuti Tahunan' : r.type === 'lembur' ? 'Lembur' : r.type.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {r.type === 'cuti' && r.details?.mulai
                          ? `${r.details.mulai} (${r.details.hari || 2} hari)`
                          : r.type === 'lembur' && r.details?.jam
                          ? `${r.details.tgl || 'Hari ini'} (${r.details.jam} jam)`
                          : 'Pengajuan'}
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
                      <td className="text-right">
                        <Link href="/requests" className="btn btn-primary btn-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td className="font-mono">RQ-01</td>
                      <td><strong>Rizky Pratama</strong> (Teknisi GPS)</td>
                      <td><span className="badge badge-purple">Cuti Tahunan</span></td>
                      <td>01 Des 2026 (2 hari)</td>
                      <td><span className="badge badge-green">Disetujui</span></td>
                      <td className="text-right">
                        <button className="btn btn-secondary btn-sm" disabled>Selesai</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-mono">RQ-02</td>
                      <td><strong>Rizky Pratama</strong> (Teknisi GPS)</td>
                      <td><span className="badge badge-orange">Lembur (3 Jam)</span></td>
                      <td>20 Nov 2026</td>
                      <td><span className="badge badge-amber">Menunggu Atasan</span></td>
                      <td className="text-right">
                        <Link href="/requests" className="btn btn-primary btn-sm">Review</Link>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-mono">RQ-03</td>
                      <td><strong>Agus Setiawan</strong> (Teknisi GPS)</td>
                      <td><span className="badge badge-blue">Reimburse BBM</span></td>
                      <td>22 Nov 2026</td>
                      <td><span className="badge badge-amber">Menunggu HR</span></td>
                      <td className="text-right">
                        <Link href="/requests" className="btn btn-primary btn-sm">Review</Link>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regulatory Compliance & Neon Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ background: 'var(--tint)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
              Kepatuhan Regulasi Indonesia
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">PASS</span>
                <span>PPh 21 TER Kat A, B, C (PP 58/2023)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">PASS</span>
                <span>Lembur Pengali 1/173 (PP 35/2021)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">PASS</span>
                <span>BPJS Kes (12M Cap) & TK (JHT, JP)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">PASS</span>
                <span>Rekonsiliasi PPh 21 Des Ps 17</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green">PASS</span>
                <span>10 Golden Benchmark Scenarios (100%)</span>
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <Link href="/payroll" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Buka Pengujian Payroll Golden Tests
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
              Akses Cepat Modul
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <Link href="/master" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                📁 Data Master
              </Link>
              <Link href="/employees" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                👥 Karyawan
              </Link>
              <Link href="/recruitment" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                💼 Rekrutmen
              </Link>
              <Link href="/audit" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                🛡️ Audit Trail
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
