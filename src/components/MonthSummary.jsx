import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateSplit, fmt } from "@/lib/parser"
import NoorShareModal from "@/components/NoorShareModal"
import { Home, Zap, Package, User, TrendingUp, Lightbulb, Users } from "lucide-react"

function InsightBadge({ current, prev }) {
  if (prev == null) {
    return <span className="text-xs text-muted-foreground font-mono">new</span>
  }
  const delta = current - prev
  if (delta === 0) return null
  const pct = prev !== 0 ? (delta / prev) * 100 : null
  const isUp = delta > 0
  const color = isUp ? "text-red-500" : "text-emerald-600"
  const arrow = isUp ? "↑" : "↓"
  return (
    <span className={`text-xs font-mono whitespace-nowrap ${color}`}>
      {arrow} {fmt(Math.abs(delta))}{pct != null ? ` (${Math.abs(pct).toFixed(0)}%)` : ""}
    </span>
  )
}

function LineItem({ label, amount, muted, onClick, insightBadge }) {
  return (
    <div
      className={[
        "flex justify-between items-center py-1 rounded transition-colors",
        muted ? "text-muted-foreground" : "",
        onClick ? "cursor-pointer hover:bg-muted/50 px-2 -mx-2 group" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <span className="text-sm flex items-center gap-1.5">
        {label}
        {onClick && (
          <TrendingUp className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </span>
      <span className="flex items-center gap-2">
        {insightBadge}
        <span className="text-sm font-mono">
          {amount === 0 ? <Badge variant="secondary">paid</Badge> : fmt(amount)}
        </span>
      </span>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children, total }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {children}
        {total !== undefined && (
          <>
            <Separator className="my-2" />
            <div className="flex justify-between items-center font-medium">
              <span className="text-sm">Total</span>
              <span className="text-sm font-mono font-semibold">{fmt(total)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function MonthSummary({ data, prevData, onSelectBill, onSaveNoorDetails, openNoorFromLink = false }) {
  const [showInsights, setShowInsights] = useState(false)
  const [showNoorShare, setShowNoorShare] = useState(openNoorFromLink)
  const calc = calculateSplit(data)
  const prevCalc = prevData ? calculateSplit(prevData) : null

  function openNoorShare() {
    setShowNoorShare(true)
  }

  function closeNoorShare() {
    setShowNoorShare(false)
    const url = new URL(window.location.href)
    if (url.searchParams.get("view") === "noor" && url.searchParams.get("month") === data.monthKey) {
      url.searchParams.delete("view")
      url.searchParams.delete("month")
      window.history.replaceState({}, "", url.toString())
    }
  }

  function badge(current, prev) {
    if (!showInsights) return null
    return <InsightBadge current={current} prev={prev} />
  }

  function sectionBadge(section, label, current) {
    if (!showInsights || !prevData) return null
    const prevItem = (prevData[section] || []).find(i => i.label === label)
    return <InsightBadge current={current} prev={prevItem?.amount} />
  }

  return (
    <div className="space-y-4">
      {/* Insights toggle */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openNoorShare}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          Show Noor&apos;s Share
        </Button>
        <Button
          variant={showInsights ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInsights(v => !v)}
          disabled={!prevData}
          title={!prevData ? "No previous month to compare" : undefined}
        >
          <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
          Insights{!prevData ? " (no prev month)" : ""}
        </Button>
      </div>

      {/* Housing */}
      {data.housing.length > 0 && (
        <SectionCard icon={Home} title="Housing" total={calc.housingTotal}>
          {data.housing.map((item, i) => (
            <LineItem
              key={i}
              label={item.label}
              amount={item.amount}
              insightBadge={sectionBadge("housing", item.label, item.amount)}
              onClick={onSelectBill ? () => onSelectBill("housing", item.label) : undefined}
            />
          ))}
        </SectionCard>
      )}

      {/* Utilities */}
      {data.utilities.length > 0 && (
        <SectionCard icon={Zap} title="Utilities" total={calc.utilitiesTotal}>
          {data.utilities.map((item, i) => (
            <LineItem
              key={i}
              label={item.label}
              amount={item.amount}
              insightBadge={sectionBadge("utilities", item.label, item.amount)}
              onClick={onSelectBill ? () => onSelectBill("utilities", item.label) : undefined}
            />
          ))}
        </SectionCard>
      )}

      {/* Misc */}
      {data.misc.length > 0 && (
        <SectionCard icon={Package} title="Misc" total={calc.miscTotal}>
          {data.misc.map((item, i) => (
            <LineItem
              key={i}
              label={item.label}
              amount={item.amount}
              insightBadge={sectionBadge("misc", item.label, item.amount)}
              onClick={onSelectBill ? () => onSelectBill("misc", item.label) : undefined}
            />
          ))}
        </SectionCard>
      )}

      {/* EV */}
      {(data.ev?.rate || data.ev?.paras || data.ev?.mishal) && (
        <SectionCard icon={Zap} title="EV (deducted from Comed)">
          {data.ev.rate != null && (
            <div className="flex justify-between text-xs text-muted-foreground py-1">
              <span>Rate</span>
              <span className="font-mono">${data.ev.rate}/kWh</span>
            </div>
          )}
          {data.ev.paras != null && (
            <LineItem
              label={`Paras (${data.ev.paras} kWh)`}
              amount={calc.parasEV}
              insightBadge={badge(calc.parasEV, prevCalc?.parasEV)}
              onClick={onSelectBill ? () => onSelectBill("ev_paras", "Paras EV") : undefined}
            />
          )}
          {data.ev.mishal != null && (
            <LineItem
              label={`Mishal (${data.ev.mishal} kWh)`}
              amount={calc.mishalEV}
              insightBadge={badge(calc.mishalEV, prevCalc?.mishalEV)}
              onClick={onSelectBill ? () => onSelectBill("ev_mishal", "Mishal EV") : undefined}
            />
          )}
          {calc.evTotal > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground pt-2 mt-1 border-t">
              <span>Total EV in Comed</span>
              <span className="font-mono">{fmt(calc.evTotal)}</span>
            </div>
          )}
        </SectionCard>
      )}

      {/* Grand total + split */}
      <Card className="border-2 border-foreground/10 bg-muted/30">
        <CardContent className="px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Grand Total</span>
            <span className="flex items-center gap-2">
              {badge(calc.grandTotal, prevCalc?.grandTotal)}
              <span className="font-mono font-bold text-lg">{fmt(calc.grandTotal)}</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground text-sm mb-3">
            <span>50/50 base split</span>
            <span className="font-mono">{fmt(calc.splitBase)}</span>
          </div>
          <Separator className="mb-3" />

          <div className="grid grid-cols-2 gap-3">
            <PersonShare
              name="Paras"
              base={calc.splitBase}
              evAdj={calc.parasEvAdj}
              credits={data.credits.paras}
              absorbed={calc.parasAbsorbed}
              final={calc.parasFinal}
              prevFinal={prevCalc?.parasFinal}
              showInsights={showInsights}
            />
            <PersonShare
              name="Mishal"
              base={calc.splitBase}
              evAdj={calc.mishalEvAdj}
              credits={data.credits.mishal}
              absorbed={calc.mishalAbsorbed}
              final={calc.mishalFinal}
              prevFinal={prevCalc?.mishalFinal}
              showInsights={showInsights}
            />
          </div>
        </CardContent>
      </Card>

      {showNoorShare && (
        <NoorShareModal
          data={data}
          prevData={prevData}
          onClose={closeNoorShare}
          onSave={onSaveNoorDetails}
        />
      )}
    </div>
  )
}

function PersonShare({ name, base, evAdj, credits, absorbed, final, prevFinal, showInsights }) {
  return (
    <div className="bg-background rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Base</span><span className="font-mono">{fmt(base)}</span>
      </div>
      {evAdj < 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span>- EV credit</span>
          <span className="font-mono">-{fmt(Math.abs(evAdj))}</span>
        </div>
      )}
      {evAdj > 0 && (
        <div className="flex justify-between text-xs text-amber-600">
          <span>+ EV Offset</span><span className="font-mono">+{fmt(evAdj)}</span>
        </div>
      )}
      {credits.map((c, i) => (
        <div key={i} className="flex justify-between text-xs text-emerald-600">
          <span className="truncate pr-1">- {c.label || "Credit"}</span>
          <span className="font-mono">-{fmt(c.amount)}</span>
        </div>
      ))}
      {absorbed > 0 && (
        <div className="flex justify-between text-xs text-amber-600">
          <span>+ Credit offset</span>
          <span className="font-mono">+{fmt(absorbed)}</span>
        </div>
      )}
      <Separator className="my-1.5" />
      <div className="flex justify-between items-center text-sm font-bold">
        <span>Owes</span>
        <span className="flex items-center gap-1.5">
          {showInsights && prevFinal != null && <InsightBadge current={final} prev={prevFinal} />}
          <span className="font-mono">{fmt(final)}</span>
        </span>
      </div>
    </div>
  )
}
