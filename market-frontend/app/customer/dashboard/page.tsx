"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wallet, Receipt, Eye, LogOut, Heart, Printer, Sparkles } from "lucide-react"
import QRCode from 'qrcode'
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

export default function CustomerDashboard() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [loadingData, setLoadingData] = useState(false)
  const [productNames, setProductNames] = useState<Record<string, string>>({})

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/customer/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      const fetchCustomerData = async () => {
        setLoadingData(true)
        try {
          console.log('Fetching data for user:', user)
          
          // Load customer's invoices using the correct API endpoint
          console.log('Fetching invoices for user ID:', user.id, 'Type:', typeof user.id)
          
          // Try both endpoints to see which one works
          let customerInvoices = []
          try {
            customerInvoices = await apiClient.getCustomerInvoices(user.id)
            console.log('getCustomerInvoices result:', customerInvoices)
          } catch (error) {
            console.log('getCustomerInvoices failed:', error)
            try {
              customerInvoices = await apiClient.getMyInvoices(user.id)
              console.log('getMyInvoices result:', customerInvoices)
            } catch (error2) {
              console.log('getMyInvoices also failed:', error2)
            }
          }
          
          console.log('Final invoices received:', customerInvoices)
          console.log('Invoices type:', typeof customerInvoices, 'Is array:', Array.isArray(customerInvoices))
          if (customerInvoices && customerInvoices.length > 0) {
            console.log('First invoice sample:', customerInvoices[0])
          } else {
            console.log('No invoices found or empty result')
          }
          setInvoices(Array.isArray(customerInvoices) ? customerInvoices : [])

          // Load customer data including wallet balance
          const customerData = await apiClient.getMyProfile()
          console.log('Customer profile received:', customerData)
          if (customerData) {
            setWalletBalance(customerData.wallet_balance || 0)
          } else {
            console.warn('No customer data received')
            setWalletBalance(0)
          }
        } catch (error) {
          console.error('Failed to fetch customer data:', error)
          // Set empty arrays/values on error to prevent crashes
          setInvoices([])
          setWalletBalance(0)
        } finally {
          setLoadingData(false)
        }
      }
      fetchCustomerData()
    }
  }, [user])

  // When an invoice is selected, fetch product names for items missing names
  useEffect(() => {
    const fetchMissingProductNames = async () => {
      if (!selectedInvoice) return
      const items = selectedInvoice.invoice_items || []
      const missingIds = items
        .map((it) => it.product_id)
        .filter((id) => id && !productNames[id])

      if (missingIds.length === 0) return

      const updates: Record<string, string> = {}
      for (const id of missingIds) {
        try {
          const prod = await apiClient.getProduct(id)
          const name = prod?.name || prod?.product?.name
          if (name) updates[id] = name
        } catch (e) {
          // ignore if fails
        }
      }
      if (Object.keys(updates).length > 0) {
        setProductNames((prev) => ({ ...prev, ...updates }))
      }
    }
    fetchMissingProductNames()
  }, [selectedInvoice])

  const handleLogout = () => {
    logout()
    router.push("/customer/login")
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    // Calculate invoice totals
    // Enrich items with product names from API when available
    const enrichedItems = await Promise.all(
      invoice.invoice_items.map(async (item: any) => {
        let productName = item.product_name
        try {
          if (!productName && item.product_id) {
            const prod = await apiClient.getProduct(item.product_id)
            productName = prod?.name || prod?.product?.name
          }
        } catch (e) {
          // ignore and fallback
        }
        return { ...item, _productName: productName }
      })
    )

    const subtotal = enrichedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const discountAmount = 0
    const walletPayment = 0
    const total = subtotal - discountAmount

    // Generate QR (black)
    const qrCodeDataURL = await QRCode.toDataURL('https://www.sanabelkhair.com/', {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })

    const printWindow = window.open("", "_blank")
    if (printWindow) {
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
                <div class="customer-row"><span class="customer-label">رقم الفاتورة:</span><span class="customer-value">${invoice.id}</span></div>
                <div class="customer-row"><span class="customer-label">العميلة:</span><span class="customer-value">${invoice.customer_name || ''}</span></div>
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
                  ${enrichedItems.map((item: any) => `
                    <tr>
                      <td class="product-name">${item._productName || item.product_name || item.product_id}</td>
                      <td>${item.quantity}</td>
                      <td>${Number(item.price).toFixed(2)}</td>
                      <td>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
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
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "default"
      case "Pending":
        return "secondary"
      case "Partial":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button variant="outline" onClick={handleLogout} className="border-pink-200 text-pink-600 hover:bg-pink-50">
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل الخروج
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-pink-600">{user?.phone}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-right">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">سنابل</h1>
                <p className="text-sm text-pink-600">بوابة العميلة</p>
              </div>
              <div className="relative">
                <Heart className="h-8 w-8 text-pink-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="bg-white rounded-lg shadow-lg border-pink-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">مرحباً بك مرة أخرى، {user?.name}! 💄</h2>
            <p className="text-gray-600 text-right">إليك نظرة عامة على حسابك والنشاط الأخير في محل سنابل.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Wallet className="h-4 w-4 text-pink-500" />
                <CardTitle className="text-sm font-medium text-gray-700">رصيد المحفظة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-pink-600">{walletBalance.toFixed(2)} جنيه</div>
                <p className="text-xs text-pink-500 text-right">الرصيد المتاح</p>
              </CardContent>
            </Card>

            <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Receipt className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium text-gray-700">إجمالي الفواتير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-purple-600">{invoices.length}</div>
                <p className="text-xs text-purple-500 text-right">جميع المشتريات</p>
              </CardContent>
            </Card>

            <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Receipt className="h-4 w-4 text-rose-500" />
                <CardTitle className="text-sm font-medium text-gray-700">إجمالي المبلغ المنفق</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-rose-600">
                  {invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)} جنيه
                </div>
                <p className="text-xs text-rose-500 text-right">إجمالي الإنفاق</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices */}
          <Card className="border-pink-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-right text-gray-800">فواتيرك 💄</CardTitle>
              <CardDescription className="text-right text-gray-600">عرض وتحميل تاريخ مشترياتك من محل سنابل</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-500">جاري تحميل البيانات...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="relative mx-auto w-16 h-16 mb-4">
                    <Heart className="h-12 w-12 text-pink-400 mx-auto" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد فواتير بعد</h3>
                  <p className="mt-1 text-sm text-gray-500">سيظهر تاريخ مشترياتك من محل سنابل هنا.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-50">
                      <TableHead className="text-right text-pink-700">رقم الفاتورة</TableHead>
                      <TableHead className="text-right text-pink-700">التاريخ</TableHead>
                      <TableHead className="text-right text-pink-700">المجموع</TableHead>
                      <TableHead className="text-right text-pink-700">الحالة</TableHead>
                      <TableHead className="text-right text-pink-700">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-pink-50">
                        <TableCell className="font-medium text-right">{invoice.id}</TableCell>
                        <TableCell className="text-right">
                          {new Date(invoice.created_at).toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-pink-600">{invoice.total.toFixed(2)} جنيه</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getStatusColor(invoice.status)} className="bg-pink-100 text-pink-700 border-pink-200">
                            {invoice.status === "Paid" ? "مدفوع" : invoice.status === "Pending" ? "معلق" : "جزئي"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2 space-x-reverse">
                            <Dialog>
                              <DialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(invoice)} className="text-pink-600 hover:bg-pink-50">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-right">تفاصيل الفاتورة - {invoice.id} 💄</DialogTitle>
                                  <DialogDescription className="text-right">
                                    تاريخ الفاتورة: {new Date(invoice.created_at).toLocaleDateString("en-US")}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-pink-50">
                                        <TableHead className="text-right text-pink-700">المنتج</TableHead>
                                        <TableHead className="text-right text-pink-700">الكمية</TableHead>
                                        <TableHead className="text-right text-pink-700">السعر</TableHead>
                                        <TableHead className="text-right text-pink-700">المجموع</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {invoice.invoice_items.map((item: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell className="text-right">{item.product_name || productNames[item.product_id] || item.product_id}</TableCell>
                                          <TableCell className="text-right">{item.quantity}</TableCell>
                                          <TableCell className="text-right">{item.price.toFixed(2)} جنيه</TableCell>
                                          <TableCell className="text-right font-semibold text-pink-600">{(item.quantity * item.price).toFixed(2)} جنيه</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  <div className="flex justify-between items-center pt-4 border-t border-pink-200">
                                    <span className="text-lg font-bold text-pink-600">{invoice.total.toFixed(2)} جنيه</span>
                                    <span className="text-lg font-semibold text-gray-700">المجموع:</span>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handlePrintInvoice(invoice)} className="text-purple-600 hover:bg-purple-50">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
