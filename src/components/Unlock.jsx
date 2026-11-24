import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function Unlock({ onSuccess }) {
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const password = new FormData(event.currentTarget).get('password')
    try {
      const response = await fetch('/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      })
      if (!response.ok) throw new Error((await response.json()).error)
      onSuccess()
    } catch (err) { setError(err.message) }
  }
  return <form onSubmit={submit} className="mx-auto my-16 max-w-sm space-y-4 rounded-xl border bg-card p-6">
    <h1 className="text-xl font-semibold">Unlock BillSplit</h1>
    <label className="block text-sm">Housebook password<Input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button>Unlock</Button>
  </form>
}
