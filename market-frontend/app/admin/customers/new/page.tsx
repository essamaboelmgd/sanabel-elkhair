"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, UserPlus, Phone, User, Wallet, Save } from "lucide-react"
import Link from "next/link"
import apiClient from "@/lib/api"

export default function NewCustomerPage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [initialBalance, setInitialBalance] = useState("0")
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First create the user account
      const userData = {
        name,
        phone,
        password: "123456", // Default password
        role: "customer"
      }
      
      console.log('Creating user with data:', userData)
      
      const userResponse = await apiClient.register(userData)
      
      // Then create the customer profile with wallet
      const customerData = {
        name,
        phone,
        email: email || undefined,
        wallet_balance: parseFloat(initialBalance) || 0,
        is_active: true
      }
      
      const customerResponse = await apiClient.createCustomer(customerData)
      
      toast({
        title: "تم إنشاء العميل بنجاح",
        description: `تم إنشاء حساب للعميل ${name} برقم الهاتف ${phone}`,
      })
      
      router.push("/admin/customers")
    } catch (error: any) {
      console.error('Error creating customer:', error)
      toast({
        title: "خطأ في إنشاء العميل",
        description: error.message || "حدث خطأ أثناء إنشاء العميل",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">عميل جديد ✨</h2>
        </div>
      </div>

      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            بيانات العميل الجديد
          </CardTitle>
          <CardDescription className="text-gray-600">
            أدخل بيانات العميل لإنشاء حساب جديد
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
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل البريد الإلكتروني (اختياري)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance" className="text-gray-700">الرصيد الابتدائي</Label>
                <div className="relative">
                  <Wallet className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <p className="text-xs text-gray-500">سيتم إضافة هذا المبلغ لمحفظة العميل</p>
              </div>
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
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    إنشاء العميل
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}