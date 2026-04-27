import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, Shield, Users, Zap } from 'lucide-react'
import { redirectToOAuth, extractTokenFromUrl } from '@/lib/auth/oauthRedirect'
import { setAccessToken } from '@/lib/auth/authHelpers'
import { useUIStore } from '@/stores/uiStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const accessToken = useUIStore((s) => s.accessToken)

  useEffect(() => {
    const token = extractTokenFromUrl()
    if (token) {
      setAccessToken(token)
      navigate('/board', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (accessToken) navigate('/board', { replace: true })
  }, [accessToken, navigate])

  return (
    <div className="w-full max-w-[420px] space-y-8">

      {/* Mobile logo (visible only on small screens) */}
      <div className="flex lg:hidden items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="white" />
            <rect x="13" y="2" width="9" height="9" rx="2" fill="white" opacity="0.6" />
            <rect x="2" y="13" width="9" height="9" rx="2" fill="white" opacity="0.6" />
            <rect x="13" y="13" width="9" height="9" rx="2" fill="white" opacity="0.3" />
          </svg>
        </div>
        <span className="font-semibold text-slate-900">Mini Jira</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-slate-500 text-base">
          Inicia sesión con tu cuenta corporativa para continuar.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Equipos', value: '500+' },
          { icon: Zap, label: 'Tickets/día', value: '12k' },
          { icon: Shield, label: 'SSO Seguro', value: '99.9%' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}
            className="rounded-xl p-3 text-center space-y-1"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Icon className="w-4 h-4 text-blue-500 mx-auto" />
            <p className="text-lg font-bold text-slate-800">{value}</p>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* SSO Button */}
      <div className="space-y-3">
        <button
          onClick={redirectToOAuth}
          className="group w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(37,99,235,0.5)'
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(37,99,235,0.35)'
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight">Ingresar con cuenta corporativa</p>
              <p className="text-xs text-blue-200 font-normal mt-0.5">Single Sign-On (SSO)</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 py-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs text-slate-400">
            Conexión cifrada · Autenticación OAuth 2.0
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400 font-medium">ACCESO CORPORATIVO</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-slate-400">
        ¿Problemas para acceder?{' '}
        <a href="mailto:soporte@empresa.com"
          className="text-blue-600 font-medium hover:text-blue-700 hover:underline transition-colors">
          Contacta a soporte
        </a>
      </p>
    </div>
  )
}
