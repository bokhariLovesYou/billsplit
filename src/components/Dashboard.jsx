import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateSplit, fmt } from "@/lib/parser"
import { monthLabel } from "@/lib/store"
import { TrendingUp, TrendingDown, Minus, DollarSign, Home, Zap, Package } from "lucide-react"

function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <Card>
      <CardContent className="pt-5 px-5 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend > 0 ? (
              <><TrendingUp className="h-3 w-3 text-red-500" /><span className="text-red-500">+{fmt(trend)} vs prev</span></>
            ) : trend < 0 ? (
              <><TrendingDown className="h-3 w-3 text-green-500" /><span className="text-green-500">{fmt(trend)} vs prev</span></>
            ) : (
              <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Same as prev</span></>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-mono font-medium">${p.value?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard({ months }) {
  if (months.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No data yet</p>
        <p className="text-sm">Add at least one month to see charts and stats.</p>
      </div>
    )
  }

  // Build chart data (oldest first)
  const chartData = [...months].reverse().map(m => {
    const calc = calculateSplit(m)
    return {
      label: monthLabel(m.monthKey).replace(" 20", " '"),
      housing: parseFloat(calc.housingTotal.toFixed(2)),
      utilities: parseFloat(calc.utilitiesTotal.toFixed(2)),
      misc: parseFloat(calc.miscTotal.toFixed(2)),
      total: parseFloat(calc.grandTotal.toFixed(2)),
      paras: parseFloat(calc.parasFinal.toFixed(2)),
      mishal: parseFloat(calc.mishalFinal.toFixed(2)),
    }
  })

  const latest = calculateSplit(months[0])
  const prev = months[1] ? calculateSplit(months[1]) : null

  const avgTotal = chartData.reduce((s, d) => s + d.total, 0) / chartData.length
  const avgUtilities = chartData.reduce((s, d) => s + d.utilities, 0) / chartData.length
  const maxMonth = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0])
  const minMonth = chartData.reduce((min, d) => d.total < min.total ? d : min, chartData[0])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="This Month Total"
          value={fmt(latest.grandTotal)}
          icon={DollarSign}
          trend={prev ? latest.grandTotal - prev.grandTotal : undefined}
        />
        <StatCard
          title="Avg Monthly Total"
          value={fmt(avgTotal)}
          subtitle={`Over ${months.length} month${months.length > 1 ? "s" : ""}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Highest Month"
          value={fmt(maxMonth.total)}
          subtitle={maxMonth.label}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Utilities"
          value={fmt(avgUtilities)}
          subtitle="Per month"
          icon={Zap}
        />
      </div>

      {/* Total trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Total Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="paras" name="Paras" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="mishal" name="Mishal" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Stacked breakdown chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bill Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="housing" name="Housing" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                <Bar dataKey="utilities" name="Utilities" stackId="a" fill="#f59e0b" />
                <Bar dataKey="misc" name="Misc" stackId="a" fill="#a855f7" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Single month summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Months Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-3 font-medium">Month</th>
                  <th className="text-right py-2 px-2 font-medium">Housing</th>
                  <th className="text-right py-2 px-2 font-medium">Utilities</th>
                  <th className="text-right py-2 px-2 font-medium">Misc</th>
                  <th className="text-right py-2 px-2 font-medium">Total</th>
                  <th className="text-right py-2 pl-2 font-medium">Paras</th>
                  <th className="text-right py-2 pl-2 font-medium">Mishal</th>
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const c = calculateSplit(m)
                  return (
                    <tr key={m.monthKey} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2 pr-3 font-medium">{monthLabel(m.monthKey)}</td>
                      <td className="text-right py-2 px-2 font-mono text-xs">{fmt(c.housingTotal)}</td>
                      <td className="text-right py-2 px-2 font-mono text-xs">{fmt(c.utilitiesTotal)}</td>
                      <td className="text-right py-2 px-2 font-mono text-xs">{fmt(c.miscTotal)}</td>
                      <td className="text-right py-2 px-2 font-mono text-xs font-semibold">{fmt(c.grandTotal)}</td>
                      <td className="text-right py-2 pl-2 font-mono text-xs text-blue-600">{fmt(c.parasFinal)}</td>
                      <td className="text-right py-2 pl-2 font-mono text-xs text-purple-600">{fmt(c.mishalFinal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
