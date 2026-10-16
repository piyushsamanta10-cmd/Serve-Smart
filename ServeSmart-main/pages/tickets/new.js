import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'
import { getCurrentUser, authHeaders, roleHome } from '../../lib/auth'
import { CATEGORIES, PRIORITIES, MIN_DESCRIPTION_LENGTH } from '../../lib/store'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  location: '',
  priority: 'P3',
}

export default function NewTicket() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [duplicateInfo, setDuplicateInfo] = useState(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      router.push('/')
      return
    }
    if (u.role !== 'student') {
      router.push(roleHome(u.role))
      return
    }
    setUser(u)
  }, [])

  useEffect(() => {
    if (!user || !form.category || !form.location.trim()) {
      setDuplicateInfo(null)
      return
    }
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          category: form.category,
          location: form.location.trim(),
        })
        const res = await fetch(`/api/tickets/duplicates?${params}`, {
          headers: authHeaders(user),
        })
        if (!res.ok) return
        const data = await res.json()
        setDuplicateInfo(data.count > 0 ? data : null)
      } catch {
        // silent — this is a nudge, not a required feature, never block on it
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [user, form.category, form.location])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.location.trim()) {
      setError('Location is required.')
      return
    }
    if (!form.category) {
      setError('Category is required.')
      return
    }
    if (!form.priority) {
      setError('Priority is required.')
      return
    }
    if ((form.description || '').trim().length < MIN_DESCRIPTION_LENGTH) {
      setError(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(user),
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not submit the ticket.')
      }
      setSuccess(true)
      setForm(EMPTY_FORM)
      setTimeout(() => router.push('/tickets'), 700)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="new-ticket-page">
      <Navbar user={user} title="New Ticket" />
      <div className="container" style={{ maxWidth: 620 }}>
        <h1>Create a Ticket</h1>
        <p className="subtitle">
          Submit a campus service request — it'll be routed to a technician
          shortly after review.
        </p>

        {success && (
          <div className="banner banner-success">
            Ticket submitted. Taking you to your ticket list…
          </div>
        )}
        {error && <div className="banner banner-error">{error}</div>}
        {duplicateInfo && (
          <div className="banner banner-warning">
            Heads up — {duplicateInfo.count} open ticket{duplicateInfo.count > 1 ? 's' : ''}{' '}
            already report a similar issue ("{duplicateInfo.sample.title}") at this
            location. You can still submit if this is a different problem.
          </div>
        )}

        <form className="panel panel-pad new-ticket-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Projector not turning on"
              maxLength={80}
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="What's happening, and anything a technician should know before arriving."
            />
            <div className="field-hint">
              {(form.description || '').trim().length}/{MIN_DESCRIPTION_LENGTH} characters minimum
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update('priority', e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="field-hint">
                P1 is urgent/safety, P4 is minor.
              </div>
            </div>
          </div>

          <div className="field">
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="e.g. Hall A - Room 101"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || success}
          >
            {submitting ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  )
}
