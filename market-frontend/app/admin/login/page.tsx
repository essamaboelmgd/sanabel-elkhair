"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ShoppingBasket, Phone, Lock, ArrowRight, Crown, ArrowLeft, UserCircle2 } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"admin" | "cashier">("admin")

  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const success = await login(phone, password, role)
      if (success) {
        if (role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/admin/invoices")
        }
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: role === "admin" ? "مرحباً بك في محل سنابل، المدير!" : "مرحباً بك، الكاشير!",
        })
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: "بيانات الاعتماد غير صحيحة",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <ShoppingBasket className="h-12 w-12 text-green-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">سنابل الخير</h1>
          <p className="text-gray-600">تسجيل الدخول</p>
        </div>

        <Card className="shadow-xl border-green-100 bg-gradient-to-br from-white to-green-50">
          <CardHeader>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${role === "admin" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-green-200"}`}
              >
                المدير
              </button>
              <button
                type="button"
                onClick={() => setRole("cashier")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${role === "cashier" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-emerald-200"}`}
              >
                الكاشير
              </button>
            </div>
            <CardTitle className="text-center text-xl text-gray-800 mt-3">تسجيل دخول {role === "admin" ? "المدير" : "الكاشير"}</CardTitle>
            <CardDescription className="text-center text-gray-600">
              أدخل بيانات الاعتماد للوصول للنظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="أدخل رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-center text-lg border-green-200 focus:border-green-500 focus:ring-green-500"
                    required
                    minLength={10}
                    maxLength={15}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 text-center border-green-200 focus:border-green-500 focus:ring-green-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري تسجيل الدخول...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    تسجيل الدخول
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                هل أنت عميلة؟ سجلي دخولك من الصفحة الرئيسية
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة للصفحة الرئيسية
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
