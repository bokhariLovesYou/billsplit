import { lazy, Suspense } from 'react'
import { BookOpen } from 'lucide-react'
import BillSplit from './App.jsx'

const DonationTracker = lazy(() => import('./donations/main.jsx'))

export default function Workspace() {
  const donations = location.pathname.startsWith('/donations')
  return <>
    <header className="border-b bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <span className="flex items-center gap-2 font-semibold tracking-tight"><BookOpen className="size-5 text-primary" />Housebook</span>
      <nav aria-label="Projects" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
        {[[false, '/', 'BillSplit'], [true, '/donations', 'Donations']].map(([active, href, label]) =>
          <a key={href} href={href} aria-current={active === donations ? 'page' : undefined} className={'rounded-md px-3 py-1.5 ' + (active === donations ? 'bg-card font-medium text-primary shadow-sm' : 'text-muted-foreground')}>{label}</a>)}
      </nav>
    </div></header>
    <Suspense fallback={<p className="p-6">Loading…</p>}>{donations ? <DonationTracker /> : <BillSplit />}</Suspense>
  </>
}
