// Home page functionality
import { supabase, setGames } from './config.js'
import { showLoading, showToast, formatTimeAgo } from './utils.js'
import { initializeAuth, setupAuthEventListeners } from './auth.js'

// Initialize home page
export async function initializeHome() {
  await initializeAuth()
  setupAuthEventListeners()
  await loadGames()
  await loadStats()
  await loadRecentActivity()
}

// Load games list
async function loadGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('name')
  
  if (error) {
    showToast('Failed to load games: ' + error.message, 'error')
    return
  }
  
  setGames(data)
}

// Load statistics
async function loadStats() {
  try {
    // Load total users
    const { count: userCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    
    // Load total vouches
    const { count: vouchCount } = await supabase
      .from('vouches')
      .select('*', { count: 'exact', head: true })
    
    const totalUsersEl = document.getElementById('total-users')
    const totalVouchesEl = document.getElementById('total-vouches')
    
    if (totalUsersEl) totalUsersEl.textContent = userCount || 0
    if (totalVouchesEl) totalVouchesEl.textContent = vouchCount || 0
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// Load recent activity
async function loadRecentActivity() {
  const { data, error } = await supabase
    .from('vouches')
    .select(`
      *,
      voucher:user_profiles!voucher_id(username, display_name),
      target:user_profiles!target_id(username, display_name),
      game:games!game_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Failed to load recent activity:', error)
    return
  }
  
  const container = document.getElementById('recent-activity')
  if (!container) return
  
  container.innerHTML = ''
  
  if (data.length === 0) {
    container.innerHTML = '<p class="text-gray-400">No recent activity</p>'
    return
  }
  
  data.forEach(vouch => {
    const activityItem = document.createElement('div')
    activityItem.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-lg'
    
    const isPositive = vouch.vouch_type === 'positive'
    const icon = isPositive ? 'fa-thumbs-up text-green-400' : 'fa-thumbs-down text-red-400'
    const impact = isPositive ? '+' : '-'
    
    activityItem.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas ${icon}"></i>
        <div>
          <span class="font-medium">${vouch.voucher.username}</span>
          <span class="text-gray-400">vouched</span>
          <span class="font-medium">${vouch.target.username}</span>
          <span class="text-gray-400">in</span>
          <span class="font-medium">${vouch.game.name}</span>
          <span class="text-gray-400">(${impact}${vouch.impact_score})</span>
        </div>
      </div>
      <div class="text-sm text-gray-400">
        ${formatTimeAgo(vouch.created_at)}
      </div>
    `
    
    container.appendChild(activityItem)
  })
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeHome)
