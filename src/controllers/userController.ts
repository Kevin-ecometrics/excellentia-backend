import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { logActivity } from '../services/activityLog.ts';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, role, qb_class_id, created_at FROM users ORDER BY created_at DESC'
    ) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listUsers error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { email, name, role, password, qb_class_id } = req.body;

    if (!email && !name && !role && !password && qb_class_id === undefined) {
      res.status(400).json({ error: 'Nada que actualizar' });
      return;
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]) as any[];
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
      ) as any[];
      if ((existing as any[]).length > 0) {
        res.status(409).json({ error: 'Email ya registrado por otro usuario' });
        return;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (email)    { updates.push('email = ?');    params.push(email); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name || null); }
    if (role)     { updates.push('role = ?');     params.push(role); }
    if (password) { updates.push('password = ?'); params.push(await bcrypt.hash(password, 10)); }
    if (qb_class_id !== undefined) { updates.push('qb_class_id = ?'); params.push(qb_class_id || null); }

    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'USER_UPDATED', entityType: 'user', entityId: id, ip: req.ip });
    res.json({ message: `Usuario ${id} actualizado` });
  } catch (err) {
    logger.error('updateUser error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    if (parseInt(id) === req.user?.id) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      return;
    }
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'USER_DELETED', entityType: 'user', entityId: id, ip: req.ip });
    res.json({ message: `Usuario ${id} eliminado` });
  } catch (err) {
    logger.error('deleteUser error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
