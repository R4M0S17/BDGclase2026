import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1d4ed8 100%)',
        }}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="#60a5fa" />
              <rect x="13" y="2" width="9" height="9" rx="2" fill="#93c5fd" opacity="0.7" />
              <rect x="2" y="13" width="9" height="9" rx="2" fill="#93c5fd" opacity="0.7" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="#bfdbfe" opacity="0.5" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Mini Jira</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-blue-200"
              style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Plataforma corporativa
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Gestiona tu equipo<br />
              <span style={{ color: '#93c5fd' }}>sin fricción.</span>
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
              Tablero Kanban, métricas en tiempo real y colaboración centralizada para equipos de alto rendimiento.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {[
              { icon: '⚡', text: 'Tablero Kanban en tiempo real' },
              { icon: '📊', text: 'Dashboard con métricas del equipo' },
              { icon: '🔒', text: 'Acceso seguro con SSO corporativo' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {f.icon}
                </span>
                <span className="text-blue-100 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-blue-300/60 text-xs">
            © 2026 Mini Jira · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 bg-white">
        {children}
      </div>
    </div>
  )
}
