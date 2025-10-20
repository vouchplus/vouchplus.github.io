// Authentication module
import { supabase, setCurrentUser } from './config.js'
import { showToast, showLoading } from './utils.js'

// Initialize authentication
export async function initializeAuth() {
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    setCurrentUser(session.user)
    await ensureUserProfile(session.user)
    showAuthenticatedUI()
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      setCurrentUser(session.user)
      await ensureUserProfile(session.user)
      showAuthenticatedUI()
    } else {
      setCurrentUser(null)
      showUnauthenticatedUI()
    }
  })
}

// Login function
export async function login() {
  showLoading(true)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: "https://vouchplus.github.io",
    },
  })
  showLoading(false)
  if (error) {
    showToast('Login failed: ' + error.message, 'error')
  }
}

// Logout function
export async function logout() {
  showLoading(true)
  await supabase.auth.signOut()
  showLoading(false)
  window.location.href = 'index.html'
}

// Ensure user profile exists
async function ensureUserProfile(user) {
  try {
    // Check if user profile exists
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    if (error) {
      console.error('Error checking user profile:', error)
      return
    }
    
    if (!profile) {
      // Profile doesn't exist, create it
      let username = user.user_metadata?.name || 
                    user.user_metadata?.preferred_username || 
                    user.email?.split('@')[0] || 
                    'user' + user.id.substring(0, 8)
      
      // Clean username (remove special characters, convert to lowercase)
      username = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      
      // Ensure username is unique by adding a number if needed
      let finalUsername = username
      let counter = 1
      
      while (true) {
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle()
        
        if (!existingUser) {
          break // Username is available
        }
        
        finalUsername = username + counter
        counter++
      }
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          username: finalUsername,
          display_name: user.user_metadata?.name || finalUsername
        })
      
      if (insertError) {
        console.error('Failed to create user profile:', insertError)
        showToast('Failed to create profile. Please try again.', 'error')
      } else {
        console.log('User profile created successfully')
      }
    }
  } catch (error) {
    console.error('Unexpected error in ensureUserProfile:', error)
  }
}

// Show authenticated UI
function showAuthenticatedUI() {
  const loginBtn = document.getElementById('login-btn')
  const userNav = document.getElementById('user-nav')
  const quickActions = document.getElementById('quick-actions')
  
  if (loginBtn) loginBtn.classList.add('hidden')
  if (userNav) userNav.classList.remove('hidden')
  if (quickActions) quickActions.classList.remove('hidden')
}

// Show unauthenticated UI
function showUnauthenticatedUI() {
  const loginBtn = document.getElementById('login-btn')
  const userNav = document.getElementById('user-nav')
  const quickActions = document.getElementById('quick-actions')
  
  if (loginBtn) loginBtn.classList.remove('hidden')
  if (userNav) userNav.classList.add('hidden')
  if (quickActions) quickActions.classList.add('hidden')
}

// Setup auth event listeners
export function setupAuthEventListeners() {
  const loginBtn = document.getElementById('login-btn')
  const logoutBtn = document.getElementById('logout-btn')
  
  if (loginBtn) {
    loginBtn.addEventListener('click', login)
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout)
  }
}
