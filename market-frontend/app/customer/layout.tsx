"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitializing, setIsInitializing] = useState(true)

  // Allow access to login page without authentication
  const isLoginPage = pathname === "/customer/login"

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsInitializing(false)
      return
    }

    // Check authentication when loading is complete
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.push('/customer/login')
      } else if (user.role !== 'customer') {
        // User exists but not customer, redirect to login
        router.push('/customer/login')
      } else {
        // User is customer, allow access
        setIsInitializing(false)
      }
    }
  }, [loading, user, router, isLoginPage])

  // Show loading while initializing (but not for login page)
  if (!isLoginPage && (isInitializing || loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    )
  }

  // Allow login page to render without authentication
  if (isLoginPage) {
    return <>{children}</>
  }

  // If no user or not customer, don't render anything (will redirect)
  if (!user || user.role !== 'customer') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      {children}
    </div>
  )
}
