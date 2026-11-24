import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronRight, CircleCheck, Download, HeartHandshake, Layers3, Plus, Search, Target, Trash2, Wallet } from 'lucide-react';
import { Badge, Button, Card, Input, Modal } from './ui.jsx';
import { cn } from '../lib/utils.js';
import './style.css';

const months = Array.from({ length: 12 }, (_, index) => new Date(2020, index, 1).toLocaleDateString('en-US', { month: 'long' }));
const formatMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = (cents) => formatMoney.format(cents / 100);
const decimal = (cents) => (cents / 100).toFixed(2);
const sum = (items, getter) => items.reduce((total, item) => total + getter(item), 0);
const listed = (period) => period.amountListed ?? sum(period.contributions, (item) => item.amount);
const covered = (period) => period.carry + listed(period);
const remaining = (period) => Math.max(period.target - covered(period), 0);
const surplus = (period) => Math.max(covered(period) - period.target, 0);
const periodName = (key) => months[Number(key.slice(5)) - 1] ?? 'Bonus';
const monthPath = (key) => '/donations/months/' + key;
const monthTitle = (key) => periodName(key) + ' ' + key.slice(0, 4);
const ledgerPath = (key) => key ? '/donations?year=' + key.slice(0, 4) : '/donations';
const selectClass = 'select h-10 rounded-md border border-input bg-card px-3 pr-9 text-sm';

function amountValue(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter amounts with up to two decimal places.');
  return Math.round(Number(value) * 100);
}

