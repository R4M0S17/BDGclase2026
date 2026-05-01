import { Download } from 'lucide-react'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { DashboardFilters } from '@/types'

interface Props {
  filters: DashboardFilters
}

function isDisabled(filters: DashboardFilters): boolean {
  if (!filters.from || !filters.to) return true
  return filters.from > filters.to
}

export default function ExportCSVButton({ filters }: Props) {
  const disabled = isDisabled(filters)

  async function handleExport() {
    const response = await apiClient.get(API.metrics.export, {
      params: filters,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metrics-${filters.from}-${filters.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative group">
      <button
        onClick={disabled ? undefined : handleExport}
        disabled={disabled}
        className={[
          'flex items-center gap-2 px-4 py-2 rounded-md text-[0.875rem] font-medium transition-opacity',
          disabled
            ? 'bg-surface-container-high text-outline-variant cursor-not-allowed'
            : 'bg-gradient-to-br from-primary to-primary-dim text-on-primary hover:opacity-90',
        ].join(' ')}
      >
        <Download className="w-3.5 h-3.5" />
        Export CSV
      </button>
      {disabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-inverse-surface text-on-primary text-[0.75rem] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
          Selecciona un rango de fechas válido
        </div>
      )}
    </div>
  )
}
