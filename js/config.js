// Configuration and shared constants
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
export const supabase = createClient(
  'https://labnikzyqhlukvoauqjt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhYm5pa3p5cWhsdWt2b2F1cWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NDc2MjQsImV4cCI6MjA3NjQyMzYyNH0.tV8NuRlg3mIcZ6Ynp2gpE8XHsv7vIhbQkFjq2OKlCus'
)

// Global state
export let currentUser = null
export let games = []

// Constants
export const REPUTATION_TIERS = {
  CANNOT_VOUCH: { min: -Infinity, max: -1, impact: 0, label: 'Cannot Vouch' },
  LOW_IMPACT: { min: 0, max: 99, impact: 1, label: 'Low Impact (+1/-1)' },
  HIGH_IMPACT: { min: 100, max: Infinity, impact: 10, label: 'High Impact (+10/-10)' }
}

export const VOUCH_TYPES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative'
}

export const PAGE_SIZE = 20

// Utility function to get reputation tier
export function getReputationTier(reputation) {
  if (reputation < 0) return REPUTATION_TIERS.CANNOT_VOUCH
  if (reputation < 100) return REPUTATION_TIERS.LOW_IMPACT
  return REPUTATION_TIERS.HIGH_IMPACT
}

// Utility function to get vouch impact
export function getVouchImpact(reputation) {
  return getReputationTier(reputation).impact
}

// Set current user
export function setCurrentUser(user) {
  currentUser = user
}

// Get current user
export function getCurrentUser() {
  return currentUser
}

// Set games list
export function setGames(gamesList) {
  games = gamesList
}

// Get games list
export function getGames() {
  return games
}
