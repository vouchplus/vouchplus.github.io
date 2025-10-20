// Utility functions
import { getCurrentUser } from './config.js'

// Show/hide loading spinner
export function showLoading(show) {
  const spinner = document.getElementById('loading-spinner')
  if (spinner) {
    if (show) {
      spinner.classList.remove('hidden')
    } else {
      spinner.classList.add('hidden')
    }
  }
}

// Show toast notification
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return
  
  const toast = document.createElement('div')
  toast.className = `p-4 rounded-lg shadow-lg max-w-sm ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-yellow-600' :
    'bg-blue-600'
  } text-white`
  
  toast.textContent = message
  
  container.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 5000)
}

// Format time ago
export function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}

// Format date
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString()
}

// Format reputation with color
export function formatReputation(reputation) {
  if (reputation >= 100) return { text: reputation, color: 'text-green-400' }
  if (reputation >= 0) return { text: reputation, color: 'text-yellow-400' }
  return { text: reputation, color: 'text-red-400' }
}

// Get rank icon
export function getRankIcon(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

// Validate username
export function validateUsername(username) {
  if (!username || username.trim().length === 0) {
    return { valid: false, message: 'Username is required' }
  }
  
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' }
  }
  
  if (username.length > 20) {
    return { valid: false, message: 'Username must be less than 20 characters' }
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' }
  }
  
  return { valid: true }
}

// Check if user is authenticated
export function requireAuth() {
  const user = getCurrentUser()
  if (!user) {
    showToast('Please login to access this feature', 'error')
    return false
  }
  return true
}

// Navigate to user profile
export function navigateToUserProfile(username) {
  window.location.href = `user-profile.html?username=${encodeURIComponent(username)}`
}

// Expose to global scope so inline onclick handlers work in rendered HTML
window.navigateToUserProfile = navigateToUserProfile

// Get URL parameters
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const result = {}
  for (const [key, value] of params) {
    result[key] = value
  }
  return result
}

// Debounce function
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Format a duration in milliseconds into a human readable string
export function formatDuration(ms) {
  if (ms <= 0) return 'now'
  const seconds = Math.floor(ms / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (parts.length === 0) return `${seconds}s`
  return parts.join(' ')
}

// Simple modal popup. message: primary message string; details: optional HTML/text; actions: array of {label, onClick}
export function showModal(message, details = '', actions = []) {
  // Remove existing modal if present
  const existing = document.getElementById('app-modal-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'app-modal-overlay'
  overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50'

  const modal = document.createElement('div')
  modal.className = 'bg-gray-800 text-white rounded-lg p-6 max-w-lg w-full shadow-lg'

  const title = document.createElement('div')
  title.className = 'text-lg font-semibold mb-2'
  title.textContent = message

  const detailEl = document.createElement('div')
  detailEl.className = 'text-sm text-gray-300 mb-4'
  detailEl.innerHTML = details || ''

  const actionsEl = document.createElement('div')
  actionsEl.className = 'flex justify-end space-x-3'

  // Default close action
  const closeFn = () => overlay.remove()

  if (actions.length === 0) {
    const closeBtn = document.createElement('button')
    closeBtn.className = 'px-4 py-2 bg-blue-600 rounded'
    closeBtn.textContent = 'Close'
    closeBtn.addEventListener('click', closeFn)
    actionsEl.appendChild(closeBtn)
  } else {
    actions.forEach(a => {
      const btn = document.createElement('button')
      btn.className = 'px-4 py-2 rounded ' + (a.className || 'bg-blue-600')
      btn.textContent = a.label
      btn.addEventListener('click', (ev) => {
        ev.preventDefault()
        try { a.onClick && a.onClick() } catch (e) { console.error(e) }
        // do not auto-close if action returned false
        if (!a.noClose) overlay.remove()
      })
      actionsEl.appendChild(btn)
    })
  }

  modal.appendChild(title)
  modal.appendChild(detailEl)
  modal.appendChild(actionsEl)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  return overlay
}

// Render vouch list
export function renderVouchesList(vouches, type) {
  if (vouches.length === 0) {
    return '<p class="text-gray-400">No vouches yet</p>'
  }
  
  return vouches.map(vouch => {
    const isPositive = vouch.vouch_type === 'positive'
    const icon = isPositive ? 'fa-thumbs-up text-green-400' : 'fa-thumbs-down text-red-400'
    const impact = isPositive ? '+' : '-'
    
    const otherUser = type === 'received' ? vouch.voucher : vouch.target
    
    return `
      <div class="border-b border-gray-600 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <i class="fas ${icon}"></i>
            <div>
              <div class="font-medium">
                ${otherUser.username}
                <span class="text-gray-400">vouched for you in</span>
                <span class="font-medium">${vouch.game.name}</span>
                <span class="text-gray-400">(${impact}${vouch.impact_score})</span>
              </div>
              ${vouch.comment ? `<div class="text-gray-300 mt-1">"${vouch.comment}"</div>` : ''}
            </div>
          </div>
          <div class="text-sm text-gray-400">
            ${formatTimeAgo(vouch.created_at)}
          </div>
        </div>
      </div>
    `
  }).join('')
}
