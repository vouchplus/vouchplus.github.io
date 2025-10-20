// Leaderboard functionality
import { supabase } from './config.js'
import { showLoading, showToast, formatReputation, getRankIcon, debounce } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

let currentPage = 1
let currentSortBy = 'reputation'
let currentLimit = 50

// Initialize leaderboard page
export async function initializeLeaderboard() {
  await initializeAuth()
  setupAuthEventListeners()
  setupLeaderboardEventListeners()
  await loadLeaderboard()
}

// Setup leaderboard event listeners
function setupLeaderboardEventListeners() {
  const sortSelect = document.getElementById('sort-by')
  const limitInput = document.getElementById('limit-input')
  const refreshBtn = document.getElementById('refresh-btn')
  const prevPageBtn = document.getElementById('prev-page')
  const nextPageBtn = document.getElementById('next-page')

  // Sort and limit controls
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortBy = e.target.value
      currentPage = 1
      loadLeaderboard()
    })
  }

  if (limitInput) {
    const debouncedLimitChange = debounce((e) => {
      currentLimit = parseInt(e.target.value) || 50
      currentPage = 1
      loadLeaderboard()
    }, 500)

    limitInput.addEventListener('input', debouncedLimitChange)
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLeaderboard()
    })
  }

  // Pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--
        loadLeaderboard()
      }
    })
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      currentPage++
      loadLeaderboard()
    })
  }
}

// Load leaderboard
async function loadLeaderboard() {
  showLoading(true)
  
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order(getSortField(), { ascending: false })
      .range((currentPage - 1) * currentLimit, currentPage * currentLimit - 1)
    
    if (error) {
      showToast('Failed to load leaderboard: ' + error.message, 'error')
      return
    }
    
    renderLeaderboard(data)
    updatePagination(data.length === currentLimit)
    await loadLeaderboardStats()
    
  } catch (error) {
    showToast('An error occurred: ' + error.message, 'error')
  } finally {
    showLoading(false)
  }
}

// Get sort field based on current sort option
function getSortField() {
  switch (currentSortBy) {
    case 'vouches': return 'total_vouches_received'
    case 'positive': return 'positive_vouches'
    case 'recent': return 'last_active'
    default: return 'reputation'
  }
}

// Render leaderboard
function renderLeaderboard(users) {
  const container = document.getElementById('leaderboard-content')
  if (!container) return

  if (users.length === 0) {
    container.innerHTML = '<p class="text-gray-400">No users found</p>'
    return
  }
  
  const leaderboardHTML = users.map((user, index) => {
    const rank = (currentPage - 1) * currentLimit + index + 1
    const rankIcon = getRankIcon(rank)
    const reputation = formatReputation(user.reputation)
    const memberSince = new Date(user.created_at).toLocaleDateString()
    
    return `
      <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2 hover:bg-gray-600 transition-colors cursor-pointer" onclick="window.location.href='user-profile.html?username=${encodeURIComponent(user.username)}'">
        <div class="flex items-center space-x-4">
          <div class="text-2xl">${rankIcon}</div>
          <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <div class="font-medium text-lg">${user.username}</div>
            <div class="text-sm text-gray-400">${user.display_name || user.username}</div>
            <div class="text-xs text-gray-500">Member since ${memberSince}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold ${reputation.color} text-xl">${reputation.text}</div>
          <div class="text-sm text-gray-400">${user.total_vouches_received} vouches</div>
          <div class="text-xs text-gray-500">
            ${user.positive_vouches} positive, ${user.negative_vouches} negative
          </div>
        </div>
      </div>
    `
  }).join('')
  
  container.innerHTML = leaderboardHTML
}

// Load leaderboard statistics
async function loadLeaderboardStats() {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    
    // Get average reputation
    const { data: avgData } = await supabase
      .from('user_profiles')
      .select('reputation')
    
    const avgReputation = avgData ? Math.round(avgData.reduce((sum, user) => sum + user.reputation, 0) / avgData.length) : 0
    
    // Get top reputation
    const { data: topUser } = await supabase
      .from('user_profiles')
      .select('reputation')
      .order('reputation', { ascending: false })
      .limit(1)
      .single()
    
    const topReputation = topUser ? topUser.reputation : 0
    
    // Update stats display
    const totalUsersEl = document.getElementById('total-leaderboard-users')
    const avgRepEl = document.getElementById('avg-reputation')
    const topRepEl = document.getElementById('top-reputation')
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers || 0
    if (avgRepEl) avgRepEl.textContent = avgReputation
    if (topRepEl) topRepEl.textContent = topReputation
    
  } catch (error) {
    console.error('Failed to load leaderboard stats:', error)
  }
}

// Update pagination
function updatePagination(hasMore) {
  const pagination = document.getElementById('pagination')
  const pageInfo = document.getElementById('page-info')
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')

  if (!pagination || !pageInfo || !prevBtn || !nextBtn) return

  pagination.classList.remove('hidden')
  
  pageInfo.textContent = `Page ${currentPage}`
  
  prevBtn.disabled = currentPage <= 1
  nextBtn.disabled = !hasMore
  
  if (currentPage <= 1) {
    prevBtn.classList.add('opacity-50', 'cursor-not-allowed')
  } else {
    prevBtn.classList.remove('opacity-50', 'cursor-not-allowed')
  }
  
  if (!hasMore) {
    nextBtn.classList.add('opacity-50', 'cursor-not-allowed')
  } else {
    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed')
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLeaderboard)
