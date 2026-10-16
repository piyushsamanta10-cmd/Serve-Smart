import { users } from './store'

// Basic auth skeleton: stores which seeded user is "logged in" client-side.
// This does not enforce any permissions or restrictions — it only tracks
// who the current user is so pages can identify them.

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('currentUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export function logout() {
  localStorage.removeItem('currentUser')
}

export function allUsers() {
  return users
}

// Returns a headers object that identifies the current user to API routes.
export function authHeaders(user) {
  return { 'x-user-id': user.id }
}

// Server-side: reads x-user-id from request headers, returns the user or null.
export function getRequestUser(req) {
  const id = req.headers['x-user-id']
  if (!id) return null
  return users.find((u) => u.id === id) || null
}

// Returns the home page path for a given role.
export function roleHome(role) {
  if (role === 'student') return '/tickets'
  if (role === 'technician') return '/technician/dashboard'
  if (role === 'admin') return '/admin/assign'
  return '/'
}
