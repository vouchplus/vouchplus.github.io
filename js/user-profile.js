// User profile viewing functionality
import { supabase, getCurrentUser } from './config.js'
import { showLoading, showToast, formatTimeAgo, formatDate, renderVouchesList, getUrlParams, requireAuth } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

let currentProfileUser = null

// Initialize user profile page
export async function initializeUserProfile() {
  await initializeAuth()
  setupAuthEventListeners()
  
  const params = getUrlParams()
  const username = params.username
  
  if (!username) {
    showToast('No username provided', 'error')
    window.location.href = 'search.html'
    return
  }
  
  await loadUserProfile(username)
  setupProfileEventListeners()
}

// Load user profile
async function loadUserProfile(username) {
  showLoading(true)
  
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()
    
    if (profileError) {
      showToast('Failed to load profile: ' + profileError.message, 'error')
      return
    }
    
    if (!profile) {
      showToast('User not found', 'error')
      window.location.href = 'search.html'
      return
    }
    
    currentProfileUser = profile
    
    // Get vouches received
    const { data: vouchesReceived, error: receivedError } = await supabase
      .from('vouches')
      .select(`
        *,
        voucher:user_profiles!voucher_id(username, display_name),
        game:games!game_id(name)
      `)
      .eq('target_id', profile.id)
      .order('created_at', { ascending: false })
    
    if (receivedError) {
      showToast('Failed to load vouches: ' + receivedError.message, 'error')
      return
    }
    
    // Get vouches given
    const { data: vouchesGiven, error: givenError } = await supabase
      .from('vouches')
      .select(`
        *,
        target:user_profiles!target_id(username, display_name),
        game:games!game_id(name)
      `)
      .eq('voucher_id', profile.id)
      .order('created_at', { ascending: false })
    
    if (givenError) {
      showToast('Failed to load vouches: ' + givenError.message, 'error')
      return
    }
    
    renderProfile(profile, vouchesReceived, vouchesGiven)
    
  } catch (error) {
    showToast('An error occurred: ' + error.message, 'error')
  } finally {
    showLoading(false)
  }
}

// Render profile
function renderProfile(profile, vouchesReceived, vouchesGiven) {
  // Update page title
  document.title = `${profile.username} - Vouch+`
  
  // Update profile header
  const usernameEl = document.getElementById('profile-username')
  const displayNameEl = document.getElementById('profile-display-name')
  
  if (usernameEl) usernameEl.textContent = profile.username
  if (displayNameEl) displayNameEl.textContent = profile.display_name || profile.username
  
  // Update stats
  const reputationEl = document.getElementById('profile-reputation')
  const vouchesReceivedEl = document.getElementById('profile-vouches-received')
  const vouchesGivenEl = document.getElementById('profile-vouches-given')
  const memberSinceEl = document.getElementById('profile-member-since')
  
  if (reputationEl) reputationEl.textContent = profile.reputation
  if (vouchesReceivedEl) vouchesReceivedEl.textContent = profile.total_vouches_received
  if (vouchesGivenEl) vouchesGivenEl.textContent = profile.total_vouches_given
  if (memberSinceEl) memberSinceEl.textContent = formatDate(profile.created_at)
  
  // Update vouch counts
  const positiveCountEl = document.getElementById('positive-vouches-count')
  const negativeCountEl = document.getElementById('negative-vouches-count')
  
  if (positiveCountEl) positiveCountEl.textContent = profile.positive_vouches
  if (negativeCountEl) negativeCountEl.textContent = profile.negative_vouches
  
  // Render vouches
  const vouchesReceivedListEl = document.getElementById('vouches-received-list')
  const vouchesGivenListEl = document.getElementById('vouches-given-list')
  
  if (vouchesReceivedListEl) {
    vouchesReceivedListEl.innerHTML = renderVouchesList(vouchesReceived, 'received')
  }
  
  if (vouchesGivenListEl) {
    vouchesGivenListEl.innerHTML = renderVouchesList(vouchesGiven, 'given')
  }
  
  // Show/hide vouch button based on authentication and self-vouching
  const profileActionsEl = document.getElementById('profile-actions')
  const currentUser = getCurrentUser()
  
  if (profileActionsEl) {
    if (currentUser && currentUser.id !== profile.id) {
      profileActionsEl.classList.remove('hidden')
    } else {
      profileActionsEl.classList.add('hidden')
    }
  }
}

// Setup profile event listeners
function setupProfileEventListeners() {
  const vouchUserBtn = document.getElementById('vouch-user-btn')
  
  if (vouchUserBtn) {
    vouchUserBtn.addEventListener('click', () => {
      if (!requireAuth()) return
      
      if (currentProfileUser) {
        window.location.href = `vouch.html?target=${encodeURIComponent(currentProfileUser.username)}`
      }
    })
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUserProfile)
