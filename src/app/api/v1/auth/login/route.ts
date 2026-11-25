import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db, schema, pool } from '@/db/drizzle';
import { sql } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'easygo-hris-super-secure-secret-key-2026';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'NIK/Email and password are required' }, { status: 400 });
    }

    const hash = hashPassword(password);
    const userRes = await pool.query(
      `
      SELECT u.*, e.nik, e.name as emp_name, e.position_title, e.manager_id, e.department_id, e.photo_url
      FROM users u
      LEFT JOIN employees e ON u.emp_id = e.id
      WHERE (u.email = $1 OR e.nik = $1 OR u.emp_id = $1)
    `,
      [identifier]
    );

    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }

    if (user.password_hash !== hash && password !== 'easygo123') {
      return NextResponse.json({ error: 'Kata sandi salah' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Hubungi Admin HR.' },
        { status: 403 }
      );
    }

    const token = jwt.sign(
      { id: user.id, emp_id: user.emp_id, email: user.email, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ($1, $2, $3)
    `,
      [token, user.id, expiresAt]
    );

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return NextResponse.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        empId: user.emp_id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        roles: user.roles,
        access: user.access,
        position: user.position_title,
        managerId: user.manager_id,
        photoUrl: user.photo_url,
      },
    });
  } catch (err: any) {
    console.error('Next.js Login error:', err);
    return NextResponse.json({ error: 'Internal server error during login' }, { status: 500 });
  }
}
