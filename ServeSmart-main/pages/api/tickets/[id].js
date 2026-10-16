import { tickets, findUser, STATUSES } from '../../../lib/store'
import { getRequestUser } from '../../../lib/auth'

// A ticket moves forward one step at a time.
const NEXT_STATUS = {
  Open: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Resolved',
  Resolved: 'Closed',
}

function canView(user, ticket) {
  if (user.role === 'admin') return true
  if (user.role === 'student' && ticket.studentId === user.id) return true
  if (user.role === 'technician' && ticket.technicianId === user.id) return true
  return false
}

export default function handler(req, res) {
  const user = getRequestUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated.' })

  const { id } = req.query
  const ticket = tickets.find((t) => t.id === id)
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' })

  if (!canView(user, ticket)) {
    return res.status(403).json({ error: 'You do not have access to this ticket.' })
  }

  if (req.method === 'GET') return res.status(200).json({ ticket })
  if (req.method === 'PATCH') return handlePatch(req, res, ticket, user)

  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

function handlePatch(req, res, ticket, user) {
  const { technicianId, status, comment } = req.body || {}
  const now = new Date().toISOString()

  // Changing technicianId requires admin role.
  if (technicianId !== undefined && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can assign technicians.' })
  }

  // Changing status requires technician role AND being the assigned tech.
  if (status !== undefined && status !== ticket.status) {
    if (user.role !== 'technician') {
      return res.status(403).json({ error: 'Only technicians can change status.' })
    }
    if (ticket.technicianId !== user.id) {
      return res.status(403).json({ error: 'You are not assigned to this ticket.' })
    }
  }

  // Validate everything first so a bad request never half-applies.
  const tech = technicianId ? findUser(technicianId) : null
  if (technicianId && (!tech || tech.role !== 'technician')) {
    return res.status(400).json({ error: 'Choose a valid technician.' })
  }
  const assigning = Boolean(tech) && tech.id !== ticket.technicianId
  // Assigning an Open ticket moves it to Assigned automatically.
  const current =
    assigning && ticket.status === 'Open' ? 'Assigned' : ticket.status

  if (status && status !== current) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown status.' })
    }
    if (!tech && !ticket.technicianId) {
      return res
        .status(400)
        .json({ error: 'Assign a technician before changing status.' })
    }
    if (NEXT_STATUS[current] !== status) {
      return res
        .status(400)
        .json({ error: `A ticket cannot move from ${current} to ${status}.` })
    }
  }

  let changed = false

  if (assigning) {
    const wasAssigned = Boolean(ticket.technicianId)
    ticket.technicianId = tech.id
    if (ticket.status === 'Open') ticket.status = 'Assigned'
    ticket.activity.push({
      id: `a${ticket.activity.length + 1}`,
      type: 'assigned',
      message: `${wasAssigned ? 'Reassigned' : 'Assigned'} to ${tech.name}`,
      at: now,
    })
    changed = true
  }

  if (status && status !== ticket.status) {
    ticket.status = status
    ticket.activity.push({
      id: `a${ticket.activity.length + 1}`,
      type: 'status',
      message: `Status changed to ${status}`,
      at: now,
    })
    changed = true
  }

  if (comment !== undefined) {
    const trimmed = (comment || '').trim()
    if (!trimmed) {
      return res.status(400).json({ error: 'Comment cannot be empty.' })
    }
    if (trimmed.length > 500) {
      return res.status(400).json({ error: 'Comment is too long (500 characters max).' })
    }
    ticket.activity.push({
      id: `a${ticket.activity.length + 1}`,
      type: 'comment',
      message: `${user.name}: ${trimmed}`,
      at: now,
    })
    changed = true
  }

  if (changed) ticket.updatedAt = now
  return res.status(200).json({ ticket })
}
