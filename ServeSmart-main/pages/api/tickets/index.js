import {
  tickets,
  generateId,
  findUser,
  CATEGORIES,
  PRIORITIES,
  MIN_DESCRIPTION_LENGTH,
} from '../../../lib/store'
import { getRequestUser } from '../../../lib/auth'

export default function handler(req, res) {
  const user = getRequestUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated.' })

  if (req.method === 'GET') return handleGet(req, res, user)
  if (req.method === 'POST') return handlePost(req, res, user)
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}

function handleGet(req, res, user) {
  const { unassigned } = req.query
  let result = tickets

  if (user.role === 'student') {
    result = result.filter((t) => t.studentId === user.id)
  } else if (user.role === 'technician') {
    result = result.filter((t) => t.technicianId === user.id)
  } else if (user.role === 'admin') {
    if (unassigned === 'true') result = result.filter((t) => !t.technicianId)
  }

  return res.status(200).json({ tickets: result })
}

function handlePost(req, res, user) {
  if (user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can create tickets.' })
  }

  const { title, description, category, location, priority } = req.body || {}

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' })
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'Location is required.' })
  }
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' })
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Unknown category.' })
  }
  if (!priority) {
    return res.status(400).json({ error: 'Priority is required.' })
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Unknown priority.' })
  }
  const desc = (description || '').trim()
  if (desc.length < MIN_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`,
    })
  }

  const now = new Date().toISOString()
  const student = findUser(user.id)

  const ticket = {
    id: generateId(),
    title: title.trim(),
    description: desc,
    category,
    location: location.trim(),
    priority,
    status: 'Open',
    studentId: user.id,
    technicianId: null,
    createdAt: now,
    updatedAt: now,
    activity: [
      {
        id: 'a1',
        type: 'created',
        message: `Submitted by ${student ? student.name : 'student'}`,
        at: now,
      },
    ],
  }

  tickets.push(ticket)
  return res.status(201).json({ ticket })
}
