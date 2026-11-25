import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/db/drizzle';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'easygo-hris-super-secure-secret-key-2026';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    let userId: string | null = null;
    let empId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
        empId = decoded.emp_id;
      } catch (e) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
      }
    } else {
      const fallbackUserId = req.headers.get('x-user-id');
      if (fallbackUserId) {
        const uRes = await pool.query('SELECT * FROM users WHERE id = $1 OR emp_id = $1', [fallbackUserId]);
        if (uRes.rows[0]) {
          userId = uRes.rows[0].id;
          empId = uRes.rows[0].emp_id;
        }
      }
    }

    if (!userId && !empId) {
      return NextResponse.json({ error: 'Unauthorized: Token required' }, { status: 401 });
    }

    const uRes = await pool.query('SELECT * FROM users WHERE id = $1 OR emp_id = $2', [userId, empId]);
    const user = uRes.rows[0];
    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'User is inactive or not found' }, { status: 401 });
    }

    const empRes = await pool.query(
      `
      SELECT e.*, d.name as department_name, dir.name as directorate_name, g.name as grade_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN directorates dir ON e.directorate_id = dir.id
      LEFT JOIN grades g ON e.grade_id = g.id
      WHERE e.id = $1
    `,
      [user.emp_id]
    );

    return NextResponse.json({
      user: {
        id: user.id,
        empId: user.emp_id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        access: user.access,
      },
      employee: empRes.rows[0] || null,
    });
  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
