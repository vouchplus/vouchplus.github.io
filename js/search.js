// Search functionality
import { supabase } from './config.js'
import { showLoading, showToast, formatTimeAgo, formatReputation, navigateToUserProfile, debounce } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

let currentPage = 1
let currentSearchTerm = ''
let currentSortBy = 'reputation'
let currentLimit = 50

// Initialize search page
export async function initializeSearch() {
  await initializeAuth()
  setupAuthEventListeners()
  setupSearchEventListeners()
}

// Setup search event listeners
function setupSearchEventListeners() {
  const searchInput = document.getElementById('search-input')
  const searchBtn = document.getElementById('search-btn')
  const sortSelect = document.getElementById('sort-by')
  const limitInput = document.getElementById('limit-input')
  const refreshBtn = document.getElementById('refresh-btn')
  const prevPageBtn = document.getElementById('prev-page')
  const nextPageBtn = document.getElementById('next-page')

  // Search functionality
  if (searchInput) {
    // Debounced search as user types
    const debouncedSearch = debounce(() => {
      currentSearchTerm = searchInput.value.trim()
      currentPage = 1
      if (currentSearchTerm) {
        searchUsers()
      } else {
        clearSearchResults()
      }
    }, 300)

    searchInput.addEventListener('input', debouncedSearch)
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        currentSearchTerm = searchInput.value.trim()
        currentPage = 1
        if (currentSearchTerm) {
          searchUsers()
        }
      }
    })
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchInput = document.getElementById('search-input')
      currentSearchTerm = searchInput.value.trim()
      currentPage = 1
      if (currentSearchTerm) {
        searchUsers()
      }
    })
  }

  // Sort and limit controls
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortBy = e.target.value
      currentPage = 1
      if (currentSearchTerm) {
        searchUsers()
      }
    })
  }

  if (limitInput) {
    limitInput.addEventListener('change', (e) => {
      currentLimit = parseInt(e.target.value) || 50
      currentPage = 1
      if (currentSearchTerm) {
        searchUsers()
      }
    })
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (currentSearchTerm) {
        searchUsers()
      }
    })
  }

  // Pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--
        searchUsers()
      }
    })
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      currentPage++
      searchUsers()
    })
  }
}

// Search users
async function searchUsers() {
  if (!currentSearchTerm) return

  showLoading(true)

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${currentSearchTerm}%,display_name.ilike.%${currentSearchTerm}%`)
      .order(getSortField(), { ascending: false })
      .range((currentPage - 1) * currentLimit, currentPage * currentLimit - 1)

    if (error) {
      showToast('Search failed: ' + error.message, 'error')
      return
    }

    renderSearchResults(data)
    updatePagination(data.length === currentLimit)

  } catch (error) {
    showToast('An error occurred during search: ' + error.message, 'error')
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

// Render search results
function renderSearchResults(users) {
  const container = document.getElementById('search-results')
  if (!container) return

  if (users.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fas fa-search text-4xl mb-4"></i>
        <p>No users found matching "${currentSearchTerm}"</p>
      </div>
    `
    return
  }

  const resultsHTML = users.map(user => {
    const reputation = formatReputation(user.reputation)
    const memberSince = new Date(user.created_at).toLocaleDateString()
    
    return `
      <div class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer" data-username="${user.username}">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <div class="font-medium text-lg">${user.username}</div>
              <div class="text-gray-400">${user.display_name || user.username}</div>
              <div class="text-sm text-gray-500">Member since ${memberSince}</div>
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
      </div>
    `
  }).join('')

  container.innerHTML = resultsHTML
  
  // Attach click listeners to each result to navigate to profile
  const items = container.querySelectorAll('[data-username]')
  items.forEach(item => {
    item.addEventListener('click', () => {
      const username = item.getAttribute('data-username')
      if (username) navigateToUserProfile(username)
    })
  })
}

// Clear search results
function clearSearchResults() {
  const container = document.getElementById('search-results')
  if (!container) return

  container.innerHTML = `
    <div class="text-center text-gray-400 py-8">
      <i class="fas fa-search text-4xl mb-4"></i>
      <p>Enter a username to search for users</p>
    </div>
  `

  const pagination = document.getElementById('pagination')
  if (pagination) pagination.classList.add('hidden')
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
document.addEventListener('DOMContentLoaded', initializeSearch)
