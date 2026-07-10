import jwt from 'jsonwebtoken';
import type { User } from '../types/index.ts';

const SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

type JwtUser = Pick<User, 'id' | 'email' | 'role'> & { name?: string | null; qb_class_id?: string | null };

export function signToken(user: JwtUser): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name ?? null, qb_class_id: user.qb_class_id ?? null }, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, SECRET) as JwtUser;
}

export function signRefreshToken(user: JwtUser): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name ?? null, qb_class_id: user.qb_class_id ?? null }, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JwtUser {
  return jwt.verify(token, REFRESH_SECRET) as JwtUser;
}
