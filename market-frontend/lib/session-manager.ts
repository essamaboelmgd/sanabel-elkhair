import apiClient from './api'

export interface SessionData {
  session_id: string
  user: {
    id: string
    name: string
    phone: string
    role: 'admin' | 'customer'
    is_active: boolean
    first_login?: boolean
    wallet_balance?: number
  }
  expires_at: string
  token: string
}

class SessionManager {
  private currentSession: SessionData | null = null
  private sessionCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start session monitoring
    this.startSessionMonitoring()
  }

  /**
   * Set current session data
   */
  setSession(sessionData: SessionData): void {
    this.currentSession = sessionData
    // Store token in memory for API calls
    apiClient.setToken(sessionData.token)
  }

  /**
   * Get current session data
   */
  getSession(): SessionData | null {
    return this.currentSession
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentSession?.user || null
  }

  /**
   * Get current user role
   */
  getCurrentUserRole(): 'admin' | 'customer' | null {
    return this.currentSession?.user.role || null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentSession && this.isSessionValid()
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.getCurrentUserRole() === 'admin'
  }

  /**
   * Check if user is customer
   */
  isCustomer(): boolean {
    return this.getCurrentUserRole() === 'customer'
  }

  /**
   * Check if session is still valid
   */
  isSessionValid(): boolean {
    if (!this.currentSession) return false
    
    const expiresAt = new Date(this.currentSession.expires_at)
    const now = new Date()
    
    return expiresAt > now
  }

  /**
   * Validate session with server
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.currentSession) return false
      
      const response = await apiClient.validateSession()
      if (response) {
        // Update session data
        this.setSession(response)
        return true
      }
      return false
    } catch (error) {
      console.error('Session validation failed:', error)
      return false
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<boolean> {
    try {
      if (!this.currentSession) return false
      
      const response = await apiClient.refreshSession()
      if (response) {
        this.setSession(response)
        return true
      }
      return false
    } catch (error) {
      console.error('Session refresh failed:', error)
      return false
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        await apiClient.logout()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      this.clearSession()
    }
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null
    apiClient.clearToken()
  }

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (this.currentSession && this.isSessionValid()) {
        // Try to refresh session if it's close to expiring
        const expiresAt = new Date(this.currentSession.expires_at)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        const minutesUntilExpiry = timeUntilExpiry / (1000 * 60)
        
        if (minutesUntilExpiry < 30) {
          // Refresh session if less than 30 minutes until expiry
          await this.refreshSession()
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
  }

  /**
   * Get session expiry time
   */
  getSessionExpiryTime(): Date | null {
    if (!this.currentSession) return null
    return new Date(this.currentSession.expires_at)
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    if (!this.currentSession) return 0
    
    const expiresAt = new Date(this.currentSession.expires_at)
    const now = new Date()
    return expiresAt.getTime() - now.getTime()
  }

  /**
   * Check if session needs refresh
   */
  needsRefresh(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry()
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60)
    return minutesUntilExpiry < 30 // Refresh if less than 30 minutes
  }
}

// Create singleton instance
const sessionManager = new SessionManager()

export default sessionManager


