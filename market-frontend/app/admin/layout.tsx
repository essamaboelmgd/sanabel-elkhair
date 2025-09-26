"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import AdminSidebar from "@/components/admin/admin-sidebar"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitializing, setIsInitializing] = useState(true)

  // Allow access to login page without authentication
  const isLoginPage = pathname === "/admin/login"
  const isInvoicesSection = pathname.startsWith("/admin/invoices")
  const isCustomersSection = pathname.startsWith("/admin/customers")

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsInitializing(false)
      return
    }

    // Check authentication when loading is complete
    if (!loading) {
      if (!user) {
        router.push('/admin/login')
        return
      }

      if (user.role === 'admin') {
        setIsInitializing(false)
        return
      }

      if (user.role === 'cashier') {
        // Allow invoices and customers sections for cashier
        if (isInvoicesSection || isCustomersSection) {
          setIsInitializing(false)
        } else {
          router.replace('/admin/invoices')
        }
        return
      }

      // Any other role: send to login
      router.push('/admin/login')
    }
  }, [loading, user, router, isLoginPage])

  // Show loading while initializing (but not for login page)
  if (!isLoginPage && (isInitializing || loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    )
  }

  // Allow login page to render without authentication
  if (isLoginPage) {
    return <>{children}</>
  }

  // If no user, don't render anything (will redirect)
  if (!user) {
    return null
  }

  // Admin: full layout; Cashier: invoices and customers sections
  const canRender = user.role === 'admin' || (user.role === 'cashier' && (isInvoicesSection || isCustomersSection))
  if (!canRender) return null

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
