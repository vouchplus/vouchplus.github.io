// User's own profile functionality
import { supabase, getCurrentUser } from './config.js'
import { showLoading, showToast, formatTimeAgo, formatDate, renderVouchesList, requireAuth } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

// Initialize profile page
export async function initializeProfile() {
  await initializeAuth()
  setupAuthEventListeners()
  
  if (!requireAuth()) {
    window.location.href = 'index.html'
    return
  }
  
  await loadUserProfile()
  setupProfileEventListeners()
}

// Load user's own profile
async function loadUserProfile() {
  const currentUser = getCurrentUser()
  if (!currentUser) return
  
  showLoading(true)
  
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()
    
    if (profileError) {
      showToast('Failed to load profile: ' + profileError.message, 'error')
      return
    }
    
    if (!profile) {
      showToast('Profile not found', 'error')
      return
    }
    
    // Get vouches received
    const { data: vouchesReceived, error: receivedError } = await supabase
      .from('vouches')
      .select(`
        *,
        voucher:user_profiles!voucher_id(username, display_name),
        game:games!game_id(name)
      `)
      .eq('target_id', currentUser.id)
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
      .eq('voucher_id', currentUser.id)
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
  document.title = `My Profile - ${profile.username} - Vouch+`
  
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
  
  // Update vouch tier info
  const vouchTierInfoEl = document.getElementById('vouch-tier-info')
  if (vouchTierInfoEl) {
    const tier = getVouchTier(profile.reputation)
    vouchTierInfoEl.innerHTML = `
      <div class="flex items-center justify-between">
        <span>Your vouches have <strong>${tier.impact}</strong> reputation impact</span>
        <span class="px-2 py-1 rounded text-sm ${tier.color}">${tier.label}</span>
      </div>
    `
  }
  
  // Render vouches
  const vouchesReceivedListEl = document.getElementById('vouches-received-list')
  const vouchesGivenListEl = document.getElementById('vouches-given-list')
  
  if (vouchesReceivedListEl) {
    vouchesReceivedListEl.innerHTML = renderVouchesList(vouchesReceived, 'received')
  }
  
  if (vouchesGivenListEl) {
    vouchesGivenListEl.innerHTML = renderVouchesList(vouchesGiven, 'given')
  }
}

// Get vouch tier information
function getVouchTier(reputation) {
  if (reputation < 0) {
    return { impact: 'no', label: 'Cannot Vouch', color: 'bg-red-600' }
  } else if (reputation < 100) {
    return { impact: 'low (+1/-1)', label: 'Low Impact', color: 'bg-yellow-600' }
  } else {
    return { impact: 'high (+10/-10)', label: 'High Impact', color: 'bg-green-600' }
  }
}

// Setup profile event listeners
function setupProfileEventListeners() {
  const editProfileBtn = document.getElementById('edit-profile-btn')
  const editProfileModal = document.getElementById('edit-profile-modal')
  const editProfileForm = document.getElementById('edit-profile-form')
  const cancelEditBtn = document.getElementById('cancel-edit-btn')

  // Edit profile button
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      if (editProfileModal) {
        editProfileModal.classList.remove('hidden')
        populateEditForm()
      }
    })
  }

  // Cancel edit
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      if (editProfileModal) {
        editProfileModal.classList.add('hidden')
      }
    })
  }

  // Edit form submission
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', handleEditProfile)
  }

  // Close modal when clicking outside
  if (editProfileModal) {
    editProfileModal.addEventListener('click', (e) => {
      if (e.target === editProfileModal) {
        editProfileModal.classList.add('hidden')
      }
    })
  }
}

// Populate edit form with current data
function populateEditForm() {
  const currentUser = getCurrentUser()
  if (!currentUser) return

  supabase
    .from('user_profiles')
    .select('username, display_name, bio')
    .eq('id', currentUser.id)
    .single()
    .then(({ data: profile }) => {
      if (profile) {
        const usernameInput = document.getElementById('edit-username')
        const displayNameInput = document.getElementById('edit-display-name')
        const bioInput = document.getElementById('edit-bio')

        if (usernameInput) usernameInput.value = profile.username
        if (displayNameInput) displayNameInput.value = profile.display_name || ''
        if (bioInput) bioInput.value = profile.bio || ''
      }
    })
}

// Handle edit profile form submission
async function handleEditProfile(e) {
  e.preventDefault()
  
  const currentUser = getCurrentUser()
  if (!currentUser) return
  
  const username = document.getElementById('edit-username').value.trim()
  const displayName = document.getElementById('edit-display-name').value.trim()
  const bio = document.getElementById('edit-bio').value.trim()
  
  if (!username) {
    showToast('Username is required', 'error')
    return
  }
  
  showLoading(true)
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        username: username,
        display_name: displayName || null,
        bio: bio || null
      })
      .eq('id', currentUser.id)
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        showToast('Username is already taken', 'error')
      } else {
        showToast('Failed to update profile: ' + error.message, 'error')
      }
      return
    }
    
    showToast('Profile updated successfully!', 'success')
    document.getElementById('edit-profile-modal').classList.add('hidden')
    await loadUserProfile()
    
  } catch (error) {
    showToast('An error occurred: ' + error.message, 'error')
  } finally {
    showLoading(false)
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProfile)
