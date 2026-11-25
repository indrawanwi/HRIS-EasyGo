'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    nik: '',
    name: '',
    positionTitle: '',
    departmentId: 'DP-01',
    email: '',
    phone: '',
    ptkp: 'TK/0',
    basicSalary: 6000000,
    contractType: 'PKWTT',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Gagal memuat direktori karyawan');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan karyawan');

      setFeedback({ type: 'success', message: 'Karyawan baru berhasil ditambahkan secara atomik ke database!' });
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.nik?.toLowerCase().includes(q) ||
      emp.positionTitle?.toLowerCase().includes(q) ||
      emp.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Direktori Karyawan</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Data seluruh personalia PT EasyGo GPS Indonesia, jabatan, status kontrak, dan saldo cuti terintegrasi.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'inline-flex', background: 'var(--seg)', padding: '3px', borderRadius: 'var(--r-md)' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px' }}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px' }}
            >
              Kartu
            </button>
          </div>
          <button
            onClick={() => {
              const highestNum = employees.reduce((max, e) => {
                const n = parseInt(String(e.id || '').replace(/\D/g, '') || '0', 10);
                return n > max ? n : max;
              }, 11);
              const nextNum = highestNum + 1;
              const nextId = nextNum < 10 ? `E0${nextNum}` : `E${nextNum}`;
              setFormData({
                id: nextId,
                nik: `2026${String(nextNum).padStart(4, '0')}`,
                name: '',
                positionTitle: 'Teknisi instalasi GPS',
                departmentId: 'DP-01',
                email: '',
                phone: '0812-',
                ptkp: 'TK/0',
                basicSalary: 6500000,
                contractType: 'PKWTT',
              });
              setIsModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Tambah Karyawan Baru</span>
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

      {/* Filter and Content Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ maxWidth: '360px', width: '100%' }}>
            <input
              type="text"
              placeholder="Cari berdasarkan Nama, NIK, atau Jabatan..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>
            {filteredEmployees.length} Karyawan Terdaftar
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>
            Memuat direktori karyawan dari Neon PostgreSQL...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>
            Tidak ada karyawan ditemukan.
          </div>
        ) : viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NIK</th>
                  <th>Nama Lengkap</th>
                  <th>Jabatan</th>
                  <th>Email</th>
                  <th>PTKP</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-mono">
                      <span className="badge badge-orange">{emp.id}</span>
                    </td>
                    <td className="font-mono">{emp.nik}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--seg)',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--ink-2)',
                            overflow: 'hidden',
                          }}
                        >
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            emp.name.charAt(0)
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td>{emp.positionTitle}</td>
                    <td style={{ color: 'var(--mut)' }}>{emp.email}</td>
                    <td>
                      <span className="badge badge-gray">{emp.ptkp || 'TK/0'}</span>
                    </td>
                    <td>
                      <span className={`badge ${emp.isActive ? 'badge-green' : 'badge-red'}`}>
                        {emp.isActive ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link href={`/employees/${emp.id}`} className="btn btn-secondary btn-sm">
                        Detail Profil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--or-l)',
                      color: 'var(--or-d)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                      overflow: 'hidden',
                    }}
                  >
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      emp.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>{emp.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--mut)' }}>{emp.positionTitle}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--mut)' }}>NIK:</span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>{emp.nik}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--mut)' }}>Email:</span>
                    <span style={{ color: 'var(--ink-2)' }}>{emp.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--mut)' }}>Status Pajak:</span>
                    <span className="badge badge-gray">{emp.ptkp || 'TK/0'}</span>
                  </div>
                </div>

                <Link href={`/employees/${emp.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '6px' }}>
                  Lihat & Kelola Profil
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Tambah Karyawan Baru (Atomic Creation)</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">ID Karyawan</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor Induk Karyawan (NIK)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Lengkap Sesuai KTP</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Jabatan / Posisi</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.positionTitle}
                      onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status PTKP (Pajak)</label>
                    <select
                      className="form-control"
                      value={formData.ptkp}
                      onChange={(e) => setFormData({ ...formData, ptkp: e.target.value })}
                    >
                      <option value="TK/0">TK/0 (Tidak Kawin)</option>
                      <option value="TK/1">TK/1 (Tanggungan 1)</option>
                      <option value="K/0">K/0 (Kawin)</option>
                      <option value="K/1">K/1 (Kawin 1 Anak)</option>
                      <option value="K/2">K/2 (Kawin 2 Anak)</option>
                      <option value="K/3">K/3 (Kawin 3 Anak)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Email Resmi</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Telepon / WA</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Gaji Pokok Awal (Rp)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jenis Kontrak</label>
                    <select
                      className="form-control"
                      value={formData.contractType}
                      onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    >
                      <option value="PKWTT">PKWTT (Karyawan Tetap)</option>
                      <option value="PKWT">PKWT (Kontrak Waktu Tertentu)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan & Buat Kuota Cuti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
