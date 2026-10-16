import { getRequestUser } from '../../../lib/auth'
import { openDuplicates } from '../../../lib/store'

export default function handler(req, res) {
  const user = getRequestUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to continue.' })
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { category, location } = req.query
  const matches = openDuplicates(category, location)
  if (matches.length === 0) return res.status(200).json({ count: 0 })

  // Deliberately minimal: no ticket id, no studentId, no way for the caller to
  // open or identify the matching ticket — just enough to prompt a "you might
  // want to check first" nudge, without breaking the existing per-student
  // privacy scoping used everywhere else in the API.
  return res.status(200).json({
    count: matches.length,
    sample: { title: matches[0].title, status: matches[0].status },
  })
}
