import { NextRequest, NextResponse } from 'next/server';
import { GET as getEmployees, POST as postEmployee } from '@/app/api/employees/route';

export async function GET(req: NextRequest) {
  return getEmployees(req);
}

export async function POST(req: NextRequest) {
  return postEmployee(req);
}
