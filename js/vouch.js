// Vouch creation functionality
import { supabase, getCurrentUser, getGames, getVouchImpact } from './config.js'
import { showLoading, showToast, requireAuth, getUrlParams, debounce } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

let games = []

// Initialize vouch page
export async function initializeVouch() {
  await initializeAuth()
  setupAuthEventListeners()
  
  if (!requireAuth()) {
    window.location.href = 'index.html'
    return
  }
  
  await loadGames()
  setupVouchEventListeners()
  handleUrlParams()
}

// Load games
async function loadGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('name')
  
  if (error) {
    showToast('Failed to load games: ' + error.message, 'error')
    return
  }
  
  games = data
  
  // Populate game select
  const gameSelect = document.getElementById('game-select')
  if (gameSelect) {
    gameSelect.innerHTML = '<option value="">Select a game</option>'
    games.forEach(game => {
      const option = document.createElement('option')
      option.value = game.id
      option.textContent = game.name
      gameSelect.appendChild(option)
    })
  }
}

// Setup vouch event listeners
function setupVouchEventListeners() {
  const vouchForm = document.getElementById('vouch-form')
  const targetUsername = document.getElementById('target-username')
  const usernameSuggestions = document.getElementById('username-suggestions')
  const impactPreview = document.getElementById('impact-preview')
  const impactAmount = document.getElementById('impact-amount')

  // Form submission
  if (vouchForm) {
    vouchForm.addEventListener('submit', handleVouchSubmit)
  }

  // Username search with suggestions
  if (targetUsername) {
    const debouncedSearch = debounce(async () => {
      const query = targetUsername.value.trim()
      if (query.length >= 2) {
        await searchUsers(query)
      } else {
        hideSuggestions()
      }
    }, 300)

    targetUsername.addEventListener('input', debouncedSearch)
    targetUsername.addEventListener('focus', () => {
      if (targetUsername.value.trim().length >= 2) {
        searchUsers(targetUsername.value.trim())
      }
    })

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!targetUsername.contains(e.target) && !usernameSuggestions.contains(e.target)) {
        hideSuggestions()
      }
    })
  }

  // Update impact preview when vouch type changes
  const vouchTypeInputs = document.querySelectorAll('input[name="vouch-type"]')
  vouchTypeInputs.forEach(input => {
    input.addEventListener('change', updateImpactPreview)
  })

  // Update impact preview when user reputation changes
  const currentUser = getCurrentUser()
  if (currentUser) {
    updateImpactPreview()
  }
}

// Handle URL parameters (for pre-filling target user)
function handleUrlParams() {
  const params = getUrlParams()
  const target = params.target
  
  if (target) {
    const targetUsernameInput = document.getElementById('target-username')
    if (targetUsernameInput) {
      targetUsernameInput.value = target
    }
  }
}

// Search users for suggestions
async function searchUsers(query) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username, display_name')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(5)

    if (error) {
      console.error('Search error:', error)
      return
    }

    showSuggestions(data)
  } catch (error) {
    console.error('Search error:', error)
  }
}

// Show username suggestions
function showSuggestions(users) {
  const suggestionsEl = document.getElementById('username-suggestions')
  if (!suggestionsEl) return

  if (users.length === 0) {
    suggestionsEl.innerHTML = '<div class="p-2 text-gray-400">No users found</div>'
  } else {
    const suggestionsHTML = users.map(user => `
      <div class="p-2 hover:bg-gray-600 cursor-pointer" onclick="selectSuggestion('${user.username}')">
        <div class="font-medium">${user.username}</div>
        <div class="text-sm text-gray-400">${user.display_name || user.username}</div>
      </div>
    `).join('')
    
    suggestionsEl.innerHTML = suggestionsHTML
  }
  
  suggestionsEl.classList.remove('hidden')
}

// Hide suggestions
function hideSuggestions() {
  const suggestionsEl = document.getElementById('username-suggestions')
  if (suggestionsEl) {
    suggestionsEl.classList.add('hidden')
  }
}

// Select suggestion
window.selectSuggestion = function(username) {
  const targetUsernameInput = document.getElementById('target-username')
  if (targetUsernameInput) {
    targetUsernameInput.value = username
  }
  hideSuggestions()
}

// Update impact preview
function updateImpactPreview() {
  const currentUser = getCurrentUser()
  if (!currentUser) return

  const selectedType = document.querySelector('input[name="vouch-type"]:checked')
  const impactPreviewEl = document.getElementById('impact-preview')
  const impactAmountEl = document.getElementById('impact-amount')

  if (!selectedType || !impactPreviewEl || !impactAmountEl) return

  // Get user's current reputation to determine impact
  supabase
    .from('user_profiles')
    .select('reputation')
    .eq('id', currentUser.id)
    .single()
    .then(({ data: profile }) => {
      if (profile) {
        const impact = getVouchImpact(profile.reputation)
        if (!impact || impact === 0) {
          impactAmountEl.textContent = `Not allowed`
          impactPreviewEl.classList.remove('hidden')
          return
        }

        const sign = selectedType.value === 'positive' ? '+' : '-'
        impactAmountEl.textContent = `${sign}${impact}`
        impactPreviewEl.classList.remove('hidden')
      }
    })
}

