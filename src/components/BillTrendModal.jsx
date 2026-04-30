import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts"
import { calculateSplit, fmt } from "@/lib/parser"
import { monthLabel } from "@/lib/store"

function getBillAmount(month, section, label) {
  if (section === "ev_paras") return calculateSplit(month).parasEV
  if (section === "ev_mishal") return calculateSplit(month).mishalEV
  const items = month[section] || []
  const item = items.find(it => it.label === label)
  return item != null ? item.amount : null
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0]?.value
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-0.5">{label}</p>
        <p className="font-mono text-base font-bold">{val != null ? fmt(val) : "—"}</p>
      </div>
    )
  }
  return null
}

export default function BillTrendModal({ bill, months, onClose }) {
  if (!bill) return null

  const { section, label } = bill

  const displayLabel =
    section === "ev_paras" ? "Paras EV Cost"
    : section === "ev_mishal" ? "Mishal EV Cost"
    : label

  // Build oldest-to-newest chart data
  const chartData = [...months].reverse().map(m => {
    const amount = getBillAmount(m, section, label)
    return {
      month: monthLabel(m.monthKey).replace(" 20", " '"),
      amount: amount != null ? parseFloat(amount.toFixed(2)) : null,
    }
  })

  const values = chartData.map(d => d.amount).filter(v => v != null)
  const hasData = values.length > 0
  const avg = hasData ? values.reduce((s, v) => s + v, 0) / values.length : 0

  return (
    <Dialog open={!!bill} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {displayLabel} — Month-over-Month
          </DialogTitle>
        </DialogHeader>

        {!hasData ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No data found for this bill across your months.
          </p>
        ) : (
          <div className="pt-1 space-y-3">
            {/* Mini stat row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Latest", value: fmt(values.at(-1)) },
                { label: "Average", value: fmt(avg) },
                { label: "Highest", value: fmt(Math.max(...values)) },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="font-mono font-semibold text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={avg}
                  stroke="#9ca3af"
                  strokeDasharray="4 2"
                  label={{ value: "avg", position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name={displayLabel}
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#111827", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {chartData.some(d => d.amount === null) && (
              <p className="text-xs text-muted-foreground text-center">
                Gaps indicate months where this bill was not recorded.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
