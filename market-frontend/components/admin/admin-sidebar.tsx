"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Package, Receipt, Users, Settings, LogOut, User, ShoppingCart, ChevronUp, Crown, Sparkles } from 'lucide-react'

const menuItems = [
  {
    title: "لوحة التحكم",
    url: "/admin/dashboard",
    icon: BarChart3,
    badge: null,
  },
  {
    title: "المنتجات",
    url: "/admin/products",
    icon: Package,
    badge: null,
  },
  {
    title: "الفواتير",
    url: "/admin/invoices",
    icon: Receipt,
    badge: "جديد",
  },
  {
    title: "العملاء",
    url: "/admin/customers",
    icon: Users,
    badge: null,
  },
  // {
  //   title: "الإعدادات",
  //   url: "/admin/settings",
  //   icon: Settings,
  //   badge: null,
  // },
]

function AdminSidebar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push("/admin/login")
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-pink-100 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">سنابل</h2>
            <p className="text-sm text-pink-600 font-medium">لوحة الإدارة</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 bg-white p-3">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            التنقل الرئيسي
          </div>
          {menuItems
            .filter((item) => (user?.role === 'cashier' ? (item.url === '/admin/invoices' || item.url === '/admin/customers') : true))
            .map((item) => {
            const isActive = pathname === item.url
            return (
              <Button
                key={item.title}
                variant="ghost"
                className={`
                  w-full justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:from-blue-600 hover:to-indigo-600' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }
                `}
                asChild
              >
                <a href={item.url} className="flex items-center gap-3 w-full">
                  <span className="flex-1 text-right font-medium">{item.title}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-1 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                </a>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-3 hover:bg-gray-100 rounded-xl">
              <ChevronUp className="mr-auto h-4 w-4 text-gray-500" />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name || "المدير"}</p>
                  <p className="text-xs text-pink-600">مدير محل سنابل</p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-blue-200">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                    <Crown className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            className="w-64 p-2 bg-white border border-gray-200 shadow-xl rounded-xl"
            align="end"
          >
            <DropdownMenuItem 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer transition-colors duration-200"
            >
              <span className="font-medium">تسجيل الخروج</span>
              <LogOut className="h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default AdminSidebar


