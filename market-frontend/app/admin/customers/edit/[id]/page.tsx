"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, User, Phone, Mail, Wallet, Save, Trash2, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import apiClient from "@/lib/api"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  wallet_balance: number
  first_login: boolean
  created_at: string
  updated_at?: string
}

export default function EditCustomerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [walletBalance, setWalletBalance] = useState("0")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  useEffect(() => {
    // Check if URL has password hash
    if (window.location.hash === '#password') {
      setShowPasswordSection(true)
    }
  }, [])

  const fetchCustomer = async () => {
    try {
      setInitialLoading(true)
      const response = await apiClient.getCustomer(customerId)
      console.log('Customer data:', response)
      
      const customerData = response.customer || response
      setCustomer(customerData)
      setName(customerData.name || "")
      setPhone(customerData.phone || "")
      setEmail(customerData.email || "")
      setWalletBalance(customerData.wallet_balance?.toString() || "0")
    } catch (error) {
      console.error('Failed to fetch customer:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات العميل",
        variant: "destructive",
      })
      router.push("/admin/customers")
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const customerData = {
        id: customerId,
        name,
        phone,
        email: email || undefined,
        wallet_balance: parseFloat(walletBalance) || 0,
      }
      
      await apiClient.updateCustomer(customerData)
      
      toast({
        title: "تم تحديث العميل بنجاح",
        description: `تم تحديث بيانات العميل ${name}`,
      })
      
      router.push("/admin/customers")
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast({
        title: "خطأ في تحديث العميل",
        description: error.message || "حدث خطأ أثناء تحديث العميل",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await apiClient.deleteCustomer(customerId)
      
      toast({
        title: "تم حذف العميل بنجاح",
        description: `تم حذف العميل ${name}`,
      })
      
      router.push("/admin/customers")
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast({
        title: "خطأ في حذف العميل",
        description: error.message || "حدث خطأ أثناء حذف العميل",
        variant: "destructive",
      })
    } finally {
      setShowDeleteConfirmation(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة السر وتأكيدها",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة السر غير متطابقة",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "خطأ",
        description: "كلمة السر يجب أن تكون 8 أحرف على الأقل",
        variant: "destructive",
      })
      return
    }

    try {
      setPasswordLoading(true)
      await apiClient.setCustomerPasswordById(customerId, newPassword)
      
      toast({
        title: "تم تغيير كلمة السر",
        description: "تم تغيير كلمة سر العميل بنجاح",
      })
      
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordSection(false)
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast({
        title: "خطأ في تغيير كلمة السر",
        description: error.message || "حدث خطأ أثناء تغيير كلمة السر",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900">العميل غير موجود</h3>
          <p className="text-gray-500">لم يتم العثور على العميل المطلوب</p>
          <Link href="/admin/customers">
            <Button className="mt-4">العودة للعملاء</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Link href="/admin/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة للعملاء
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">تعديل العميل ✏️</h2>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirmation(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="ml-2 h-4 w-4" />
            حذف العميل
          </Button>
        </div>
      </div>

      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <User className="h-5 w-5" />
            بيانات العميل
          </CardTitle>
          <CardDescription className="text-gray-600">
            تعديل بيانات العميل: {customer.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">الاسم الكامل *</Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="أدخل اسم العميل"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">رقم الهاتف *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    placeholder="أدخل رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="أدخل البريد الإلكتروني (اختياري)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance" className="text-gray-700">رصيد المحفظة</Label>
                <div className="relative">
                  <Wallet className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <p className="text-xs text-gray-500">الرصيد الحالي في محفظة العميل</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">معلومات إضافية</h4>
              <div className="grid gap-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>تاريخ الإنشاء:</span>
                  <span>{new Date(customer.created_at).toLocaleDateString("ar-EG")}</span>
                </div>
                <div className="flex justify-between">
                  <span>آخر تحديث:</span>
                  <span>{customer.updated_at ? new Date(customer.updated_at).toLocaleDateString("ar-EG") : "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span>حالة تسجيل الدخول:</span>
                  <span className={customer.first_login ? "text-orange-600" : "text-green-600"}>
                    {customer.first_login ? "لم يسجل دخول بعد" : "سجل دخول من قبل"}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div id="password" className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  تغيير كلمة السر
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                >
                  {showPasswordSection ? "إخفاء" : "تغيير كلمة السر"}
                </Button>
              </div>

              {showPasswordSection && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-700">كلمة السر الجديدة *</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="أدخل كلمة السر الجديدة"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">يجب أن تكون 6 أحرف على الأقل</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700">تأكيد كلمة السر *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="أعد إدخال كلمة السر الجديدة"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordSection(false)
                        setNewPassword("")
                        setConfirmPassword("")
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={passwordLoading || !newPassword || !confirmPassword}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      {passwordLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                          جاري التغيير...
                        </>
                      ) : (
                        <>
                          <Lock className="ml-2 h-4 w-4" />
                          تغيير كلمة السر
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t">
              <Link href="/admin/customers">
                <Button variant="outline" type="button">
                  إلغاء
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={loading || !name || !phone}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">تأكيد حذف العميل</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                هل أنت متأكد من حذف العميل <strong>{customer.name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">
                  ⚠️ سيتم حذف جميع البيانات المرتبطة بهذا العميل بما في ذلك الفواتير والمحفظة.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                حذف نهائياً
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
