'use client';

import React, { useState, useEffect } from 'react';

interface MasterEntityConfig {
  id: string;
  name: string;
  group: string;
  fields: { key: string; label: string; type: 'text' | 'number' | 'boolean' }[];
}

const MASTER_ENTITIES: MasterEntityConfig[] = [
  {
    id: 'departments',
    name: 'Departemen',
    group: 'Organisasi',
    fields: [
      { key: 'id', label: 'ID Departemen', type: 'text' },
      { key: 'name', label: 'Nama Departemen', type: 'text' },
      { key: 'directorateId', label: 'ID Direktorat', type: 'text' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    id: 'directorates',
    name: 'Direktorat',
    group: 'Organisasi',
    fields: [
      { key: 'id', label: 'ID Direktorat', type: 'text' },
      { key: 'name', label: 'Nama Direktorat', type: 'text' },
      { key: 'nameEn', label: 'Nama Inggris', type: 'text' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    id: 'units',
    name: 'Unit Kerja',
    group: 'Organisasi',
    fields: [
      { key: 'id', label: 'ID Unit', type: 'text' },
      { key: 'name', label: 'Nama Unit', type: 'text' },
      { key: 'departmentId', label: 'ID Departemen', type: 'text' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    id: 'grades',
    name: 'Golongan & Grade',
    group: 'Jabatan & Jenjang',
    fields: [
      { key: 'id', label: 'Kode Grade', type: 'text' },
      { key: 'name', label: 'Nama Grade', type: 'text' },
      { key: 'level', label: 'Tingkat Level (1-5)', type: 'number' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    id: 'positions',
    name: 'Jabatan (Positions)',
    group: 'Jabatan & Jenjang',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'title', label: 'Nama Posisi / Jabatan', type: 'text' },
      { key: 'departmentId', label: 'ID Departemen', type: 'text' },
      { key: 'gradeId', label: 'ID Grade', type: 'text' },
      { key: 'isFieldWorker', label: 'Pekerja Lapangan', type: 'boolean' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    id: 'work-patterns',
    name: 'Pola Jadwal Kerja',
    group: 'Jadwal & Shift',
    fields: [
      { key: 'id', label: 'Kode Pola', type: 'text' },
      { key: 'name', label: 'Nama Pola Kerja', type: 'text' },
      { key: 'clockIn', label: 'Jam Masuk (HH:mm)', type: 'text' },
      { key: 'clockOut', label: 'Jam Pulang (HH:mm)', type: 'text' },
    ],
  },
  {
    id: 'banks',
    name: 'Bank Mitra',
    group: 'Keuangan',
    fields: [
      { key: 'id', label: 'ID Bank', type: 'number' },
      { key: 'name', label: 'Nama Bank', type: 'text' },
      { key: 'code', label: 'Kode Sandi Bank', type: 'text' },
    ],
  },
  {
    id: 'leave-types',
    name: 'Jenis Cuti & Izin',
    group: 'Referensi',
    fields: [
      { key: 'id', label: 'Kode Cuti', type: 'text' },
      { key: 'name', label: 'Nama Cuti', type: 'text' },
      { key: 'hasQuota', label: 'Memotong Kuota', type: 'boolean' },
      { key: 'defaultDays', label: 'Alokasi Hari Tahunan', type: 'number' },
      { key: 'maxRetroactiveDays', label: 'Batas Retroaktif (Hari)', type: 'number' },
    ],
  },
  {
    id: 'users',
    name: 'Pengguna & Akun',
    group: 'Akses & Sistem',
    fields: [
      { key: 'id', label: 'ID User', type: 'text' },
      { key: 'empId', label: 'NIK / ID Karyawan', type: 'text' },
      { key: 'name', label: 'Nama Lengkap', type: 'text' },
      { key: 'email', label: 'Email Resmi', type: 'text' },
      { key: 'isActive', label: 'Status Aktif', type: 'boolean' },
    ],
  },
];

export default function MasterDataPage() {
  const [selectedEntityId, setSelectedEntityId] = useState<string>('departments');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeEntity = MASTER_ENTITIES.find((e) => e.id === selectedEntityId) || MASTER_ENTITIES[0];

  useEffect(() => {
    fetchItems(selectedEntityId);
  }, [selectedEntityId]);

  const fetchItems = async (entity: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/master/${entity}`);
      if (!res.ok) throw new Error('Gagal memuat master data ' + entity);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    const initial: Record<string, any> = {};
    activeEntity.fields.forEach((f) => {
      if (f.type === 'boolean') initial[f.key] = true;
      else if (f.type === 'number') initial[f.key] = 0;
      else initial[f.key] = '';
    });
    setFormData(initial);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(`/api/master/${selectedEntityId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operasi gagal');

      setFeedback({
        type: 'success',
        message: `Berhasil ${editingItem ? 'memperbarui' : 'menambahkan'} data ${activeEntity.name}!`,
      });
      setIsModalOpen(false);
      fetchItems(selectedEntityId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm(`Hapus data dengan ID ${id}?`)) return;
    try {
      const res = await fetch(`/api/master/${selectedEntityId}?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');

      setFeedback({ type: 'success', message: 'Data berhasil dihapus dari Neon PostgreSQL!' });
      fetchItems(selectedEntityId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    return Object.values(item).some(
      (val) => val && String(val).toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Entity Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Manajemen Data Master</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Akses dan manipulasi tabel inti organisasi, finance, serta referensi sistem secara atomik via Drizzle ORM.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Tambah {activeEntity.name}</span>
        </button>
      </div>

      {/* Entity Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {MASTER_ENTITIES.map((ent) => {
          const isSelected = ent.id === selectedEntityId;
          return (
            <button
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                background: isSelected ? 'var(--or)' : 'var(--card)',
                color: isSelected ? '#fff' : 'var(--ink-2)',
                border: `1px solid ${isSelected ? 'var(--or)' : 'var(--line-2)'}`,
                fontWeight: isSelected ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {ent.name}
            </button>
          );
        })}
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

      {/* Search and Table Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '320px', width: '100%' }}>
            <input
              type="text"
              placeholder={`Cari di tabel ${activeEntity.name}...`}
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: 600 }}>
            Menampilkan {filteredItems.length} dari {items.length} data
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>
            Memuat data dari Neon PostgreSQL...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>
            Tidak ada data ditemukan untuk kriteria pencarian.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {activeEntity.fields.map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    {activeEntity.fields.map((f) => {
                      const val = item[f.key];
                      if (f.type === 'boolean') {
                        return (
                          <td key={f.key}>
                            <span className={`badge ${val ? 'badge-green' : 'badge-red'}`}>
                              {val ? 'Aktif' : 'Non-Aktif'}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={f.key} className={f.key === 'id' ? 'font-mono' : ''}>
                          {val !== null && val !== undefined ? String(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => handleOpenEdit(item)} className="btn btn-secondary btn-sm">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px' }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                {editingItem ? `Edit ${activeEntity.name}` : `Tambah ${activeEntity.name} Baru`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {activeEntity.fields.map((f) => {
                  if (f.type === 'boolean') {
                    return (
                      <div key={f.key} className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          id={f.key}
                          checked={!!formData[f.key]}
                          onChange={(e) => setFormData({ ...formData, [f.key]: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--or)' }}
                        />
                        <label htmlFor={f.key} className="form-label" style={{ cursor: 'pointer', margin: 0 }}>
                          {f.label}
                        </label>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        className="form-control"
                        value={formData[f.key] ?? ''}
                        disabled={f.key === 'id' && !!editingItem}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
