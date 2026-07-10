import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.ts';
import { signToken, signRefreshToken, verifyRefreshToken } from '../services/jwtService.ts';
import logger from '../services/logger.ts';
import { logActivity } from '../services/activityLog.ts';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y password requeridos' });
      return;
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]) as any[];
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await pool.query(
      'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
      [refreshToken, expiresAt, user.id]
    );

    logActivity({ userId: user.id, userEmail: user.email, action: 'LOGIN', ip: req.ip });

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `jwt=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Strict${secure}`);
    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name ?? null, role: user.role },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }

    let decoded: { id: number; email: string; role: 'admin' | 'operator' };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ error: 'Refresh token inválido o expirado' });
      return;
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [decoded.id]
    ) as any[];
    const user = rows[0];
    if (!user || user.refresh_token !== refreshToken || Date.now() > user.refresh_token_expires_at) {
      res.status(401).json({ error: 'Refresh token inválido o revocado' });
      return;
    }

    const newToken = signToken(user);
    const newRefreshToken = signRefreshToken(user);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await pool.query(
      'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
      [newRefreshToken, expiresAt, user.id]
    );

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    logger.error('Refresh error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role, name, qb_class_id } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y password requeridos' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]) as any[];
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email ya registrado' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, name, password, role, qb_class_id) VALUES (?, ?, ?, ?, ?)',
      [email, name ?? null, hashed, role ?? 'operator', qb_class_id ?? null]
    ) as any;

    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'USER_CREATED', entityType: 'user', entityId: result.insertId, details: `email: ${email}, name: ${name ?? ''}, role: ${role ?? 'operator'}`, ip: req.ip });
    res.status(201).json({ id: result.insertId, email, name: name ?? null, role: role ?? 'operator', qb_class_id: qb_class_id ?? null });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `jwt=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
      return;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user?.id]) as any[];
    const user = (rows as any[])[0];
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(401).json({ error: 'Contraseña actual incorrecta' }); return; }

    await pool.query('UPDATE users SET password = ? WHERE id = ?',
      [await bcrypt.hash(newPassword, 10), req.user?.id]);
    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'PASSWORD_CHANGED', entityType: 'user', entityId: req.user?.id, ip: req.ip });
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    logger.error('changePassword error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
