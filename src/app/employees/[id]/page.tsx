'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empId = params.id as string;

  const [employee, setEmployee] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'contract' | 'quota' | 'bpjs'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEmployeeDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${empId}`);
      if (!res.ok) throw new Error('Karyawan tidak ditemukan');
      const data = await res.json();
      setEmployee(data);
      setEditForm(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => {
    fetchEmployeeDetail();
  }, [fetchEmployeeDetail]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload gagal');

      // Update employee record with new photoUrl
      const updateRes = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: uploadData.photoUrl }),
      });
      if (!updateRes.ok) throw new Error('Gagal memperbarui foto di database');

      setFeedback({ type: 'success', message: 'Foto profil berhasil diunggah ke Neon Object Storage!' });
      fetchEmployeeDetail();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data');

      setFeedback({ type: 'success', message: 'Perubahan data profil berhasil disimpan!' });
      setIsEditing(false);
      fetchEmployeeDetail();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mut)' }}>Memuat profil karyawan...</div>;
  }

  if (!employee) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Karyawan Tidak Ditemukan</h2>
        <Link href="/employees" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Kembali ke Direktori
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <Link href="/employees" style={{ color: 'var(--or)', fontWeight: 600 }}>
          ← Kembali ke Direktori
        </Link>
        <span style={{ color: 'var(--mut)' }}>/</span>
        <span style={{ color: 'var(--mut)' }}>Profil Karyawan</span>
        <span style={{ color: 'var(--mut)' }}>/</span>
        <span style={{ fontWeight: 700 }}>{employee.name}</span>
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

      {/* Profile Header Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          padding: '24px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Avatar with Upload Trigger */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'var(--or-l)',
                color: 'var(--or-d)',
                border: '3px solid var(--card)',
                boxShadow: 'var(--sh-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
                overflow: 'hidden',
              }}
            >
              {employee.photoUrl ? (
                <img src={employee.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                employee.name.charAt(0)
              )}
            </div>
            <label
              htmlFor="photo-upload-input"
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                background: 'var(--or)',
                color: '#fff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
              title="Unggah Foto Profil (Neon Object Storage)"
            >
              📷
            </label>
            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)' }}>{employee.name}</h1>
              <span className={`badge ${employee.isActive ? 'badge-green' : 'badge-red'}`}>
                {employee.isActive ? 'Aktif' : 'Non-Aktif'}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--mut)', marginTop: '2px' }}>
              {employee.positionTitle} • NIK: <strong className="font-mono">{employee.nik}</strong>
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12.5px' }}>
              <span>📧 {employee.email}</span>
              <span>📱 {employee.phone || '-'}</span>
              <span>🏢 Dept: {employee.departmentId || '-'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsEditing(!isEditing)} className="btn btn-secondary">
            {isEditing ? 'Batal Edit' : 'Edit Profil'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Data Pribadi
        </button>
        <button
          onClick={() => setActiveTab('contract')}
          className={`btn btn-sm ${activeTab === 'contract' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Kontrak & Gaji
        </button>
        <button
          onClick={() => setActiveTab('quota')}
          className={`btn btn-sm ${activeTab === 'quota' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Saldo Cuti (2026)
        </button>
        <button
          onClick={() => setActiveTab('bpjs')}
          className={`btn btn-sm ${activeTab === 'bpjs' ? 'btn-primary' : 'btn-secondary'}`}
        >
          BPJS & Rekening Bank
        </button>
      </div>

      {/* Tab Contents */}
      <div className="card" style={{ padding: '24px' }}>
        {isEditing ? (
          <form onSubmit={handleSaveProfile}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Edit Informasi Profil</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.positionTitle || ''}
                  onChange={(e) => setEditForm({ ...editForm, positionTitle: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telepon</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">KTP (16 Digit)</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.ktp || ''}
                  onChange={(e) => setEditForm({ ...editForm, ktp: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">NPWP (Pajak)</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.npwp || ''}
                  onChange={(e) => setEditForm({ ...editForm, npwp: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status PTKP</label>
                <select
                  className="form-control"
                  value={editForm.ptkp || 'TK/0'}
                  onChange={(e) => setEditForm({ ...editForm, ptkp: e.target.value })}
                >
                  <option value="TK/0">TK/0</option>
                  <option value="TK/1">TK/1</option>
                  <option value="K/0">K/0</option>
                  <option value="K/1">K/1</option>
                  <option value="K/2">K/2</option>
                  <option value="K/3">K/3</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Bank</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.bankName || ''}
                  onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Simpan Perubahan
              </button>
            </div>
          </form>
        ) : (
          <div>
            {activeTab === 'profile' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '12px' }}>
                    Identitas & Kependudukan
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                    <div><strong>No. KTP:</strong> <span className="font-mono">{employee.ktp || '3171xxxxxxxx0001'}</span></div>
                    <div><strong>NPWP:</strong> <span className="font-mono">{employee.npwp || '01.xxx.xxx.x-xxx.000'}</span></div>
                    <div><strong>Status Pajak PTKP:</strong> <span className="badge badge-orange">{employee.ptkp || 'TK/0'}</span></div>
                    <div><strong>Tanggal Bergabung:</strong> {employee.joinDate || '2021-09-06'}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '12px' }}>
                    Kontak & Organisasi
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                    <div><strong>Email Resmi:</strong> {employee.email}</div>
                    <div><strong>No. Telepon:</strong> {employee.phone || '-'}</div>
                    <div><strong>Direktorat:</strong> {employee.directorateId || 'DR-01'}</div>
                    <div><strong>Departemen:</strong> {employee.departmentId || 'DP-01'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contract' && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '14px' }}>
                  Riwayat Kontrak Kerja & Gaji Pokok
                </h4>
                {employee.contracts && employee.contracts.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID Kontrak</th>
                          <th>Jenis Kontrak</th>
                          <th>Tanggal Mulai</th>
                          <th>Tanggal Berakhir</th>
                          <th className="text-right">Gaji Pokok (IDR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.contracts.map((c: any) => (
                          <tr key={c.id}>
                            <td className="font-mono">{c.id}</td>
                            <td><span className="badge badge-blue">{c.contractType}</span></td>
                            <td>{c.startDate}</td>
                            <td>{c.endDate || 'Berlaku Selamanya'}</td>
                            <td className="text-right font-mono" style={{ fontWeight: 700 }}>
                              Rp {Number(c.basicSalary).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--mut)', fontSize: '13px' }}>Tidak ada riwayat kontrak khusus.</div>
                )}
              </div>
            )}

            {activeTab === 'quota' && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '14px' }}>
                  Alokasi & Sisa Kuota Cuti Karyawan (Tahun 2026)
                </h4>
                {employee.leaveQuotas && employee.leaveQuotas.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tipe Cuti</th>
                          <th>Tahun</th>
                          <th className="text-right">Alokasi (Hari)</th>
                          <th className="text-right">Terpakai (Hari)</th>
                          <th className="text-right">Sisa Kuota (Hari)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.leaveQuotas.map((q: any) => (
                          <tr key={q.id}>
                            <td><strong>{q.leaveTypeId === 'JC-01' ? 'Cuti Tahunan Reguler' : q.leaveTypeId}</strong></td>
                            <td className="font-mono">{q.year}</td>
                            <td className="text-right font-mono">{q.allocatedDays}</td>
                            <td className="text-right font-mono">{q.usedDays}</td>
                            <td className="text-right font-mono">
                              <span className="badge badge-green" style={{ fontSize: '13px', fontWeight: 700 }}>
                                {q.remainingDays} Hari
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--mut)', fontSize: '13px' }}>Kuota cuti belum diinisialisasi.</div>
                )}
              </div>
            )}

            {activeTab === 'bpjs' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '12px' }}>
                    Kepesertaan Jaminan Sosial (BPJS)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                    <div><strong>BPJS Kesehatan:</strong> <span className="font-mono">{employee.bpjsKes || '0001239847123'}</span> (Aktif)</div>
                    <div><strong>BPJS Ketenagakerjaan:</strong> <span className="font-mono">{employee.bpjsTk || '180293847192'}</span> (JHT, JP, JKK, JKM)</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mut)', marginBottom: '12px' }}>
                    Rekening Payroll Bank
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                    <div><strong>Bank:</strong> {employee.bankName || 'BCA (Bank Central Asia)'}</div>
                    <div><strong>No. Rekening:</strong> <span className="font-mono">{employee.bankAccount || '8410294821'}</span></div>
                    <div><strong>Atas Nama:</strong> {employee.name}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
