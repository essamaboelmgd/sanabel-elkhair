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
import { ShoppingBasket, Phone, Lock, ArrowRight, Leaf, ArrowLeft, UserPlus, UserCheck } from "lucide-react"
import Link from "next/link"
import apiClient from "@/lib/api"

export default function CustomerLoginPage() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"phone" | "password" | "new-password">("phone")
  const [customerExists, setCustomerExists] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // التحقق من وجود العميل
      const response = await apiClient.checkCustomerExists(phone) as any
      setCustomerExists(response.exists)
      
      if (response.exists) {
        setCustomerName(response.customer_name || "")
        setIsFirstLogin(response.first_login || false)
        
        if (response.first_login) {
          // عميل موجود لكنه first login - يحتاج كلمة مرور جديدة
          setStep("new-password")
          toast({
            title: "مرحباً بك!",
            description: `مرحباً ${response.customer_name || "عميلتنا العزيزة"}! يبدو أن هذه أول مرة لك. أدخلي كلمة مرور جديدة`,
          })
        } else {
          // عميل موجود وليس first login - يحتاج كلمة المرور الحالية
          setStep("password")
          toast({
            title: "تم العثور على العميل",
            description: `مرحباً ${response.customer_name || "عميلتنا العزيزة"}! أدخلي كلمة المرور الخاصة بك`,
          })
        }
      } else {
        // عميل غير موجود - لا يمكنه التسجيل
        toast({
          title: "غير مسجل",
          description: "عذراً، أنت غير مسجل في نظامنا. تواصلي مع الإدارة لإنشاء حساب جديد.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحقق من العميل. تأكد من صحة رقم الهاتف.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check password length (minimum 8 characters)
    if (!password || password.length < 8) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setPasswordError("")

    try {
      if (step === "password") {
        // تسجيل دخول العميل الموجود
        const success = await login(phone, password, "customer")
        if (success) {
          router.push("/customer/dashboard")
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "مرحباً بك في محل سنابل!",
          })
        } else {
          toast({
            title: "فشل تسجيل الدخول",
            description: "كلمة المرور غير صحيحة",
            variant: "destructive",
          })
        }
      } else if (step === "new-password") {
        // إنشاء كلمة مرور جديدة للعميل (first login أو عميل جديد)
        // Check if passwords match
        if (password !== confirmPassword) {
          toast({
            title: "خطأ",
            description: "كلمات المرور غير متطابقة",
            variant: "destructive",
          })
          return
        }
        
        const result = await apiClient.setCustomerPasswordByPhone(phone, password) as any
        if (result.success) {
          toast({
            title: "تم إنشاء كلمة المرور بنجاح",
            description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
          })
          // تحديث حالة العميل
          setCustomerExists(true)
          setIsFirstLogin(false)
          setCustomerName(result.customer_name || "")
          setStep("password")
          setPassword("")
          setConfirmPassword("")
        } else {
          toast({
            title: "خطأ",
            description: result.error || "حدث خطأ أثناء إنشاء كلمة المرور",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPhone = () => {
    setStep("phone")
    setPassword("")
    setCustomerExists(false)
    setCustomerName("")
    setIsFirstLogin(false)
  }

  const renderPhoneStep = () => (
    <form onSubmit={handlePhoneSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-gray-700">رقم الهاتف</Label>
        <div className="relative">
          <Phone className="absolute right-3 top-3 h-4 w-4 text-green-500" />
          <Input
            id="phone"
            type="tel"
            placeholder="أدخلي رقم الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pr-10 text-center text-lg border-green-200 focus:border-green-500 focus:ring-green-500"
            required
            minLength={10}
            maxLength={15}
          />
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800" disabled={loading}>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            جاري التحقق...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            التحقق من العميل
            <ArrowRight className="h-5 w-5" />
          </div>
        )}
      </Button>
    </form>
  )

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700">
          {step === "password" ? "كلمة المرور" : "كلمة المرور الجديدة"}
        </Label>
        <div className="relative">
          <Lock className="absolute right-3 top-3 h-4 w-4 text-green-500" />
          <Input
            id="password"
            type="password"
            placeholder={step === "password" ? "أدخلي كلمة المرور" : "أدخلي كلمة مرور جديدة"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              // Clear error when user types
              if (passwordError) setPasswordError("")
            }}
            className={`pr-10 text-center border-green-200 focus:border-green-500 focus:ring-green-500 ${passwordError ? "border-red-500" : ""}`}
            required
            minLength={8}
          />
        </div>
        {passwordError && (
          <p className="text-sm text-red-500 text-center">{passwordError}</p>
        )}
        <p className="text-xs text-gray-500 text-center">يجب أن تكون 8 أحرف على الأقل</p>
      </div>

      {step === "new-password" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-gray-700">تأكيد كلمة السر *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type="password"
              placeholder="أعد إدخال كلمة السر الجديدة"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 text-center border-green-200 focus:border-green-500 focus:ring-green-500"
              required
              minLength={8}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">يجب أن تكون 8 أحرف على الأقل</p>
        </div>
      )}

      <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800" disabled={loading}>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            {step === "password" ? "جاري تسجيل الدخول..." : "جاري إنشاء كلمة المرور..."}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {step === "password" ? "تسجيل الدخول" : "إنشاء كلمة المرور"}
            <ArrowRight className="h-5 w-5" />
          </div>
        )}
      </Button>

      <Button 
        type="button" 
        variant="outline" 
        onClick={handleBackToPhone}
        className="w-full border-green-200 text-green-700 hover:bg-green-50"
      >
        <ArrowLeft className="h-4 w-4 ml-2" />
        العودة لتغيير رقم الهاتف
      </Button>
    </form>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              {step === "phone" ? (
                <Phone className="h-12 w-12 text-green-600" />
              ) : step === "password" ? (
                <UserCheck className="h-12 w-12 text-green-600" />
              ) : (
                <UserPlus className="h-12 w-12 text-green-600" />
              )}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">سنابل الخير</h1>
          <p className="text-gray-600">
            {step === "phone" && "تسجيل دخول العميل"}
            {step === "password" && `مرحباً ${customerName || "عميلنا العزيز"}`}
            {step === "new-password" && `مرحباً ${customerName || "عميلنا العزيز"}`}
          </p>
        </div>

        <Card className="shadow-xl border-green-100 bg-gradient-to-br from-white to-green-50">
          <CardHeader>
            <CardTitle className="text-center text-xl text-gray-800">
              {step === "phone" && "أدخلي رقم الهاتف"}
              {step === "password" && "أدخلي كلمة المرور"}
              {step === "new-password" && "أنشئي كلمة مرور جديدة"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {step === "phone" && "سنقوم بالتحقق من أنك عميل مسجل معنا"}
              {step === "password" && "أدخلي كلمة المرور الخاصة بك للوصول إلى حسابك"}
              {step === "new-password" && "أدخلي كلمة مرور قوية لحماية حسابك"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? renderPhoneStep() : renderPasswordStep()}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                ليس لديك حساب؟ تواصل مع الإدارة لإنشاء حساب جديد
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                <Leaf className="h-4 w-4" />
                العودة للصفحة الرئيسية
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
