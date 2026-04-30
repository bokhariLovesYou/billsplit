import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { calculateSplit, fmt } from "@/lib/parser"
import { Home, Zap, Package, CreditCard, User } from "lucide-react"

function LineItem({ label, amount, muted }) {
  return (
    <div className={`flex justify-between items-center py-1 ${muted ? "text-muted-foreground" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono">{amount === 0 ? <Badge variant="secondary">paid</Badge> : fmt(amount)}</span>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children, total, color }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} />
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

export default function MonthSummary({ data }) {
  const calc = calculateSplit(data)

  return (
    <div className="space-y-4">
      {/* Housing */}
      {data.housing.length > 0 && (
        <SectionCard icon={Home} title="Housing" total={calc.housingTotal} color="text-blue-600">
          {data.housing.map((item, i) => (
            <LineItem key={i} label={item.label} amount={item.amount} />
          ))}
        </SectionCard>
      )}

      {/* Utilities */}
      {data.utilities.length > 0 && (
        <SectionCard icon={Zap} title="Utilities" total={calc.utilitiesTotal} color="text-yellow-600">
          {data.utilities.map((item, i) => (
            <LineItem key={i} label={item.label} amount={item.amount} />
          ))}
        </SectionCard>
      )}

      {/* Misc */}
      {data.misc.length > 0 && (
        <SectionCard icon={Package} title="Misc" total={calc.miscTotal} color="text-purple-600">
          {data.misc.map((item, i) => (
            <LineItem key={i} label={item.label} amount={item.amount} />
          ))}
        </SectionCard>
      )}

      {/* EV */}
      {(data.ev.rate || data.ev.paras || data.ev.mishal) && (
        <SectionCard icon={Zap} title="EV Calculation" color="text-green-600">
          {data.ev.rate && (
            <LineItem label="Rate ($/kWh)" amount={data.ev.rate} />
          )}
          {data.ev.paras !== null && (
            <LineItem label={`Paras usage (${data.ev.paras} kWh)`} amount={calc.parasEV} />
          )}
          {data.ev.mishal !== null && (
            <LineItem label={`Mishal usage (${data.ev.mishal} kWh)`} amount={calc.mishalEV} />
          )}
        </SectionCard>
      )}

      {/* Grand total + split */}
      <Card className="border-2 border-foreground/10 bg-muted/30">
        <CardContent className="px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Grand Total</span>
            <span className="font-mono font-bold text-lg">{fmt(calc.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground text-sm mb-3">
            <span>50/50 base split</span>
            <span className="font-mono">{fmt(calc.splitBase)}</span>
          </div>
          <Separator className="mb-3" />

          {/* Per-person */}
          <div className="grid grid-cols-2 gap-3">
            <PersonShare
              name="Paras"
              base={calc.splitBase}
              ev={calc.parasEV}
              credits={data.credits.paras}
              final={calc.parasFinal}
            />
            <PersonShare
              name="Mishal"
              base={calc.splitBase}
              ev={calc.mishalEV}
              credits={data.credits.mishal}
              final={calc.mishalFinal}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PersonShare({ name, base, ev, credits, final }) {
  const totalCredits = credits.reduce((s, c) => s + c.amount, 0)
  return (
    <div className="bg-background rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Base</span><span className="font-mono">{fmt(base)}</span>
      </div>
      {ev > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>+ EV</span><span className="font-mono">+{fmt(ev)}</span>
        </div>
      )}
      {credits.map((c, i) => (
        <div key={i} className="flex justify-between text-xs text-green-600">
          <span className="truncate pr-1">- {c.label || "Credit"}</span>
          <span className="font-mono">-{fmt(c.amount)}</span>
        </div>
      ))}
      <Separator className="my-1.5" />
      <div className="flex justify-between text-sm font-bold">
        <span>Owes</span><span className="font-mono">{fmt(final)}</span>
      </div>
    </div>
  )
}
