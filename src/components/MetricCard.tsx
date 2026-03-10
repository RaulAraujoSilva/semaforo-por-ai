interface MetricCardProps {
  label: string
  fixedValue: string
  aiValue: string
  unit: string
  better: 'higher' | 'lower'
}

export function MetricCard({ label, fixedValue, aiValue, unit, better }: MetricCardProps) {
  const fixedNum = parseFloat(fixedValue)
  const aiNum = parseFloat(aiValue)
  const hasData = !isNaN(fixedNum) && !isNaN(aiNum) && fixedValue !== '—' && aiValue !== '—'

  const diff = hasData ? aiNum - fixedNum : 0
  const isAiBetter = better === 'higher' ? diff > 0 : diff < 0
  const pct = hasData && fixedNum !== 0 ? Math.abs(diff / fixedNum * 100).toFixed(0) : null

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-white/40 mb-0.5">Fixo</p>
          <p className="text-xl font-bold text-white/70">{fixedValue}<span className="text-xs text-white/40 ml-1">{unit}</span></p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-white/40 mb-0.5">IA</p>
          <p className={`text-xl font-bold ${hasData ? (isAiBetter ? 'text-emerald-400' : 'text-red-400') : 'text-white/70'}`}>
            {aiValue}<span className="text-xs opacity-60 ml-1">{unit}</span>
          </p>
        </div>
      </div>
      {hasData && pct && (
        <p className={`text-xs mt-2 ${isAiBetter ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
          {isAiBetter ? '↑' : '↓'} {pct}% {isAiBetter ? 'melhor' : 'pior'}
        </p>
      )}
    </div>
  )
}
