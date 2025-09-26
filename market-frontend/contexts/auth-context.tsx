"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import apiClient from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  phone: string
  role: "admin" | "cashier" | "customer"
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (phone: string, password: string, role: "admin" | "cashier" | "customer") => Promise<boolean>
  logout: () => void
  checkCustomerFirstLogin: (phone: string) => Promise<boolean>
  setCustomerPassword: (phone: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token in localStorage on app start
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      const userData = localStorage.getItem('user_data')
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData)
          setUser(user)
          apiClient.setToken(token)
          console.log('Restored token from localStorage:', token.substring(0, 20) + '...')
        } catch (error) {
          console.error('Error parsing stored user data:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_data')
        }
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (phone: string, password: string, role: "admin" | "customer"): Promise<boolean> => {
    try {
      const response = await apiClient.login(phone, password, role)
      if (response.access_token && response.user) {
        // Store user data and token in localStorage
        setUser(response.user)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', response.access_token)
          localStorage.setItem('user_data', JSON.stringify(response.user))
        }
        
        // Store token in API client
        apiClient.setToken(response.access_token)
        
        console.log('Login successful:', response.user)
        console.log('Token received:', response.access_token.substring(0, 20) + '...')
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    }
    apiClient.logout()
  }

  const checkCustomerFirstLogin = async (phone: string): Promise<boolean> => {
    // This would need to be implemented in the backend
    // For now, return false as default
    return false
  }

  const setCustomerPassword = async (phone: string, password: string): Promise<void> => {
    try {
      await apiClient.setCustomerPassword(phone, password)
    } catch (error) {
      throw new Error('Failed to change password')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        checkCustomerFirstLogin,
        setCustomerPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
