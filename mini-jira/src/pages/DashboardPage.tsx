import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useUIStore } from '@/stores/uiStore'
import { useMetrics } from '@/hooks/useMetrics'
import MetricsFilters from '@/components/dashboard/MetricsFilters'
import ExportCSVButton from '@/components/dashboard/ExportCSVButton'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getAvatarColor } from '@/lib/utils'
import type { DashboardMetrics, TicketStatus } from '@/types'

const STATUS_COLORS: Record<TicketStatus, string> = {
  todo: '#acb3b8',
  in_progress: '#005bbf',
  review: '#d7e2ff',
  done: '#69f6b8',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: 'none',
  borderRadius: 8,
  boxShadow: '0px 12px 32px rgba(12,14,16,0.08)',
  fontSize: 12,
}

function ClosedByMonthChart({ data }: { data: DashboardMetrics['closedByMonth'] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(12,14,16,0.04)]">
      <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-4">
        Tickets cerrados por mes
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e9ee" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#acb3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#acb3b8' }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="closed" fill="#005bbf" radius={[4, 4, 0, 0]} name="Cerrados" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ByStatusChart({ data }: { data: DashboardMetrics['byStatus'] }) {
  const formatted = data.map((d) => ({ ...d, label: STATUS_LABELS[d.status] }))
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(12,14,16,0.04)]">
      <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-4">
        Por estado
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e9ee" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#acb3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: '#acb3b8' }}
            axisLine={false}
            tickLine={false}
            width={76}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Tickets">
            {formatted.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ByMemberList({ data }: { data: DashboardMetrics['byMember'] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.activeCount))
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(12,14,16,0.04)]">
      <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-4">
        Tickets activos por miembro
      </p>
      {data.length === 0 ? (
        <p className="text-[0.875rem] text-outline-variant">Sin datos para el período seleccionado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map(({ user, activeCount }) => (
            <div key={user.id} className="flex items-center gap-3">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-semibold shrink-0',
                  getAvatarColor(user.id),
                ].join(' ')}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 text-[0.875rem] text-inverse-surface truncate">{user.name}</span>
              <span className="text-[0.75rem] font-semibold text-primary w-6 text-right">{activeCount}</span>
              <div className="w-28 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.round((activeCount / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const filters = useUIStore((s) => s.dashboardFilters)
  const { data, isLoading } = useMetrics(filters)

  const summaryCards = data
    ? [
        { label: 'Total', value: data.total },
        { label: 'Cerrados', value: data.closedByMonth.reduce((sum, m) => sum + m.closed, 0) },
        { label: 'En progreso', value: data.byStatus.find((b) => b.status === 'in_progress')?.count ?? 0 },
        { label: 'Por revisar', value: data.byStatus.find((b) => b.status === 'review')?.count ?? 0 },
      ]
    : []

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-6 flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-[2.75rem] font-semibold text-inverse-surface tracking-[-0.02em] leading-none">
          Dashboard
        </h1>
        <ExportCSVButton filters={filters} />
      </div>

      <div className="px-8 pb-6">
        <MetricsFilters />
      </div>

      {isLoading && <LoadingSpinner />}

      {data && (
        <div className="px-8 pb-8 flex-1 overflow-auto">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {summaryCards.map(({ label, value }) => (
              <div
                key={label}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(12,14,16,0.04)]"
              >
                <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-1">
                  {label}
                </p>
                <p className="text-[2rem] font-semibold text-inverse-surface tracking-[-0.02em]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-2">
              <ClosedByMonthChart data={data.closedByMonth} />
            </div>
            <div>
              <ByStatusChart data={data.byStatus} />
            </div>
          </div>

          <ByMemberList data={data.byMember} />
        </div>
      )}
    </div>
  )
}
