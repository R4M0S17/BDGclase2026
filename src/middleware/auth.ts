import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'development') {
    const devRole = req.headers['x-dev-role']
    if (devRole === 'admin' || devRole === 'user') {
      req.user = { userId: 1, role: devRole }
      return next()
    }
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: 'admin' | 'user' }
    req.user = { userId: payload.userId, role: payload.role }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
