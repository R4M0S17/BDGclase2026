import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

const router = Router()

// ─── Provider config ──────────────────────────────────────────────────────────

type Provider = 'google' | 'microsoft'

const PROVIDERS = {
  google: {
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientId:     () => process.env.GOOGLE_CLIENT_ID!,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET!,
  },
  microsoft: {
    tokenUrl: () =>
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? 'common'}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientId:     () => process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET!,
  },
} satisfies Record<Provider, unknown>

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function exchangeCode(provider: Provider, code: string, redirectUri: string) {
  const cfg = PROVIDERS[provider]

  const tokenRes = await fetch(cfg.tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     cfg.clientId(),
      client_secret: cfg.clientSecret(),
    }).toString(),
  })
  if (!tokenRes.ok) throw Object.assign(new Error('OAuth token exchange failed'), { status: 502 })

  const { access_token } = await tokenRes.json() as { access_token: string }

  const infoRes = await fetch(cfg.userInfoUrl, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!infoRes.ok) throw Object.assign(new Error('Failed to fetch user info from provider'), { status: 502 })

  const info = await infoRes.json() as Record<string, string>

  // Normalize across Google (sub/email/name) and Microsoft (id/mail|userPrincipalName/displayName)
  const oauthId = info.sub ?? info.id
  const email   = info.email ?? info.mail ?? info.userPrincipalName ?? ''
  const name    = info.name ?? info.displayName ?? email

  if (!oauthId || !email) {
    throw Object.assign(new Error('Incomplete profile from OAuth provider'), { status: 502 })
  }

  return { oauthId, name, email }
}

function signToken(userId: number, role: 'admin' | 'user') {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '8h' })
}

// ─── POST /auth/oauth/callback ────────────────────────────────────────────────

const callbackSchema = z.object({
  code:        z.string().min(1),
  provider:    z.enum(['google', 'microsoft']),
  redirectUri: z.string().url(),
})

router.post('/oauth/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = callbackSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { code, provider, redirectUri } = parsed.data
    const { oauthId, name, email } = await exchangeCode(provider, code, redirectUri)

    // Look up by (provider, oauthId) first; fall back to upsert by email on first login
    let [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId)))
      .limit(1)

    if (!user) {
      ;[user] = await db
        .insert(users)
        .values({ name, email, oauthProvider: provider, oauthId, role: 'user' })
        .onConflictDoUpdate({
          target: users.email,
          set: { oauthProvider: provider, oauthId, name },
        })
        .returning()
    }

    res.json({
      token: signToken(user.id, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'development') {
  // Dev bypass: return a mock access token so the Axios interceptor doesn't clear state
  router.post('/refresh', (_req: Request, res: Response) => {
    res.json({ accessToken: 'dev-mock-token-' + Date.now() })
  })
}

// ─── POST /auth/dev-token  (NODE_ENV=development only) ───────────────────────

if (process.env.NODE_ENV === 'development') {
  const devTokenSchema = z.object({
    userId: z.number().int().positive(),
    role:   z.enum(['admin', 'user']).default('user'),
  })

  router.post('/dev-token', (req: Request, res: Response) => {
    const parsed = devTokenSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }
    res.json({ token: signToken(parsed.data.userId, parsed.data.role) })
  })
}

export default router
