import type { NextFunction, Request, Response } from 'express'

export interface AppError extends Error {
  status?: number
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500
  res.status(status).json({ error: err.message ?? 'Internal Server Error' })
}
