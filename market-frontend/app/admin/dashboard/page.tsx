"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Palette, Receipt, Users, AlertTriangle, Plus, DollarSign, Sparkles } from "lucide-react"
import Link from "next/link"
import apiClient from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface DashboardStats {
  totalSales: number
  totalProducts: number
  totalInvoices: number
  totalCustomers: number
  todaySales: number
  weekSales: number
  monthSales: number
}

  // Arabic month names
  const arabicMonths = {
    'January': 'يناير',
    'February': 'فبراير',
    'March': 'مارس',
    'April': 'أبريل',
    'May': 'مايو',
    'June': 'يونيو',
    'July': 'يوليو',
    'August': 'أغسطس',
    'September': 'سبتمبر',
    'October': 'أكتوبر',
    'November': 'نوفمبر',
    'December': 'ديسمبر'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const englishDate = date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const arabicDate = englishDate.replace(/(\w+)/, (match) => {
      return arabicMonths[match as keyof typeof arabicMonths] || match
    })
    const time = date.toLocaleTimeString("ar-SA", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    return `${arabicDate}، ${time}`
  }

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({})
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  // If cashier, redirect to invoices
  useEffect(() => {
    if (!authLoading && user?.role === 'cashier') {
      router.replace('/admin/invoices')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Load dashboard stats
        try {
          const dashboardStats = await apiClient.getDashboardStats()
          setStats(dashboardStats || {})
        } catch (error) {
          console.log('Dashboard stats not available, using default values')
          setStats({})
        }
        
        // Load recent invoices
        try {
          const invoicesResponse = await apiClient.getInvoices()
          const invoicesData = invoicesResponse?.invoices || invoicesResponse || []
          setRecentInvoices(Array.isArray(invoicesData) ? invoicesData.slice(0, 5) : [])
        } catch (error) {
          console.log('Recent invoices not available')
          setRecentInvoices([])
        }
        
        // Load low stock products
        try {
          const lowStockResponse = await apiClient.getLowStockProducts()
          const lowStockProducts = lowStockResponse?.products || lowStockResponse || []
          setLowStockProducts(Array.isArray(lowStockProducts) ? lowStockProducts : [])
        } catch (error) {
          console.log('Low stock products not available')
          setLowStockProducts([])
        }
        
        // Load sales trend data
        try {
          const salesTrend = await apiClient.getSalesTrend(7)
          const salesData = salesTrend?.data || salesTrend || []
          setSalesData(Array.isArray(salesData) ? salesData : [])
        } catch (error) {
          console.log('Sales trend not available')
          setSalesData([])
        }
        
        // Load category distribution
        try {
          const categoryDist = await apiClient.getCategoryDistribution()
          const categoryData = categoryDist?.categories || categoryDist || []
          setCategoryData(Array.isArray(categoryData) ? categoryData : [])
        } catch (error) {
          console.log('Category distribution not available')
          setCategoryData([])
        }
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل بيانات لوحة التحكم",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardData()
  }, [])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">لوحة التحكم 💄</h2>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Link href="/admin/invoices/new">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Plus className="ml-2 h-4 w-4" />
              فاتورة جديدة
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.sales?.total?.toFixed(2) || '0.00'} جنيه</div>
            <p className="text-xs text-pink-500">جميع الأوقات</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">المنتجات</CardTitle>
            <Palette className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.products?.total || 0}</div>
            <p className="text-xs text-purple-500">إجمالي المنتجات</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">الفواتير</CardTitle>
            <Receipt className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.invoices?.total_invoices || 0}</div>
            <p className="text-xs text-rose-500">إجمالي الفواتير</p>
          </CardContent>
        </Card>

        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">العملاء</CardTitle>
            <Users className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.customers?.total_customers || 0}</div>
            <p className="text-xs text-pink-500">إجمالي العملاء</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Period Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">مبيعات اليوم</CardTitle>
            <TrendingUp className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.sales?.today?.toFixed(2) || '0.00'} جنيه</div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">مبيعات الأسبوع</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.sales?.week?.toFixed(2) || '0.00'} جنيه</div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">مبيعات الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.sales?.month?.toFixed(2) || '0.00'} جنيه</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {/* <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-pink-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-800">اتجاه المبيعات 💄</CardTitle>
            <CardDescription className="text-gray-600">مبيعات آخر 7 أيام</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} جنيه`, "المبيعات"]} />
                <Bar dataKey="sales" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-purple-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-800">توزيع الفئات ✨</CardTitle>
            <CardDescription className="text-gray-600">المنتجات حسب الفئة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#a855f7"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div> */}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="ml-2 h-5 w-5" />
              تنبيه نفاد المخزون ⚠️
            </CardTitle>
            <CardDescription className="text-orange-700">{lowStockProducts.length} منتج على وشك النفاد</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge key={product.id} variant="outline" className="text-orange-800 border-orange-300">
                  {product.name} ({product.quantity} متبقي)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      <Card className="border-pink-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">الفواتير الأخيرة 💄</CardTitle>
          <CardDescription className="text-gray-600">آخر 5 فواتير</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-pink-50">
                <TableHead className="text-right text-pink-700">رقم الفاتورة</TableHead>
                <TableHead className="text-right text-pink-700">العميل</TableHead>
                <TableHead className="text-right text-pink-700">التاريخ</TableHead>
                <TableHead className="text-right text-pink-700">المبلغ</TableHead>
                <TableHead className="text-right text-pink-700">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-pink-50">
                  <TableCell className="font-medium text-right">{invoice.id}</TableCell>
                  <TableCell className="text-right">{invoice.customer_name}</TableCell>
                  <TableCell className="text-right">{formatDate(invoice.created_at)}</TableCell>
                  <TableCell className="text-right font-semibold text-pink-600">{invoice.total.toFixed(2)} جنيه</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={invoice.status === "Paid" ? "default" : "secondary"} className="bg-pink-100 text-pink-700 border-pink-200">
                      {invoice.status === "Paid" ? "مدفوع" : invoice.status === "Pending" ? "معلق" : "جزئي"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
