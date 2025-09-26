"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Menu, Plus, Search, Edit, Trash2, Users, DollarSign, TrendingUp, UserPlus, Wallet, Eye, Lock } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
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

interface CustomerListResponse {
  customers: Customer[]
  total: number
  page: number
  page_size: number
  total_pages: number
  }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [hasBalanceFilter, setHasBalanceFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [walletAmount, setWalletAmount] = useState("")
  const [walletAction, setWalletAction] = useState<"add" | "subtract">("add")
  
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Redirect non-admin/cashier users
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'cashier') {
      router.push('/admin/invoices')
    }
  }, [user, router])

  useEffect(() => {
    fetchCustomers()
  }, [currentPage, pageSize, searchTerm, hasBalanceFilter])

    const fetchCustomers = async () => {
      try {
        setLoading(true)
      const response = await apiClient.getCustomers({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
        has_balance: hasBalanceFilter === "all" ? undefined : hasBalanceFilter === "yes"
      })
      
      console.log('Customers API response:', response)
      
      if (response && typeof response === 'object') {
        if (response.customers && Array.isArray(response.customers)) {
          setCustomers(response.customers)
          setTotalPages(response.total_pages || 1)
          setTotalCustomers(response.total || 0)
        } else if (Array.isArray(response)) {
          setCustomers(response)
          setTotalPages(1)
          setTotalCustomers(response.length)
        } else {
          setCustomers([])
          setTotalPages(1)
          setTotalCustomers(0)
        }
      } else {
        setCustomers([])
        setTotalPages(1)
        setTotalCustomers(0)
      }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل بيانات العملاء",
          variant: "destructive",
        })
      setCustomers([])
      setTotalPages(1)
      setTotalCustomers(0)
      } finally {
        setLoading(false)
      }
    }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (value: string) => {
    setHasBalanceFilter(value)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size))
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-EG", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleCreateCustomer = () => {
    router.push('/admin/customers/new')
  }

  const handleEditCustomer = (customerId: string) => {
    router.push(`/admin/customers/edit/${customerId}`)
  }

  const handleChangePassword = (customerId: string) => {
    router.push(`/admin/customers/edit/${customerId}#password`)
  }

  const handleDeleteCustomer = (customerId: string) => {
    setCustomerToDelete(customerId)
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return

    try {
      await apiClient.deleteCustomer(customerToDelete)
      setCustomers(customers.filter(c => c.id !== customerToDelete))
      setTotalCustomers(totalCustomers - 1)
      
      toast({
        title: "تم الحذف",
        description: "تم حذف العميل بنجاح",
      })
    } catch (error) {
      console.error('Failed to delete customer:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف العميل",
        variant: "destructive",
      })
    } finally {
      setShowDeleteConfirmation(false)
      setCustomerToDelete(null)
    }
  }

  const handleWalletUpdate = (customer: Customer) => {
    setSelectedCustomer(customer)
    setWalletAmount("")
    setWalletAction("add")
    setShowWalletModal(true)
  }

  const confirmWalletUpdate = async () => {
    if (!selectedCustomer || !walletAmount) return

    try {
      const amount = parseFloat(walletAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال مبلغ صحيح",
          variant: "destructive",
        })
        return
      }

      const newBalance = walletAction === "add" 
        ? selectedCustomer.wallet_balance + amount
        : Math.max(0, selectedCustomer.wallet_balance - amount)

      await apiClient.updateCustomerWallet(selectedCustomer.id, amount, walletAction as 'add' | 'deduct')
      
      // Update local state
      setCustomers(customers.map(c => 
        c.id === selectedCustomer.id 
          ? { ...c, wallet_balance: newBalance }
          : c
      ))

      toast({
        title: "تم التحديث",
        description: `تم ${walletAction === "add" ? "إضافة" : "خصم"} ${amount.toFixed(2)} جنيه من محفظة ${selectedCustomer.name}`,
      })

      setShowWalletModal(false)
      setSelectedCustomer(null)
      setWalletAmount("")
    } catch (error) {
      console.error('Failed to update wallet:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث رصيد المحفظة",
        variant: "destructive",
      })
    }
  }

  // Calculate stats
  const customersWithBalance = customers.filter(c => c.wallet_balance > 0).length
  const totalWalletBalance = customers.reduce((sum, c) => sum + c.wallet_balance, 0)
  const newCustomers = customers.filter(c => {
    const createdDate = new Date(c.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return createdDate > thirtyDaysAgo
  }).length

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">العملاء 👥</h2>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            onClick={handleCreateCustomer}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <UserPlus className="ml-2 h-4 w-4" />
              عميل جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalCustomers}</div>
            <p className="text-xs text-pink-500">جميع العملاء</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">عملاء برصيد</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{customersWithBalance}</div>
            <p className="text-xs text-purple-500">لديهم رصيد في المحفظة</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">عملاء جدد</CardTitle>
            <UserPlus className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{newCustomers}</div>
            <p className="text-xs text-rose-500">آخر 30 يوم</p>
          </CardContent>
        </Card>

        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي الرصيد</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalWalletBalance.toFixed(2)} جنيه</div>
            <p className="text-xs text-pink-500">في جميع المحافظ</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">البحث والتصفية 🔍</CardTitle>
          <CardDescription className="text-gray-600">ابحث في العملاء وصف حسب الرصيد</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">البحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث في العملاء..."
              value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
              className="pr-10"
            />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">حالة الرصيد</label>
              <Select value={hasBalanceFilter} onValueChange={handleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العملاء</SelectItem>
                  <SelectItem value="yes">لديهم رصيد</SelectItem>
                  <SelectItem value="no">بدون رصيد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">عدد النتائج</label>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setHasBalanceFilter("all")
                  setCurrentPage(1)
                }}
                className="w-full"
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-pink-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">قائمة العملاء 👥</CardTitle>
          <CardDescription className="text-gray-600">
            {customers.length} عميل من أصل {totalCustomers} - الصفحة {currentPage} من {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <span className="mr-3 text-gray-600">جاري التحميل...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد عملاء</h3>
              <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء عميل جديد</p>
              <div className="mt-6">
                <Button 
                  onClick={handleCreateCustomer}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <UserPlus className="ml-2 h-4 w-4" />
                  إنشاء عميل
              </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-pink-50">
                    <TableHead className="text-right text-pink-700">الاسم</TableHead>
                    <TableHead className="text-right text-pink-700">الهاتف</TableHead>
                    <TableHead className="text-right text-pink-700">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right text-pink-700">رصيد المحفظة</TableHead>
                    <TableHead className="text-right text-pink-700">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right text-pink-700">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-pink-50">
                      <TableCell className="font-medium text-right">{customer.name}</TableCell>
                      <TableCell className="text-right">{customer.phone}</TableCell>
                      <TableCell className="text-right">{customer.email || 'غير محدد'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold ${customer.wallet_balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {customer.wallet_balance.toFixed(2)} جنيه
                          </span>
                          {customer.wallet_balance > 0 && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              لديه رصيد
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatDate(customer.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWalletUpdate(customer)}
                            className="text-blue-600 hover:text-blue-700"
                            title="تحديث المحفظة"
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleChangePassword(customer.id)}
                            className="text-purple-600 hover:text-purple-700"
                            title="تغيير كلمة السر"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCustomer(customer.id)}
                            className="text-green-600 hover:text-green-700"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="text-red-600 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCustomers)} من {totalCustomers} عميل
                </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = []
                    const maxVisiblePages = 5
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                    
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          className={currentPage === i ? "bg-pink-600 hover:bg-pink-700" : ""}
                        >
                          {i}
                        </Button>
                      )
                    }
                    return pages
                  })()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                هل أنت متأكد من حذف هذا العميل؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
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
                onClick={confirmDeleteCustomer}
              >
                حذف
            </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Update Modal */}
      {showWalletModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold">تحديث رصيد المحفظة</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">العميل: {selectedCustomer.name}</p>
                <p className="text-sm text-gray-600">الرصيد الحالي: {selectedCustomer.wallet_balance.toFixed(2)} جنيه</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">العملية</label>
                <Select value={walletAction} onValueChange={(value: "add" | "subtract") => setWalletAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">إضافة رصيد</SelectItem>
                    <SelectItem value="subtract">خصم رصيد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">المبلغ</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowWalletModal(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={confirmWalletUpdate}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                تحديث
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}