// Handle vouch form submission
async function handleVouchSubmit(e) {
  e.preventDefault()
  
  const currentUser = getCurrentUser()
  if (!currentUser) {
    showToast('Please login to create vouches', 'error')
    return
  }
  
  const targetUsername = document.getElementById('target-username').value.trim()
  const gameId = document.getElementById('game-select').value
  const vouchType = document.querySelector('input[name="vouch-type"]:checked')?.value
  const comment = document.getElementById('vouch-comment').value.trim()
  
  if (!targetUsername || !gameId || !vouchType) {
    showToast('Please fill in all required fields', 'error')
    return
  }
  
  // Find target user
  const { data: targetUser, error: userError } = await supabase
    .from('user_profiles')
    .select('id, username')
    .eq('username', targetUsername)
    .single()
  
  if (userError || !targetUser) {
    showToast('User not found', 'error')
    return
  }
  
  if (targetUser.id === currentUser.id) {
    showToast('You cannot vouch for yourself', 'error')
    return
  }

  // Ensure current user is allowed to vouch and determine impact
  const { data: currentProfile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('reputation')
    .eq('id', currentUser.id)
    .single()

  if (profileErr) {
    showToast('Failed to determine your reputation: ' + profileErr.message, 'error')
    return
  }

  const userRep = currentProfile?.reputation ?? 0
  if (userRep < 0) {
    showToast('Users with negative reputation cannot vouch', 'error')
    return
  }

  const impactScore = getVouchImpact(userRep)
  if (!impactScore || impactScore === 0) {
    showToast('Your current reputation does not allow vouching', 'error')
    return
  }
  
  showLoading(true)
  
  try {
    const { error } = await supabase
      .from('vouches')
      .insert({
        voucher_id: currentUser.id,
        target_id: targetUser.id,
        game_id: gameId,
        vouch_type: vouchType,
        comment: comment || null
      })
    
    if (error) {
      // Map common DB errors to friendly messages and show modal with next-allowed time
      let friendly = 'Failed to create vouch'
      if (error.code === '23505') { // Unique constraint violation (per-day index)
        friendly = 'You have already vouched for this user today in this game.'
      } else if (error.message && error.message.includes('Sliding window limit')) {
        friendly = 'You have reached the limit: you cannot vouch more than twice within 48 hours for the same person/game.'
      } else if (error.message) {
        friendly = error.message
      }

      // Attempt to compute next allowed time and show modal
      try {
        const nextAllowedMs = await getNextAllowedMs(currentUser.id, targetUser.id, gameId)
        const { formatDuration, showModal } = await import('./utils.js')
        const when = formatDuration(nextAllowedMs)
        const detail = `<div class="mb-2">${friendly}</div><div>You can try again in <strong>${when}</strong>.</div>`
        showModal('Vouch blocked', detail, [
          { label: 'OK', className: 'bg-gray-600' },
        ])
      } catch (calcErr) {
        // Fallback to toast if we can't compute next-allowed time
        showToast(friendly, 'error')
      }
      return
    }
    
    showToast('Vouch created successfully!', 'success')
    document.getElementById('vouch-form').reset()
    hideSuggestions()

    // Compute next-allowed time and show modal with info
    try {
      const nextAllowedMs = await getNextAllowedMs(currentUser.id, targetUser.id, gameId)
      const { formatDuration, showModal } = await import('./utils.js')
      const when = formatDuration(nextAllowedMs)
      const detail = `<div class="mb-2">You can vouch for <strong>${targetUsername}</strong> in <strong>${when}</strong>.</div>`
      showModal('Vouch submitted', detail, [
        { label: 'View profile', onClick: () => { window.location.href = `user-profile.html?username=${encodeURIComponent(targetUsername)}` } },
        { label: 'Close', className: 'bg-gray-600' }
      ])
    } catch (modalErr) {
      console.error('Failed to compute next-allowed time', modalErr)
      // fallback redirect
      setTimeout(() => {
        window.location.href = `user-profile.html?username=${encodeURIComponent(targetUsername)}`
      }, 1500)
    }
    
  } catch (error) {
    showToast('An error occurred: ' + error.message, 'error')
  } finally {
    showLoading(false)
  }
}

// Helper: returns milliseconds until next allowed vouch for (voucher, target, game)
async function getNextAllowedMs(voucherId, targetId, gameId) {
  // We enforce one per calendar date (unique index) and a sliding 48-hour max of 2 vouches.
  // To compute next allowed time, find the most recent two vouches in the last 48 hours.
  const { data, error } = await supabase
    .from('vouches')
    .select('created_at')
    .eq('voucher_id', voucherId)
    .eq('target_id', targetId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(2)

  if (error) throw error

  const now = new Date()
  if (!data || data.length === 0) return 0

  // If there is only one recent vouch, compute the per-day block and 48-hour window
  const latest = new Date(data[0].created_at)

  // Next day boundary (UTC date change) -> allow at next midnight UTC
  const nextUTCMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

  if (data.length === 1) {
    // Allowed again when either next UTC day arrives OR 48 hours since the first
    const sinceFirstMs = now - latest
    const until48Ms = Math.max(0, 48 * 3600 * 1000 - sinceFirstMs)
    const untilMidnightMs = nextUTCMidnight - now
    return Math.min(until48Ms, untilMidnightMs)
  }

  // If two recent vouches exist, next allowed is 48h after the older of the two
  const older = new Date(data[1].created_at)
  const allowAt = new Date(older.getTime() + 48 * 3600 * 1000)
  return Math.max(0, allowAt - now)
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeVouch)
