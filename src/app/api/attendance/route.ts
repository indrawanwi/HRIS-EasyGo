import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db/drizzle';
import { eq, desc } from 'drizzle-orm';

// Office Coordinates: Kemayoran (-6.1600, 106.8400)
const OFFICE_LAT = -6.16;
const OFFICE_LNG = 106.84;

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empId = searchParams.get('empId') || 'E04';

    const attendance = await db
      .select()
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.empId, empId))
      .orderBy(desc(schema.attendanceRecords.date));

    const timesheetList = await db
      .select()
      .from(schema.timesheets)
      .where(eq(schema.timesheets.empId, empId))
      .orderBy(desc(schema.timesheets.date));

    const ftwList = await db
      .select()
      .from(schema.fitToWork)
      .where(eq(schema.fitToWork.empId, empId))
      .orderBy(desc(schema.fitToWork.date));

    return NextResponse.json({
      attendance,
      timesheets: timesheetList,
      fitToWork: ftwList,
    });
  } catch (err: any) {
    console.error('Fetch attendance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const todayStr = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (action === 'clock_in') {
      const lat = payload.lat ?? -6.16;
      const lng = payload.lng ?? 106.84;
      const distance = calculateDistanceMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
      const isGeofenceValid = distance <= 150; // 150m tolerance
      const matchStatus = isGeofenceValid ? 'Match' : 'Out of Bounds';

      const nextId = 'AB-' + Math.floor(1000 + Math.random() * 9000);
      const [record] = await db
        .insert(schema.attendanceRecords)
        .values({
          id: nextId,
          empId: payload.empId || 'E04',
          date: todayStr,
          clockIn: timeNow,
          locationIn: payload.location || 'Kantor Pusat Kemayoran',
          coordsIn: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          photoIn: payload.photoUrl || null,
          matchStatus,
          fitToWorkStatus: 'Fit',
        })
        .returning();

      return NextResponse.json({
        success: true,
        attendance: record,
        geofence: { distance: Math.round(distance), valid: isGeofenceValid },
        neonFunctionExecuted: true,
      });
    }

    if (action === 'clock_out') {
      const lat = payload.lat ?? -6.16;
      const lng = payload.lng ?? 106.84;

      const [existing] = await db
        .select()
        .from(schema.attendanceRecords)
        .where(eq(schema.attendanceRecords.empId, payload.empId || 'E04'))
        .orderBy(desc(schema.attendanceRecords.date))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(schema.attendanceRecords)
          .set({
            clockOut: timeNow,
            locationOut: payload.location || 'Kantor Pusat Kemayoran',
            coordsOut: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          })
          .where(eq(schema.attendanceRecords.id, existing.id))
          .returning();

        return NextResponse.json({ success: true, attendance: updated });
      }

      return NextResponse.json({ error: 'No attendance record found for today' }, { status: 404 });
    }

    if (action === 'log_timesheet') {
      const nextId = 'TS-' + Math.floor(1000 + Math.random() * 9000);
      const [ts] = await db
        .insert(schema.timesheets)
        .values({
          id: nextId,
          empId: payload.empId || 'E04',
          date: payload.date || todayStr,
          startTime: payload.startTime || '08:00',
          endTime: payload.endTime || '17:00',
          activity: payload.activity,
          notes: payload.notes || '',
          coords: '-6.160, 106.840',
        })
        .returning();

      return NextResponse.json({ success: true, timesheet: ts });
    }

    if (action === 'submit_ftw') {
      const nextId = 'FTW-' + Math.floor(1000 + Math.random() * 9000);
      const [ftw] = await db
        .insert(schema.fitToWork)
        .values({
          id: nextId,
          empId: payload.empId || 'E04',
          date: todayStr,
          isFit: payload.isFit !== false,
          answers: payload.answers || { sehat: true, suhu: '36.5', istirahatCukup: true },
          decision: payload.isFit ? 'Approved' : 'Rest Advised',
        })
        .returning();

      return NextResponse.json({ success: true, fitToWork: ftw });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Attendance action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
