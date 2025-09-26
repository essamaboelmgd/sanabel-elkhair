"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Menu } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Trash2, Printer, Send, Edit, Receipt, DollarSign, TrendingUp, Check, AlertTriangle } from "lucide-react"
import QRCode from 'qrcode'
import Link from "next/link"
import { useRouter } from "next/navigation"
import apiClient from "@/lib/api"

interface Invoice {
  id: string
  customer_id: string
  customer_name: string
  total: number
  status: "Paid" | "Pending" | "Partial"
  notes?: string
  created_at: string
  updated_at?: string
  invoice_items: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
  }>
}

export default function InvoicesPage() {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [invoiceToDeleteInfo, setInvoiceToDeleteInfo] = useState<Invoice | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const englishDate = date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const time = date.toLocaleTimeString("en-US", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    return `${englishDate}، ${time}`
  }

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true)
        const invoicesResponse = await apiClient.getInvoices()
        const invoicesData = invoicesResponse.invoices || invoicesResponse || []
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل بيانات الفواتير",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [])

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_id.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId)
    if (!inv) return

    // Block deletion if invoice is paid
    if (inv.status === 'Paid') {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكن حذف فاتورة مدفوعة',
        variant: 'destructive',
      })
      return
    }

    setInvoiceToDelete(invoiceId)
    setInvoiceToDeleteInfo(inv)
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return

    try {
      // Fetch full invoice details first for info and potential stock rollback
      const fetched = await apiClient.getInvoice(invoiceToDelete)
      const invoice: any = fetched?.invoice || fetched

      // If unpaid (explicitly Pending or Partial), return items to stock by adding back quantities
      const invoiceStatus = String(invoice?.status || '').toLowerCase()
      const shouldRollbackStock = invoiceStatus === 'pending' || invoiceStatus === 'partial'
      if (invoice && shouldRollbackStock) {
        const items: Array<any> = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : []
        for (const it of items) {
          try {
            if (!it?.product_id || !it?.quantity) continue
            const product = await apiClient.getProduct(it.product_id)
            const currentQty = product?.quantity ?? product?.product?.quantity
            if (typeof currentQty === 'number') {
              const newQty = Math.max(0, currentQty + Number(it.quantity))
              const productIdForUpdate = product?.id || product?._id || it.product_id
              await apiClient.updateProductStock(productIdForUpdate, newQty)
            }
          } catch (e) {
            console.warn('Rollback stock failed for item:', it?.product_id, e)
          }
        }
      }

      // Proceed with delete
      await apiClient.deleteInvoice(invoiceToDelete)

      // Update UI list
      const updatedInvoices = invoices.filter((inv) => inv.id !== invoiceToDelete)
      setInvoices(updatedInvoices)

      // Build enriched toast message
      const customerName = invoice?.customer_name || 'عميل'
      const amount = typeof invoice?.total === 'number' ? invoice.total.toFixed(2) : '0.00'
      const timeText = invoice?.created_at ? new Date(invoice.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''

      toast({
        title: 'تم الحذف',
        description: `فاتورة ${invoiceToDelete} - العميل: ${customerName} - المبلغ: ${amount} جنيه - الوقت: ${timeText}`,
      })
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الفاتورة',
        variant: 'destructive',
      })
    } finally {
      setShowDeleteConfirmation(false)
      setInvoiceToDelete(null)
      setInvoiceToDeleteInfo(null)
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await apiClient.updateInvoiceStatus(invoiceId, 'Paid')
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv))
      toast({ title: 'تم', description: 'تم تعليم الفاتورة كمدفوعة' })
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error)
      toast({ title: 'خطأ', description: 'فشل في تحديث حالة الفاتورة', variant: 'destructive' })
    }
  }

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const fetched = await apiClient.getInvoice(invoiceId)
      const invoice = fetched?.invoice || fetched

      if (!invoice) {
        toast({ title: 'خطأ', description: 'تعذر جلب بيانات الفاتورة', variant: 'destructive' })
        return
      }

      const rawItems = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : []
      // Enrich items with product names from API when available
      const items = await Promise.all(
        rawItems.map(async (it: any) => {
          let productName: string | undefined = it.product_name
          try {
            if (!productName && it.product_id) {
              const prod = await apiClient.getProduct(it.product_id)
              productName = prod?.name || prod?.product?.name
            }
          } catch (e) {
            // ignore and fallback to product_id
          }
          return { ...it, _productName: productName }
        })
      )
      const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.quantity)), 0)
      const discountAmount = 0
      const walletPayment = 0
      const total = subtotal - discountAmount

      const qrCodeDataURL = await QRCode.toDataURL('https://www.sanabelkhair.com/', {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>فاتورة ${invoice.id} - سنابل</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
            <style>
              @page { size: 72mm auto; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 72mm; margin: 0 auto; }
              body { font-family: 'Cairo','Amiri','Scheherazade New','Arial',sans-serif; background: white; padding: 0; direction: rtl; text-align: right; font-size: 12px; color: #333; line-height: 1.5; font-weight: 500; }
              .invoice-container { width: 72mm; max-width: 72mm; margin: 0 auto; background: white; padding: 4mm; font-size: 11px; }
              .header { text-align: center; margin-bottom: 2mm; border-bottom: 2px solid #ff69b4; padding-bottom: 2mm; }
              .logo { font-size: 20px; font-weight: 900; color: #ff69b4; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
              .tagline { font-size: 9px; color: #000; }
              .invoice-title { font-size: 14px; font-weight: 700; color: #333; }
              .customer-info { margin-bottom: 1mm; padding: 3mm; background: #fff5f8; border-radius: 2mm; border-right: 3px solid #ff69b4; }
              .customer-row { display: flex; justify-content: space-between; margin-bottom: 1.5mm; font-size: 10px; }
              .customer-label { font-weight: 600; color: #ff69b4; }
              .customer-value { color: #000; font-size: 10px; }
              .date-time { text-align: center; margin-bottom: 2mm; font-size: 9px; color: #000; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
              .products-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 9px; }
              .products-table th { background: #ff69b4; color: black; padding: 2mm 1mm; font-weight: 700; text-align: center; font-size: 10px; }
              .products-table td { padding: 1.5mm 1mm; text-align: center; border-bottom: 1px solid #000; font-size: 10px; font-weight: 700; }
              .product-name { text-align: right; font-weight: 700; font-size: 12px; }
              .totals-section { margin-bottom: 5mm; font-size: 10px; }
              .total-row { display: flex; justify-content: space-between; padding: 1.2mm 0; border-bottom: 1px solid #eee; font-weight: 700; font-size: 12px; }
              .total-row.grand-total { border-top: 2px solid #ff69b4; border-bottom: 2px solid #ff69b4; font-weight: 700; font-size: 12px; color: #ff69b4; padding: 2mm 0; }
              .footer { text-align: center; padding: 3mm 0; border-top: 2px solid #ff69b4; font-size: 9px; color: #000; }
              .thank-you { font-size: 11px; font-weight: 600; color: #ff69b4; margin-bottom: 3mm; }
              .contact-info { font-size: 10px; color: #000; margin-bottom: -5mm; }
              .qr-code-area { text-align: center; margin-top: 3mm; padding: 2mm; border: 1px dashed #ccc; background: #f9f9f9; border-radius: 2mm; }
              .qr-code-area img { width: 100px; height: 100px; margin: 0 auto; display: block; }
              .qr-code-text { font-size: 8px; color: #999; margin-top: 2mm; }
              @media print { html, body { width: 72mm; margin: 0 auto !important; padding: 0; } body { display: flex; justify-content: center; } .invoice-container { width: 72mm; max-width: 72mm; margin: 0 auto !important; padding: 3mm; } }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <div class="logo">🌸 سنابل 🌸</div>
                <div class="tagline">ميك أب & عطور حريمي</div>
                <div class="invoice-title">فاتورة مبيعات</div>
              </div>

              <div class="customer-info">
                <div class="customer-row"><span class="customer-label">العميل:</span><span class="customer-value">${invoice.customer_name || ''}</span></div>
                <div class="customer-row"><span class="customer-label">رقم الفاتورة:</span><span class="customer-value">${invoice.id}</span></div>
              </div>

              <div class="date-time">
                التاريخ: ${new Date(invoice.created_at || '').toLocaleDateString('en-US')}<br>
                الوقت: ${new Date(invoice.created_at || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>

              <table class="products-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((it: any) => `
                    <tr>
                      <td class="product-name">${it._productName || it.product_name || it.productId || it.product_id || 'منتج'}</td>
                      <td>${it.quantity}</td>
                      <td>${Number(it.price).toFixed(2)}</td>
                      <td>${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="totals-section">
                <div class="total-row"><span>المجموع قبل الخصم:</span><span>${subtotal.toFixed(2)} جنيه</span></div>
                <div class="total-row"><span>المجموع بعد الخصم:</span><span>${total.toFixed(2)} جنيه</span></div>
                ${walletPayment > 0 ? `<div class="total-row"><span>الدفع من المحفظة:</span><span>-${walletPayment.toFixed(2)} جنيه</span></div>` : ''}
                <div class="total-row grand-total"><span>الإجمالي:</span><span>${(total - walletPayment).toFixed(2)} جنيه</span></div>
              </div>

              <div class="footer">
                <div class="thank-you">🌸 شكراً لتعاملكم معنا 🌸</div>
                <div class="contact-info">هاتف: 0123456789 | واتساب: 0123456789<br>العنوان: شارع الرئيسي، المدينة<br>ساعات العمل: 9 ص - 10 م</div>
              </div>

              <div class="qr-code-area">
                <img src="${qrCodeDataURL}" alt="QR Code" />
                <div class="qr-code-text">سنابل - ميك أب & عطور حريمي</div>
              </div>
            </div>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          try { printWindow.focus(); printWindow.print() } catch (e) { console.error('Print failed:', e) }
        }, 800)
      })
    } catch (error) {
      console.error('Failed to print invoice:', error)
      toast({ title: 'خطأ', description: 'فشل في طباعة الفاتورة', variant: 'destructive' })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "default"
      case "Pending":
        return "secondary"
      case "Partial":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700 border-green-200"
      case "Pending":
        return "bg-red-100 text-red-700 border-red-200"
      case "Partial":
        return "bg-orange-100 text-orange-700 border-orange-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "Paid":
        return "مدفوع"
      case "Pending":
        return "معلق"
      case "Partial":
        return "جزئي"
      default:
        return status
    }
  }

  // Calculate stats
  const totalInvoices = invoices.length
  const paidInvoices = invoices.filter(inv => inv.status === "Paid").length
  const pendingInvoices = invoices.filter(inv => inv.status === "Pending").length
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">الفواتير 💄</h2>
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
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي الفواتير</CardTitle>
            <Receipt className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalInvoices}</div>
            <p className="text-xs text-pink-500">جميع الفواتير</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">الفواتير المدفوعة</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{paidInvoices}</div>
            <p className="text-xs text-purple-500">مدفوع بالكامل</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">الفواتير المعلقة</CardTitle>
            <Receipt className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{pendingInvoices}</div>
            <p className="text-xs text-rose-500">في انتظار الدفع</p>
          </CardContent>
        </Card>

        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalRevenue.toFixed(2)} جنيه</div>
            <p className="text-xs text-pink-500">جميع الفواتير</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">البحث والتصفية 🔍</CardTitle>
          <CardDescription className="text-gray-600">ابحث في الفواتير وصف حسب الحالة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث في الفواتير..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">حالة الفاتورة</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفواتير</SelectItem>
                  <SelectItem value="Paid">مدفوع</SelectItem>
                  <SelectItem value="Pending">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
                className="w-full"
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-pink-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">قائمة الفواتير 💄</CardTitle>
          <CardDescription className="text-gray-600">
            {filteredInvoices.length} فاتورة من أصل {invoices.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <span className="mr-3 text-gray-600">جاري التحميل...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد فواتير</h3>
              <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء فاتورة جديدة</p>
              <div className="mt-6">
                <Link href="/admin/invoices/new">
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    <Plus className="ml-2 h-4 w-4" />
                    إنشاء فاتورة
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-pink-50">
                    <TableHead className="text-right text-pink-700">رقم الفاتورة</TableHead>
                    <TableHead className="text-right text-pink-700">العميل</TableHead>
                    <TableHead className="text-right text-pink-700">التاريخ</TableHead>
                    <TableHead className="text-right text-pink-700">المبلغ</TableHead>
                    <TableHead className="text-right text-pink-700">الحالة</TableHead>
                    <TableHead className="text-right text-pink-700">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-pink-50">
                      <TableCell className="font-medium text-right">{invoice.id}</TableCell>
                      <TableCell className="text-right">{invoice.customer_name}</TableCell>
                      <TableCell className="text-right">{formatDate(invoice.created_at)}</TableCell>
                      <TableCell className="text-right font-semibold text-pink-600">{invoice.total.toFixed(2)} جنيه</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={getStatusBadgeVariant(invoice.status)} 
                          className={getStatusBadgeStyle(invoice.status)}
                        >
                          {getStatusText(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            disabled={invoice.status === 'Paid'}
                            className="text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Link href={`/admin/invoices/edit/${invoice.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">تأكيد حذف الفاتورة</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                هل أنت متأكد من حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
              <div className="grid gap-2 text-sm bg-gray-50 p-3 rounded">
                {invoiceToDelete && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">معرف الفاتورة:</span>
                    <span className="font-mono text-gray-800">{invoiceToDelete}</span>
                  </div>
                )}
                {invoiceToDeleteInfo && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">اسم العميل:</span>
                      <span className="font-semibold text-gray-800">{invoiceToDeleteInfo.customer_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">المبلغ:</span>
                      <span className="font-semibold text-pink-600">{invoiceToDeleteInfo.total.toFixed(2)} جنيه</span>
                    </div>
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-1">
                      ملاحظة: إذا كانت الفاتورة غير مدفوعة سيتم إعادة كميات المنتجات إلى المخزون تلقائياً.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setInvoiceToDelete(null)
                }}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteInvoice}
              >
                حذف
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