function exportLedger(data) {
  const records = [['Type', 'Period or date', 'Description', 'Target USD', 'Carry-in USD', 'Amount USD', 'Status', 'Notes']];
  for (const period of [...data.periods].reverse()) {
    records.push(['Period', period.period, '', decimal(period.target), decimal(period.carry), '', remaining(period) ? 'Pending' : 'Paid', period.note]);
    for (const entry of period.contributions) records.push(['Contribution', period.period, entry.description, '', '', decimal(entry.amount), entry.reserved ? 'Set aside' : 'Paid', '']);
  }
  for (const entry of data.extras) records.push(['Extra', entry.date, entry.description, '', '', decimal(entry.amount), entry.reference ? 'Reference' : 'Additional', entry.note]);
  const csv = records.map((row) => row.map((value) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
  const href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href, download: 'donations.csv' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function Metric({ icon: Icon, label, amount, detail, accent }) {
  return <Card className="p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-muted-foreground">{label}</span><span className={cn('grid size-9 place-items-center rounded-lg', accent)}><Icon className="size-4" /></span></div><div className="mt-2 text-[1.8rem] leading-tight font-semibold tracking-tight tabular-nums">{money(amount)}</div>{detail && <p className="mt-2 text-sm text-muted-foreground">{detail}</p>}</Card>;
}

function Field({ label, children, className }) {
  return <label className={cn('grid gap-1.5 text-sm font-medium', className)}>{label}{children}</label>;
}
function MoneyInput(props) {
  return <Input type="text" inputMode="decimal" placeholder="0.00" required {...props} />;
}
function Notes({ value, change }) {
  return <Field label="Notes"><textarea maxLength={4000} rows={3} value={value} onChange={(event) => change(event.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm" /></Field>;
}

function PeriodForm({ period, defaults, periods, back, save }) {
  const [key, setKey] = useState(period?.period ?? defaults.key);
  const [target, setTarget] = useState(decimal(period?.target ?? defaults.target));
  const [carry, setCarry] = useState(decimal(period?.carry ?? defaults.carry));
  const [note, setNote] = useState(period?.note ?? '');
  const [carryEdited, setCarryEdited] = useState(false);
  const [entries, setEntries] = useState(() => (period?.contributions ?? []).map((entry) => ({ id: entry.id, description: entry.description, amount: decimal(entry.amount), reserved: Boolean(entry.reserved) })));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const updateEntry = (id, field, value) => setEntries((old) => old.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry));
  function changePeriod(value) {
    setKey(value);
    if (carryEdited) return;
    const [year, month] = value.split('-');
    if (!/^\d{4}$/.test(year) || month === 'Bonus') {
      setCarry('0.00');
      return;
    }
    const prior = Number(month) === 1
      ? (Number(year) - 1) + '-12'
      : year + '-' + String(Number(month) - 1).padStart(2, '0');
    const previous = periods.find((item) => item.period === prior);
    setCarry(decimal(previous ? surplus(previous) : 0));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await save('/api/periods', { period: key, target: amountValue(target), carry: amountValue(carry), note, contributions: entries.map((entry) => ({ description: entry.description, amount: amountValue(entry.amount), reserved: Boolean(entry.reserved) })), create: !period });
      if (!period) window.location.replace(monthPath(key));
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <Card className="mt-6 max-w-3xl p-4 sm:p-6">
    <form onSubmit={submit} className="grid gap-5">
      {!period && <div className="grid grid-cols-2 gap-3">
        <Field label="Year"><Input type="number" min="1900" max="9999" required value={key.split('-')[0]} onChange={(event) => changePeriod(event.target.value + '-' + key.split('-')[1])} /></Field>
        <Field label="Period"><select className={selectClass} value={key.split('-')[1]} onChange={(event) => changePeriod(key.split('-')[0] + '-' + event.target.value)}>{months.map((month, index) => <option value={String(index + 1).padStart(2, '0')} key={month}>{month}</option>)}<option>Bonus</option></select></Field>
      </div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target (USD)"><MoneyInput value={target} onChange={(event) => setTarget(event.target.value)} /></Field>
        <Field label="Carry-in (USD)"><MoneyInput value={carry} onChange={(event) => { setCarryEdited(true); setCarry(event.target.value); }} /></Field>
      </div>
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">Contributions</h3>
        {entries.length === 0 && <p className="text-sm text-muted-foreground">No contributions recorded for this period.</p>}
        {entries.map((entry, index) => <div className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,6rem)_auto] items-end gap-2" key={entry.id}>
          <Field label={index === 0 ? 'Description' : <span className="sr-only">Description</span>}><Input required maxLength={500} value={entry.description} onChange={(event) => updateEntry(entry.id, 'description', event.target.value)} /></Field>
          <Field label={index === 0 ? 'Amount' : <span className="sr-only">Amount</span>}><MoneyInput value={entry.amount} onChange={(event) => updateEntry(entry.id, 'amount', event.target.value)} /></Field>
          <Button type="button" variant="icon" aria-label={'Remove contribution ' + (index + 1)} onClick={() => setEntries((old) => old.filter((item) => item.id !== entry.id))}><Trash2 /></Button>
          <label className="col-span-full mb-2 flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={Boolean(entry.reserved)} onChange={(event) => updateEntry(entry.id, 'reserved', event.target.checked)} className="size-4 accent-primary" /> Set aside for later</label>
        </div>)}
        <Button type="button" variant="outline" className="mt-1 w-fit" onClick={() => setEntries((old) => [...old, { id: crypto.randomUUID(), description: '', amount: '' }])}><Plus /> Add contribution</Button>
      </section>
      <Notes value={note} change={setNote} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><Button asChild variant="outline"><a href={back}>Back to ledger</a></Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save period'}</Button></div>
    </form>
  </Card>;
}

function ExtraModal({ entry, close, save }) {
  const [date, setDate] = useState(entry?.date ?? '');
  const [amount, setAmount] = useState(entry ? decimal(entry.amount) : '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [reference, setReference] = useState(Boolean(entry?.reference));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await save('/api/extras', { id: entry?.id, date, amount: amountValue(amount), description, note, reference });
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <Modal title={entry ? 'Edit extra donation' : 'Add extra donation'} description="Record a donation outside the monthly targets." close={() => { if (!busy) close(); }}>
    <form onSubmit={submit} className="mt-5 grid gap-4">
      <Field label="Description"><Input required maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date (optional)"><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Amount (USD)"><MoneyInput value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
      </div>
      <Notes value={note} change={setNote} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reference} onChange={(event) => setReference(event.target.checked)} className="size-4 accent-primary" />Reference only · exclude from extra totals</label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save donation'}</Button></div>
    </form>
  </Modal>;
}

function Empty({ children }) {
  return <div className="p-10 text-center text-sm text-muted-foreground">{children}</div>;
}
function EditPassword({ close, unlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await unlock(password);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Unlock editing" description="Enter your editing password. Editing stays unlocked in this browser for up to 30 days." close={() => { if (!busy) close(); }}>
    <form className="mt-5 grid gap-4" onSubmit={submit}>
      <Field label="Editing password"><Input autoComplete="current-password" type="password" maxLength={512} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button className="justify-self-end" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock editing'}</Button>
    </form>
  </Modal>;
}

function PeriodPage({ period, creating, canEdit, seeDetails, defaults, periods, save, notice, editAction }) {
  const back = ledgerPath(period?.period ?? (creating ? defaults.key : null));
  const title = period ? monthTitle(period.period) : creating ? 'Add a period' : 'Period unavailable';
  return <>
    <a className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline" href={back}><ArrowLeft size={16} /> Monthly ledger</a>
    <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {(period || creating) && editAction}
    </header>
    {notice && <p role="status" className="mt-4 text-sm font-medium text-primary">{notice}</p>}
    {period && <div className="mt-5 grid max-w-4xl grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={Target} label="Target" amount={period.target} accent="bg-emerald-100/70 text-primary" />
      <Metric icon={HeartHandshake} label="Contributions" amount={listed(period)} accent="bg-emerald-100/70 text-primary" />
      <Metric icon={CircleCheck} label="Carry-in" amount={period.carry} accent="bg-emerald-100/70 text-primary" />
      <Metric icon={Wallet} label="Remaining" amount={remaining(period)} accent="bg-amber-100/80 text-amber-900" />
    </div>}
    {canEdit && (period || creating) && <PeriodForm period={period} defaults={defaults} periods={periods} back={back} save={save} />}
    {!canEdit && period && seeDetails && <Card className="mt-6 max-w-3xl p-5">
      <h2 className="text-lg font-semibold">Contributions</h2>
      {period.contributions.length ? <ul className="mt-2 divide-y divide-border">{period.contributions.map((entry) => <li key={entry.id} className="flex justify-between gap-3 py-3 text-sm"><span>{entry.description}{Boolean(entry.reserved) && <span className="ml-2 text-muted-foreground">Set aside</span>}</span><span className="shrink-0 tabular-nums">{money(entry.amount)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No contributions recorded for this period.</p>}
      {period.note && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{period.note}</p>}
    </Card>}
    {!period && !creating && <p className="mt-4 text-sm text-muted-foreground">There is no ledger entry for this period.</p>}
    {!canEdit && creating && <p className="mt-4 text-sm text-muted-foreground">Unlock editing to add a period.</p>}
  </>;
}
function Ledger({ periods }) {
  if (!periods.length) return <Empty>No periods match these filters.</Empty>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm">
    <thead className="border-y border-border bg-muted/70 text-muted-foreground"><tr><th className="px-5 py-3">Period</th><th className="px-3 py-3 text-right">Target</th><th className="px-3 py-3 text-right">Contributions</th><th className="px-3 py-3 text-right">Carry-in</th><th className="px-3 py-3 text-right">Remaining</th><th className="px-4 py-3">Status</th><th className="w-12"><span className="sr-only">Open</span></th></tr></thead>
    <tbody>{periods.map((period) => <tr key={period.period} className="border-b border-border last:border-b-0 hover:bg-muted/50">
      <td className="px-5 py-3.5"><a className="inline-flex min-h-8 flex-wrap items-center gap-x-1 font-semibold hover:text-primary hover:underline" href={monthPath(period.period)}>{periodName(period.period)} <span className="font-normal text-muted-foreground">{period.period.slice(0, 4)}</span></a></td>
      <td className="px-3 py-3 text-right tabular-nums">{money(period.target)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{money(listed(period))}</td>
      <td className="px-3 py-3 text-right tabular-nums">{money(period.carry)}</td>
      <td className={cn('px-3 py-3 text-right tabular-nums', remaining(period) ? 'font-semibold text-amber-900' : 'text-muted-foreground')}>{money(remaining(period))}</td>
      <td className="px-4 py-3"><Badge pending={remaining(period) > 0}>{remaining(period) ? 'Pending' : 'Paid'}</Badge></td>
      <td className="pr-3"><Button asChild variant="icon"><a href={monthPath(period.period)} aria-label={'Open ' + monthTitle(period.period)}><ChevronRight /></a></Button></td>
    </tr>)}</tbody>
  </table></div>;
}
function ExtraLedger({ entries, open }) {
  if (!entries.length) return <Empty>No extra donations match your search.</Empty>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
    <thead className="border-y border-border bg-muted/70 text-muted-foreground"><tr><th className="px-5 py-3">Donation</th><th className="px-3 py-3">Date</th><th className="px-3 py-3 text-right">Amount</th><th className="px-4 py-3">Type</th>{open && <th className="w-12"><span className="sr-only">Open</span></th>}</tr></thead>
    <tbody>{entries.map((entry) => <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/50">
      <td className="px-5 py-4">{open ? <button className="text-left font-semibold hover:text-primary hover:underline" onClick={() => open(entry)}>{entry.description}</button> : <span className="font-semibold">{entry.description}</span>}<p className="mt-1 text-sm text-muted-foreground">{entry.note}</p></td><td className="px-3 py-4 whitespace-nowrap">{entry.date || 'Undated'}</td><td className="px-3 py-4 text-right tabular-nums">{money(entry.amount)}</td><td className="px-4 py-4">{entry.reference ? 'Reference' : 'Additional'}</td>{open && <td className="pr-3"><Button variant="icon" aria-label={'Open ' + entry.description} onClick={() => open(entry)}><ChevronRight /></Button></td>}
    </tr>)}</tbody>
  </table></div>;
}

async function loadLedger() {
  const response = await fetch('/api/ledger');
  if (!response.ok) throw new Error('Could not load the donation ledger.');
  return response.json();
}

export default function DonationTracker() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'extras' ? 'extras' : 'monthly');
  const [year, setYear] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('year');
    return requested === 'all' || /^\d{4}$/.test(requested ?? '') ? requested : '';
  });
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const [sessionError, setSessionError] = useState('');
  useEffect(() => { loadLedger().then(setData).catch((error) => setLoadError(error.message)); }, []);

  async function changeSession(method, password) {
    const response = await fetch('/api/session', method === 'POST' ? {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    } : { method });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not update the editing session.');
    if (method === 'DELETE') {
      setData((current) => ({ ...current, visibility: 'summary', extras: [], periods: current.periods.map((item) => ({ ...item, note: '', contributions: [] })) }));
      setView('monthly');
    }
    setData(await loadLedger());
    setDialog(null);
  }

  async function save(path, payload) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save the record.');
    setData(result);
    setDialog(null);
    setNotice(path.endsWith('extras') ? 'Donation saved.' : 'Period saved.');
  }

  function switchView(next) {
    setView(next);
    setSearch('');
  }

  if (!data) return <main className="mx-auto max-w-3xl p-8">{loadError || 'Loading donation tracker…'}</main>;

  const years = [...new Set(data.periods.map((period) => period.period.slice(0, 4)))];
  const activeYear = year === 'all' || years.includes(year) ? year : years[0] ?? 'all';
  const yearRows = data.periods.filter((period) => activeYear === 'all' || period.period.startsWith(activeYear + '-'));
  const term = search.trim().toLowerCase();
  const rows = yearRows.filter((period) => {
    if (status === 'paid' && remaining(period) > 0 || status === 'pending' && remaining(period) === 0) return false;
    return [periodName(period.period), period.period, periodName(period.period) + ' ' + period.period.slice(0, 4), period.note, ...period.contributions.map((entry) => entry.description)].some((value) => value.toLowerCase().includes(term));
  });
  const extraRows = data.extras.filter((entry) => [entry.date, entry.description, entry.note].some((value) => value.toLowerCase().includes(term)));
  const last = data.periods.find((period) => !period.period.endsWith('Bonus'));
  const next = last ? new Date(Number(last.period.slice(0, 4)), Number(last.period.slice(5)), 1) : new Date();
  const defaults = { key: next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'), target: 15000, carry: last ? surplus(last) : 0 };
  const pending = yearRows.filter((period) => remaining(period) > 0).length;
  const canEdit = data.visibility === 'owner';
  const seeDetails = data.visibility !== 'summary';
  const isMonthly = view === 'monthly' || !seeDetails;
  const monthKey = /^\/donations\/months\/([^/]+)$/.exec(window.location.pathname)?.[1];
  const editAction = canEdit
    ? <Button variant="outline" onClick={() => { setSessionError(''); changeSession('DELETE').catch((error) => setSessionError(error.message)); }}>Lock editing</Button>
    : <Button variant="outline" onClick={() => { setSessionError(''); setDialog({ type: 'password' }); }}>Edit</Button>;
  const pagePeriod = monthKey && data.periods.find((period) => period.period === monthKey);
  return <div className="min-h-screen md:grid md:grid-cols-[226px_minmax(0,1fr)]">
    <aside className="border-b border-border bg-card px-4 py-4 md:min-h-screen md:border-r md:border-b-0 md:px-4 md:py-6">
      <div className="flex items-center gap-3 px-2"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white"><HeartHandshake className="size-5" /></div><span className="text-base font-semibold tracking-tight">Donation Tracker</span></div>
      <nav aria-label="Tracker" className="mt-4 flex gap-2 md:mt-9 md:grid">
        {[[CalendarDays, 'monthly', 'Monthly ledger'], [Layers3, 'extras', 'Extra donations']].filter(([, key]) => key === 'monthly' || seeDetails).map(([Icon, key, label]) => <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => { if (monthKey) window.location.assign('/donations' + (key === 'extras' ? '?view=extras' : '')); else switchView(key); }} className={cn('flex min-h-10 items-center gap-2.5 rounded-md px-3 text-left text-sm font-medium', view === key ? 'bg-emerald-100/70 text-emerald-950' : 'text-muted-foreground hover:bg-muted')}><Icon className="size-4 shrink-0" />{label}</button>)}
      </nav>
    </aside>
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      {sessionError && <p className="mb-3 text-sm text-red-700" role="alert">{sessionError}</p>}
      {monthKey ? <PeriodPage period={pagePeriod} creating={monthKey === 'new'} canEdit={canEdit} seeDetails={seeDetails} defaults={defaults} periods={data.periods} save={save} notice={notice} editAction={editAction} /> : <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{isMonthly ? 'Monthly ledger' : 'Extra donations'}</h1><p className="mt-2 text-sm text-muted-foreground">{isMonthly ? 'Track your giving targets and carryover by month.' : 'Giving recorded outside your monthly targets.'}</p></div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? <>
            <Button variant="outline" onClick={() => exportLedger(data)}><Download /> Export CSV</Button>
            {isMonthly ? <Button asChild><a href={monthPath('new')}><Plus /> Add period</a></Button> : <Button onClick={() => { setNotice(''); setDialog({ type: 'extras' }); }}><Plus /> Add donation</Button>}
          </> : null}
          {editAction}
        </div>
      </header>
      {notice && <p role="status" className="mt-4 text-sm font-medium text-primary">{notice}</p>}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {isMonthly ? <>
          <Metric icon={HeartHandshake} label="All-time donations" amount={data.allTimeDonated} detail="Includes extra donations" accent="bg-emerald-100/70 text-primary" />
          <Metric icon={Target} label="Target" amount={sum(yearRows, (period) => period.target)} detail={yearRows.length + (yearRows.length === 1 ? ' recorded period' : ' recorded periods')} accent="bg-emerald-100/70 text-primary" />
          <Metric icon={CircleCheck} label="Applied to targets" amount={sum(yearRows, (period) => Math.min(period.target, covered(period)))} detail="Contributions and carry-in applied" accent="bg-emerald-100/70 text-primary" />
          <Metric icon={Wallet} label="Remaining" amount={sum(yearRows, remaining)} detail={pending + (pending === 1 ? ' pending period' : ' pending periods')} accent="bg-amber-100/80 text-amber-900" />
        </> : <Metric icon={HeartHandshake} label="Additional giving" amount={sum(data.extras.filter((entry) => !entry.reference), (entry) => entry.amount)} detail="Outside monthly targets" accent="bg-emerald-100/70 text-primary" />}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="relative w-full sm:w-60"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input className="pl-9" type="search" aria-label="Search donations" placeholder="Search donations…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {isMonthly && <div className="flex flex-wrap gap-2">
            <select className={selectClass} aria-label="Year" value={activeYear} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item}>{item}</option>)}<option value="all">All years</option></select>
            <select className={selectClass} aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
          </div>}
        </div>
        {isMonthly ? <Ledger periods={rows} /> : <ExtraLedger entries={extraRows} open={canEdit ? (entry) => { setNotice(''); setDialog({ type: 'extras', entry }); } : undefined} />}
        <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">{isMonthly ? rows.length + (rows.length === 1 ? ' period' : ' periods') : extraRows.length + (extraRows.length === 1 ? ' entry' : ' entries')}</p>
      </Card>
      </>}
    </main>
    {dialog?.type === 'password' && <EditPassword close={() => setDialog(null)} unlock={(password) => changeSession('POST', password)} />}
    {dialog?.type === 'extras' && <ExtraModal entry={dialog.entry} close={() => setDialog(null)} save={save} />}
  </div>;
}
