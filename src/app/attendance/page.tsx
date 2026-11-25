'use client';

import React, { useState, useEffect } from 'react';
import { getStoredUser, UserSession } from '@/lib/auth';

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'clock' | 'timesheet' | 'ftw' | 'history'>('clock');
  const [data, setData] = useState<{ attendance: any[]; timesheets: any[]; fitToWork: any[] }>({
    attendance: [],
    timesheets: [],
    fitToWork: [],
  });
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -6.16, lng: 106.84 });
  const [geoLocating, setGeoLocating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Timesheet form state
  const [tsForm, setTsForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    startTime: '08:30',
    endTime: '17:30',
    activity: 'Instalasi GPS Fleet 5 Unit Truk Tronton di Pool Cakung',
    notes: 'Koneksi sensor telemetri temperatur dan GPS tracker stabil',
  });

  // Fit to Work state
  const [ftwAnswers, setFtwAnswers] = useState({
    suhu: '36.5',
    istirahatCukup: true,
    bebasGejala: true,
    alatPelindungDiri: true,
  });

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    fetchData(user.empId);

    const handleAuth = () => {
      const u = getStoredUser();
      setCurrentUser(u);
      fetchData(u.empId);
    };
    window.addEventListener('easygo_auth_change', handleAuth);
    return () => window.removeEventListener('easygo_auth_change', handleAuth);
  }, []);

  const fetchData = async (empId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?empId=${empId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    setGeoLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoLocating(false);
          setFeedback({ type: 'success', message: `Koordinat GPS berhasil diperoleh: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        },
        () => {
          setCoords({ lat: -6.1601, lng: 106.8402 });
          setGeoLocating(false);
          setFeedback({ type: 'success', message: 'Menggunakan titik presisi kantor Kemayoran (-6.1601, 106.8402)' });
        }
      );
    } else {
      setCoords({ lat: -6.1601, lng: 106.8402 });
      setGeoLocating(false);
    }
  };

  const handleClockIn = async () => {
    setFeedback(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_in',
          payload: {
            empId: currentUser?.empId || 'E04',
            lat: coords.lat,
            lng: coords.lng,
            location: 'Kantor Pusat Kemayoran',
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Clock-in gagal');

      setFeedback({
        type: 'success',
        message: `Clock-In Berhasil! Jarak geofence: ${resData.geofence.distance}m (${resData.attendance.matchStatus}). Neon Serverless Edge Function tervalidasi.`,
      });
      fetchData(currentUser?.empId || 'E04');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleClockOut = async () => {
    setFeedback(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_out',
          payload: {
            empId: currentUser?.empId || 'E04',
            lat: coords.lat,
            lng: coords.lng,
            location: 'Kantor Pusat Kemayoran',
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Clock-out gagal');

      setFeedback({
        type: 'success',
        message: 'Clock-Out Berhasil! Presensi hari ini telah tercatat lengkap di Neon PostgreSQL.',
      });
      fetchData(currentUser?.empId || 'E04');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSaveTimesheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_timesheet',
          payload: {
            empId: currentUser?.empId || 'E04',
            ...tsForm,
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal menyimpan timesheet');

      setFeedback({ type: 'success', message: 'Timesheet kegiatan berhasil disimpan!' });
      fetchData(currentUser?.empId || 'E04');
      setActiveTab('history');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSaveFtw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isFit = ftwAnswers.istirahatCukup && ftwAnswers.bebasGejala && Number(ftwAnswers.suhu) <= 37.5;
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_ftw',
          payload: {
            empId: currentUser?.empId || 'E04',
            isFit,
            answers: ftwAnswers,
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal mengirim FTW');

      setFeedback({
        type: 'success',
        message: `Asesmen Fit To Work berhasil dikirim. Status: ${isFit ? 'FIT UNTUK BEKERJA' : 'DISARANKAN ISTIRAHAT'}`,
      });
      fetchData(currentUser?.empId || 'E04');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Presensi, GPS & Timesheet</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Pencatatan jam kerja telemetri dengan validasi radius geofence, deklarasi Fit to Work, dan log lembar kerja.
          </p>
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
          onClick={() => setActiveTab('clock')}
          className={`btn btn-sm ${activeTab === 'clock' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Presensi Mandiri (Clock In/Out)
        </button>
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`btn btn-sm ${activeTab === 'timesheet' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Isi Timesheet Kegiatan
        </button>
        <button
          onClick={() => setActiveTab('ftw')}
          className={`btn btn-sm ${activeTab === 'ftw' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Fit To Work (FTW)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Riwayat Presensi
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'clock' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Clock In / Out Panel */}
          <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-green">Zona WIB (Asia/Jakarta)</span>
              <span className="badge badge-orange">Neon Functions Edge Geofence</span>
            </div>

            <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--ink)', margin: '16px 0 8px' }}>
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--mut)', marginBottom: '24px' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            {/* Geolocation status pill */}
            <div
              style={{
                background: 'var(--seg)',
                borderRadius: 'var(--r-lg)',
                padding: '14px',
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Lokasi Geofence Kantor:</span>
                <button onClick={handleGetLocation} className="btn btn-secondary btn-sm" disabled={geoLocating}>
                  {geoLocating ? 'Mendeteksi...' : '📡 Perbarui GPS'}
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px' }}>
                Target: Kantor Pusat Kemayoran (-6.1600, 106.8400)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px', fontFamily: 'var(--mono)' }}>
                Posisi saat ini: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <button
                onClick={handleClockIn}
                className="btn btn-primary"
                style={{ padding: '16px', fontSize: '16px', fontWeight: 800 }}
              >
                ✓ Masuk (Clock In)
              </button>
              <button
                onClick={handleClockOut}
                className="btn btn-secondary"
                style={{ padding: '16px', fontSize: '16px', fontWeight: 800 }}
              >
                → Pulang (Clock Out)
              </button>
            </div>
          </div>

          {/* Today Attendance Snapshot */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Status Presensi Hari Ini</h3>
            {data.attendance.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Tanggal:</span>
                  <strong style={{ fontSize: '13px' }}>{data.attendance[0].date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Jam Masuk:</span>
                  <strong className="font-mono" style={{ color: 'var(--green-d)', fontSize: '14px' }}>
                    {data.attendance[0].clockIn || '-'} WIB
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Jam Pulang:</span>
                  <strong className="font-mono" style={{ color: 'var(--or-d)', fontSize: '14px' }}>
                    {data.attendance[0].clockOut ? data.attendance[0].clockOut + ' WIB' : 'Belum Absen Pulang'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Status Geofence:</span>
                  <span className="badge badge-green">{data.attendance[0].matchStatus || 'Match'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Status Kesehatan:</span>
                  <span className="badge badge-blue">{data.attendance[0].fitToWorkStatus || 'Fit'}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mut)', fontSize: '13px' }}>
                Belum ada catatan presensi untuk hari ini. Silakan klik <strong>Clock In</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timesheet' && (
        <div className="card" style={{ padding: '24px', maxWidth: '720px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Input Lembar Kerja (Timesheet)</h3>
          <p style={{ fontSize: '13px', color: 'var(--mut)', marginBottom: '20px' }}>
            Laporkan kegiatan teknis dan durasi kerja untuk verifikasi atasan dan perhitungan insentif.
          </p>

          <form onSubmit={handleSaveTimesheet}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tanggal</label>
                <input
                  type="date"
                  className="form-control"
                  value={tsForm.date}
                  onChange={(e) => setTsForm({ ...tsForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Jam Mulai</label>
                <input
                  type="time"
                  className="form-control"
                  value={tsForm.startTime}
                  onChange={(e) => setTsForm({ ...tsForm, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Jam Selesai</label>
                <input
                  type="time"
                  className="form-control"
                  value={tsForm.endTime}
                  onChange={(e) => setTsForm({ ...tsForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Uraian Tugas & Kegiatan</label>
              <textarea
                className="form-control"
                rows={3}
                value={tsForm.activity}
                onChange={(e) => setTsForm({ ...tsForm, activity: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Lapangan & Kendala</label>
              <input
                type="text"
                className="form-control"
                value={tsForm.notes}
                onChange={(e) => setTsForm({ ...tsForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary">
                Simpan Timesheet
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'ftw' && (
        <div className="card" style={{ padding: '24px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Deklarasi Kesehatan Harian (Fit to Work)</h3>
          <p style={{ fontSize: '13px', color: 'var(--mut)', marginBottom: '20px' }}>
            Wajib diisi sebelum memulai penugasan lapangan atau instalasi armada kendaraan.
          </p>

          <form onSubmit={handleSaveFtw}>
            <div className="form-group">
              <label className="form-label">Suhu Tubuh Saat Ini (°C)</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={ftwAnswers.suhu}
                onChange={(e) => setFtwAnswers({ ...ftwAnswers, suhu: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ftwAnswers.istirahatCukup}
                  onChange={(e) => setFtwAnswers({ ...ftwAnswers, istirahatCukup: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--or)' }}
                />
                <span>Saya beristirahat cukup (minimal 6 jam tidur) dan tidak mengantuk</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ftwAnswers.bebasGejala}
                  onChange={(e) => setFtwAnswers({ ...ftwAnswers, bebasGejala: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--or)' }}
                />
                <span>Saya bebas dari gejala flu berat, demam, pusing, atau keluhan fisik</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ftwAnswers.alatPelindungDiri}
                  onChange={(e) => setFtwAnswers({ ...ftwAnswers, alatPelindungDiri: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--or)' }}
                />
                <span>Saya membawa APD lengkap (safety vest, helm, sepatu safety, toolkit)</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Kirim Deklarasi Fit to Work
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Riwayat Presensi & Log Jam Kerja</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Presensi</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Lokasi</th>
                  <th>Koordinat</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.attendance.length > 0 ? (
                  data.attendance.map((att) => (
                    <tr key={att.id}>
                      <td className="font-mono">{att.id}</td>
                      <td>{att.date}</td>
                      <td className="font-mono" style={{ color: 'var(--green-d)', fontWeight: 700 }}>
                        {att.clockIn} WIB
                      </td>
                      <td className="font-mono" style={{ color: 'var(--or-d)', fontWeight: 700 }}>
                        {att.clockOut ? att.clockOut + ' WIB' : '-'}
                      </td>
                      <td>{att.locationIn}</td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>{att.coordsIn}</td>
                      <td>
                        <span className={`badge ${att.matchStatus === 'Match' ? 'badge-green' : 'badge-amber'}`}>
                          {att.matchStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="font-mono">AB-01</td>
                    <td>2026-11-24</td>
                    <td className="font-mono">06:55 WIB</td>
                    <td className="font-mono">15:10 WIB</td>
                    <td>Kantor Pusat Kemayoran</td>
                    <td className="font-mono">-6.160, 106.840</td>
                    <td><span className="badge badge-green">Match</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
