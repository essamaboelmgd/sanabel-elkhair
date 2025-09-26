"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Menu } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus, Search, Save, ArrowLeft, QrCode, Filter, Merge, AlertTriangle, Trash2, Printer, Send } from "lucide-react"
import QRCode from 'qrcode'
import { QRScanner } from "@/components/ui/qr-scanner"
import { AutocompleteCustomer } from "@/components/ui/autocomplete-customer"
import apiClient from "@/lib/api"

interface Product {
  id: string
  product_id?: string
  name: string
  price: number
  quantity: number
  category: string
  category_id?: string
}

interface Customer {
  id: string
  _id?: string
  name: string
  phone: string
  first_login: boolean
  wallet_balance?: number
}

interface InvoiceItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

interface InvoiceItemUpdate {
  id?: string  // Optional as per backend schema
  product_id: string
  quantity: number
  price: number
}

interface Invoice {
  id?: string
  customer_id: string
  customer_name: string
  customer_phone: string
  date: string
  total: number
  subtotal: number
  discount: number
  tax: number
  remaining: number
  status: string
  notes?: string
  items: InvoiceItem[]
  created_at?: string
  updated_at?: string
  invoice_items?: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
  }>
}

interface Category {
  id: string
  _id?: string
  name: string
  description?: string
}

export default function EditInvoicePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending" | "Partial">("Pending")
  const [walletPayment, setWalletPayment] = useState(0)
  const [walletAdd, setWalletAdd] = useState(0)
  const [notes, setNotes] = useState("")
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [mergeSameProducts, setMergeSameProducts] = useState(true)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch invoice data
        const invoiceResponse = await apiClient.getInvoice(invoiceId)
        console.log('Fetched invoice:', invoiceResponse)
        
        let invoiceData = null
        let convertedItems: InvoiceItem[] = []
        
        if (invoiceResponse) {
          setOriginalInvoice(invoiceResponse)
          invoiceData = invoiceResponse
          
          // Set invoice data
          setPaymentStatus(invoiceResponse.status as "Paid" | "Pending" | "Partial")
          setNotes(invoiceResponse.notes || "")
          
          // Convert invoice items to local format
          convertedItems = (invoiceResponse.invoice_items || []).map((item: any) => ({
            id: item.id || `${item.product_id}-${Date.now()}`,
            productId: item.product_id,
            productName: item.product_id, // Will be updated when products are loaded
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price
          }))
          
          setInvoiceItems(convertedItems)
        }

        // Fetch products from API
        const productsResponse = await apiClient.getProducts()
        let productsData = []
        
        if (Array.isArray(productsResponse)) {
          productsData = productsResponse
        } else if (productsResponse && Array.isArray(productsResponse.products)) {
          productsData = productsResponse.products
        } else {
          console.warn('Products response structure unexpected:', productsResponse)
          productsData = []
        }
        
        const normalizedProducts = productsData.map((product: any) => ({
          ...product,
          id: product._id || product.id,
          product_id: product.product_id || product.id,
          category: product.category || product.category_name || 'عام',
          category_id: product.category_id || product.category_id
        }))
        
        setProducts(normalizedProducts)

        // Customers are now handled by AutocompleteCustomer component

        // Fetch categories from API
        const categoriesResponse = await apiClient.getCategories()
        if (Array.isArray(categoriesResponse)) {
          const normalizedCategories = categoriesResponse.map((cat: any) => ({
            ...cat,
            id: cat._id || cat.id
          }))
          setCategories(normalizedCategories)
        } else if (categoriesResponse && Array.isArray(categoriesResponse.categories)) {
          const normalizedCategories = categoriesResponse.categories.map((cat: any) => ({
            ...cat,
            id: cat._id || cat.id
          }))
          setCategories(normalizedCategories)
        } else {
          console.warn('Categories response structure unexpected:', categoriesResponse)
          setCategories([])
        }

        // Set selected customer from invoice data
        if (invoiceData && invoiceData.customer_id) {
          console.log('Looking for customer with ID:', invoiceData.customer_id)
          console.log('Invoice data:', invoiceData)
          
          // Create customer object from invoice data
          const customer: Customer = {
            id: invoiceData.customer_id,
            name: invoiceData.customer_name || 'عميل غير معروف',
            phone: invoiceData.customer_phone || 'بدون رقم',
            first_login: false,
            wallet_balance: 0
          }
          
          setSelectedCustomer(customer)
          console.log('✅ Set customer from invoice data:', customer)
          
          // Try to refresh customer wallet balance from API
          try {
            const customerResponse = await apiClient.getCustomer(customer.id)
            if (customerResponse && customerResponse.wallet_balance !== undefined) {
              const updatedCustomer = { ...customer, wallet_balance: customerResponse.wallet_balance }
              setSelectedCustomer(updatedCustomer)
              console.log('✅ Updated customer wallet balance:', customerResponse.wallet_balance)
            }
          } catch (error) {
            console.warn('Failed to refresh customer wallet balance:', error)
          }
        } else {
          console.warn('No invoice data or customer_id found')
        }

        // Update product names in invoice items
        if (convertedItems.length > 0 && normalizedProducts.length > 0) {
          const updatedItems = convertedItems.map((item: InvoiceItem) => {
            const product = normalizedProducts.find((p: Product) => p.id === item.productId)
            return {
              ...item,
              productName: product?.name || item.productName || `منتج ${item.productId}`
            }
          })
          setInvoiceItems(updatedItems)
          console.log('Updated invoice items with product names:', updatedItems)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل البيانات",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchData()
  }, [invoiceId])

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = product.name.toLowerCase().includes(searchLower) || 
                         (product.id && product.id.toLowerCase().includes(searchLower)) ||
                         (product.product_id && product.product_id.toLowerCase().includes(searchLower))
    
    let matchesCategory = true
    if (selectedCategory !== "all") {
      matchesCategory = Boolean(
        product.category === selectedCategory || 
        product.category_id === selectedCategory ||
        (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase())
      )
    }
    
    return matchesSearch && matchesCategory
  })

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer)
  }

  const handleCreateNewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const handleAddProduct = (product: Product) => {
    // Check stock availability first
    if (product.quantity <= 0) {
      toast({
        title: "خطأ",
        description: `المنتج ${product.name} غير متوفر في المخزون`,
        variant: "destructive",
      })
      return
    }

    if (mergeSameProducts) {
      const existingItem = invoiceItems.find((item) => item.productId === product.id)
      
      if (existingItem) {
        // Check if adding one more would exceed stock
        if (existingItem.quantity + 1 > product.quantity) {
          toast({
            title: "خطأ",
            description: `الكمية المطلوبة (${existingItem.quantity + 1}) تتجاوز المخزون المتاح (${product.quantity})`,
            variant: "destructive",
          })
          return
        }

        setInvoiceItems(
          invoiceItems.map((item) =>
            item.productId === product.id
              ? { 
                  ...item, 
                  quantity: item.quantity + 1, 
                  total: (item.quantity + 1) * item.price
                }
              : item,
          ),
        )
        
        toast({
          title: "تم التحديث",
          description: `تم زيادة كمية ${product.name} إلى ${existingItem.quantity + 1}`,
        })
        return
      }
    }
    
    const newInvoiceItem = {
      id: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
      total: product.price,
    }
    
    setInvoiceItems([...invoiceItems, newInvoiceItem])
    
    toast({
      title: "تم الإضافة",
      description: `تم إضافة ${product.name} إلى الفاتورة`,
    })
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setInvoiceItems(invoiceItems.filter((item) => item.productId !== productId))
    } else {
      // Check stock availability
      const product = products.find(p => p.id === productId)
      if (product && newQuantity > product.quantity) {
        toast({
          title: "خطأ",
          description: `الكمية المطلوبة (${newQuantity}) تتجاوز المخزون المتاح (${product.quantity})`,
          variant: "destructive",
        })
        return
      }

      setInvoiceItems(
        invoiceItems.map((item) =>
          item.productId === productId ? { ...item, quantity: newQuantity, total: newQuantity * item.price } : item,
        ),
      )
    }
  }

  const handleScanQRCode = () => {
    setIsQRScannerOpen(true)
  }

  const handleQRScanResult = async (productId: string) => {
    try {
      const productData = await apiClient.getProductByProductId(productId)
      if (productData && productData.id) {
        const product: Product = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          quantity: productData.quantity,
          category: productData.category || "عام"
        }
        
        handleAddProduct(product)
        setIsQRScannerOpen(false)
        
        toast({
          title: "تم المسح بنجاح",
          description: `تم إضافة المنتج: ${product.name}`,
        })
      } else {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المنتج",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات المنتج",
        variant: "destructive",
      })
    }
  }

  const handleQRScanError = (error: string) => {
    console.error("QR scan error:", error)
    toast({
      title: "خطأ في المسح",
      description: error,
      variant: "destructive",
    })
    setIsQRScannerOpen(false)
  }
  
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
  }

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const total = Math.max(0, subtotal - discountAmount)

  const handleUpdateInvoice = async () => {
    // Validate customer selection
    if (!selectedCustomer) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار عميل",
        variant: "destructive",
      })
      return
    }

    // Validate wallet payment
    if (walletPayment > 0) {
      if (!selectedCustomer.wallet_balance || selectedCustomer.wallet_balance < walletPayment) {
        toast({
          title: "خطأ",
          description: `رصيد المحفظة غير كافي. المتوفر: ${selectedCustomer.wallet_balance?.toFixed(2) || '0.00'} جنيه`,
          variant: "destructive",
        })
        return
      }
    }

    // Validate customer ID
    if (!selectedCustomer.id) {
      toast({
        title: "خطأ",
        description: "معرف العميل غير صحيح",
        variant: "destructive",
      })
      return
    }

    // Validate invoice items
    if (invoiceItems.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة منتج واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    // Validate invoice items data
    for (const item of invoiceItems) {
      if (!item.productId || !item.productName || item.quantity <= 0 || item.price <= 0) {
        toast({
          title: "خطأ",
          description: `بيانات المنتج "${item.productName || 'غير معروف'}" غير صحيحة`,
          variant: "destructive",
        })
        return
      }
      
      // Check if product still exists in products list
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        toast({
          title: "خطأ",
          description: `المنتج "${item.productName}" لم يعد موجوداً`,
          variant: "destructive",
        })
        return
      }
      
      // Check if product has sufficient stock
      if (product.quantity < item.quantity) {
        toast({
          title: "خطأ",
          description: `المنتج "${item.productName}" لا يحتوي على كمية كافية (المتوفر: ${product.quantity})`,
          variant: "destructive",
        })
        return
      }
    }

    setIsSavingInvoice(true)

    try {
      // Prepare invoice items data according to new API structure
      const invoiceItemsData = invoiceItems.map(item => ({
        id: item.id, // Include the item ID as it's optional in backend schema
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
      }))

      // Calculate final total including discount and tax
      const finalTotal = total

      const invoiceData = {
        customer_id: selectedCustomer.id,
        notes: notes || "",
        invoice_items: invoiceItemsData as InvoiceItemUpdate[],
        wallet_payment: walletPayment,
        wallet_add: walletAdd,
        status: paymentStatus,
        discount: discount,
        discount_type: discountType
        // Remove total as it's calculated by backend
      }

      // Validate data before sending
      if (!invoiceData.customer_id) {
        toast({
          title: "خطأ",
          description: "معرف العميل مطلوب",
          variant: "destructive",
        })
        return
      }

      if (!invoiceData.invoice_items || invoiceData.invoice_items.length === 0) {
        toast({
          title: "خطأ",
          description: "يجب إضافة منتج واحد على الأقل",
          variant: "destructive",
        })
        return
      }

      // Validate each invoice item
      for (const item of invoiceData.invoice_items as InvoiceItemUpdate[]) {
        if (!item.product_id || item.quantity <= 0 || item.price <= 0) {
          toast({
            title: "خطأ",
            description: "بيانات المنتجات غير صحيحة",
            variant: "destructive",
          })
          return
        }
      }

      // Validate total amount
      if (finalTotal <= 0) {
        toast({
          title: "خطأ",
          description: "المجموع يجب أن يكون أكبر من صفر",
          variant: "destructive",
        })
        return
      }

      // Log all data being sent
      console.log('=== Invoice Update Data ===')
      console.log('Invoice ID:', invoiceId)
      console.log('Customer ID:', selectedCustomer.id)
      console.log('Customer Name:', selectedCustomer.name)
      console.log('Notes:', notes)
      console.log('Invoice Items Count:', invoiceItems.length)
      console.log('Invoice Items:', invoiceItems)
      console.log('Invoice Items Data:', invoiceItemsData)
      console.log('Total Amount:', finalTotal)
      console.log('Data to send:', invoiceData)
      console.log('========================')

      // First, update the invoice
      console.log('=== Invoice Update Request ===')
      console.log('Invoice ID:', invoiceId)
      console.log('Invoice Data:', invoiceData)
      console.log('=============================')
      
      const updatedInvoice = await apiClient.updateInvoice(invoiceId, invoiceData)
      console.log('=== Invoice Update Response ===')
      console.log('Response:', updatedInvoice)
      console.log('Response Type:', typeof updatedInvoice)
      console.log('Response Keys:', Object.keys(updatedInvoice || {}))
      console.log('=============================')
      
      if (updatedInvoice) {
        // Update product quantities in database - only apply the difference
        try {
          if (originalInvoice && originalInvoice.invoice_items) {
            // Create a map of original quantities for quick lookup
            const originalQuantities = new Map()
            originalInvoice.invoice_items.forEach((item: any) => {
              originalQuantities.set(item.product_id, item.quantity)
            })

            // Calculate and apply only the difference
            for (const item of invoiceItems) {
              const product = products.find(p => p.id === item.productId)
              if (product) {
                const originalQty = originalQuantities.get(item.productId) || 0
                const newQty = item.quantity
                const quantityDifference = newQty - originalQty
                
                if (quantityDifference !== 0) {
                  const newStockQuantity = Math.max(0, product.quantity - quantityDifference)
                  console.log(`Updating product stock: ID=${product.id}, originalQty=${originalQty}, newQty=${newQty}, difference=${quantityDifference}, newStock=${newStockQuantity}`)
                  await apiClient.updateProductStock(product.id, newStockQuantity)
                  console.log(`Updated product ${product.name} stock by ${quantityDifference} (from ${product.quantity} to ${newStockQuantity})`)
                } else {
                  console.log(`No quantity change for product ${product.name}, skipping stock update`)
                }
              }
            }
          } else {
            // Fallback: if no original invoice data, apply current quantities (for new invoices)
            for (const item of invoiceItems) {
              const product = products.find(p => p.id === item.productId)
              if (product && item.quantity > 0) {
                const newQuantity = Math.max(0, product.quantity - item.quantity)
                console.log(`Updating product stock (fallback): ID=${product.id}, newQuantity=${newQuantity}`)
                await apiClient.updateProductStock(product.id, newQuantity)
                console.log(`Updated product ${product.name} stock to ${newQuantity}`)
              }
            }
          }
        } catch (stockError) {
          console.warn('Failed to update product stock via API:', stockError)
          toast({
            title: "تحذير",
            description: "تم تحديث الفاتورة لكن فشل في تحديث المخزون",
            variant: "destructive",
          })
        }

        let successMessage = `تم تحديث الفاتورة بنجاح - ${invoiceItems.length} منتج - المجموع: ${finalTotal.toFixed(2)} جنيه`
        
        if (walletPayment > 0) {
          successMessage += ` - تم الدفع من المحفظة: ${walletPayment.toFixed(2)} جنيه`
        }
        
        if (walletAdd > 0) {
          successMessage += ` - تم إضافة ${walletAdd.toFixed(2)} جنيه للمحفظة`
        }
        
        toast({
          title: "نجح",
          description: successMessage,
        })

        // Reset loading state before redirect
        setIsSavingInvoice(false)
        
        // Redirect to invoices list
        router.push("/admin/invoices")
      } else {
        throw new Error("لم يتم استلام رد من الخادم")
      }
      
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
        invoiceId: invoiceId
      })
      
      // Handle specific error types
      let errorMessage = "فشل في تحديث الفاتورة"
      if (error.message) {
        if (error.message.includes("404")) {
          errorMessage = "لم يتم العثور على الفاتورة"
        } else if (error.message.includes("400")) {
          errorMessage = "بيانات غير صحيحة"
        } else if (error.message.includes("401")) {
          errorMessage = "غير مصرح لك بتحديث الفاتورة"
        } else if (error.message.includes("500")) {
          errorMessage = "خطأ في الخادم"
        } else if (error.message.includes("Network")) {
          errorMessage = "فشل في الاتصال بالخادم"
        } else if (error.message.includes("timeout")) {
          errorMessage = "انتهت مهلة الاتصال"
        } else if (error.message.includes("fetch")) {
          errorMessage = "فشل في إرسال الطلب"
        }
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSavingInvoice(false)
    }
  }

  const handleDeleteInvoice = async () => {
    try {
      await apiClient.deleteInvoice(invoiceId)
      toast({
        title: "نجح",
        description: "تم حذف الفاتورة بنجاح",
      })
      router.push("/admin/invoices")
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف الفاتورة",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (newStatus: "Paid" | "Pending" | "Partial") => {
    try {
      // Update status through main update function
      setPaymentStatus(newStatus)
      toast({
        title: "نجح",
        description: "سيتم تحديث حالة الفاتورة عند حفظ التعديلات",
      })
    } catch (error) {
      console.error('Failed to update invoice status:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الفاتورة",
        variant: "destructive",
      })
    }
  }



  const handlePrintInvoice = async () => {
    if (!originalInvoice || !selectedCustomer) return
    
    try {
      // Calculate totals for printing
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
      const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
      const total = Math.max(0, subtotal - discountAmount)

      // Generate QR code for the website
      const qrCodeDataURL = await QRCode.toDataURL('https://www.sanabelkhair.com/', {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>فاتورة ${originalInvoice.id} - سنابل</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
            <style>
              @page {
                size: 72mm auto;
                margin: 0;
              }
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
              }
              
              html, body {
                width: 72mm;
                margin: 0 auto;
              }

              body { 
                font-family: 'Cairo', 'Amiri', 'Scheherazade New', 'Arial', sans-serif; 
                background: white;
                padding: 0;
                direction: rtl; 
                text-align: right;
                font-size: 12px;
                color: #333;
                line-height: 1.5;
                font-weight: 500;
              }
              
              .invoice-container {
                width: 72mm;
                max-width: 72mm;
                margin: 0 auto;
                background: white;
                padding: 4mm;
                font-size: 11px;
              }
              
              .header {
                text-align: center;
                margin-bottom: 2mm;;
                border-bottom: 2px solid #ff69b4;
                padding-bottom: 2mm;
              }
              
              .logo {
                font-size: 20px;
                font-weight: 900;
                color: #ff69b4;
                // margin-bottom: 3mm;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
              }
              
              .tagline {
                font-size: 9px;
                color: #000000;
                // margin-bottom: 3mm;
              }
              
              .invoice-title {
                font-size: 14px;
                font-weight: 700;
                color: #333;
                // margin-bottom: 2mm;
              }
              
              .customer-info {
                margin-bottom: 1mm;
                padding: 3mm;
                background: #fff5f8;
                border-radius: 2mm;
                border-right: 3px solid #ff69b4;
              }
              
              .customer-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1.5mm;
                font-size: 10px;
              }
              
              .customer-label {
                font-weight: 600;
                color: #ff69b4;
              }
              
              .customer-value {
                color: #000;
                font-size: 10px;
              }
              
              .date-time {
                text-align: center;
                margin-bottom: 2mm;
                font-size: 9px;
                color: #000000;;
                border-bottom: 1px dashed #000;
                padding-bottom: 3mm;
              }
              
              .products-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 5mm;
                font-size: 9px;
              }
              
              .products-table th {
                background: #ff69b4;
                color: black;
                padding: 2mm 1mm;
                font-weight: 600;
                text-align: center;
                font-size: 10px;
                font-weight: 700;
              }
              
              .products-table td {
                padding: 1.5mm 1mm;
                text-align: center;
                border-bottom: 1px solid #000;
                font-size: 10px;
                font-weight: 700;
              }
              
              .product-name {
                text-align: right;
                font-weight: 700;
                font-size: 12px;
              }
              
              .totals-section {
                margin-bottom: 5mm;
                font-size: 10px;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 1.2mm 0;
                border-bottom: 1px solid #eee;
                font-weight: 700;
                font-size: 12px;
              }
              
              .total-row.grand-total {
                border-top: 2px solid #ff69b4;
                border-bottom: 2px solid #ff69b4;
                font-weight: 700;
                font-size: 12px;
                color: #ff69b4;
                padding: 2mm 0;
              }
              
              .wallet-info {
                background: #f0f8ff;
                padding: 3mm;
                border-radius: 2mm;
                margin-bottom: 5mm;
                font-size: 9px;
                border-right: 3px solid #4a90e2;
              }
              
              .wallet-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1.5mm;
              }
              
              .wallet-label {
                font-weight: 600;
                color: #4a90e2;
              }
              
              .footer {
                text-align: center;
                padding: 3mm 0;
                border-top: 2px solid #ff69b4;
                font-size: 9px;
                color: #000000;
              }
              
              .thank-you {
                font-size: 11px;
                font-weight: 600;
                color: #ff69b4;
                margin-bottom: 3mm;
              }
              
              .contact-info {
                font-size: 10px;
                color: #000;
                margin-bottom: -5mm;
              }
              
              .qr-code-area {
                text-align: center;
                margin-top: 3mm;
                padding: 2mm;
                border: 1px dashed #ccc;
                background: #f9f9f9;
                border-radius: 2mm;
              }
              
              .qr-code-area img {
                width: 100px;
                height: 100px;
                margin: 0 auto;
                display: block;
              }
              
              .qr-code-text {
                font-size: 8px;
                color: #999;
                margin-top: 2mm;
              }
              
              @media print {
                html, body {
                  width: 72mm;
                  margin: 0 auto !important;
                  padding: 0;
                }
                body {
                  display: flex;
                  justify-content: center;
                }
                .invoice-container {
                  width: 72mm;
                  max-width: 72mm;
                  margin: 0 auto !important;
                  padding: 3mm;
                }
              }
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
                <div class="customer-row">
                  <span class="customer-label">العميل:</span>
                  <span class="customer-value">${selectedCustomer.name}</span>
                </div>
                <div class="customer-row">
                  <span class="customer-label">الهاتف:</span>
                  <span class="customer-value">${selectedCustomer.phone}</span>
                </div>
                <div class="customer-row">
                  <span class="customer-label">رصيد المحفظة:</span>
                  <span class="customer-value">${selectedCustomer.wallet_balance?.toFixed(2) || '0.00'} جنيه</span>
                </div>
              </div>
              
              <div class="date-time">
                التاريخ: ${new Date(originalInvoice.created_at || '').toLocaleDateString('en-US')}<br>
                الوقت: ${new Date(originalInvoice.created_at || '').toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})}
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
                  ${invoiceItems.map(item => `
                    <tr>
                      <td class="product-name">${item.productName || item.productId || 'منتج'}</td>
                      <td>${item.quantity}</td>
                      <td>${item.price.toFixed(2)}</td>
                      <td>${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="totals-section">
                <div class="total-row">
                  <span>المجموع قبل الخصم:</span>
                  <span>${subtotal.toFixed(2)} جنيه</span>
                </div>
                ${discount > 0 ? `
                <div class="total-row">
                  <span>الخصم ${discountType === "percentage" ? `(${discount}%)` : `(${discount} جنيه)`}:</span>
                  <span>-${discountAmount.toFixed(2)} جنيه</span>
                </div>
                ` : ''}
                <div class="total-row">
                  <span>المجموع بعد الخصم:</span>
                  <span>${total.toFixed(2)} جنيه</span>
                </div>
                ${walletPayment > 0 ? `
                <div class="total-row">
                  <span>الدفع من المحفظة:</span>
                  <span>-${walletPayment.toFixed(2)} جنيه</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>الإجمالي:</span>
                  <span>${(total - walletPayment).toFixed(2)} جنيه</span>
                </div>
              </div>
              
              ${(walletPayment > 0 || walletAdd > 0) ? `
              <div class="wallet-info">
                ${walletPayment > 0 ? `
                <div class="wallet-row">
                  <span class="wallet-label">تم الدفع من المحفظة:</span>
                  <span>${walletPayment.toFixed(2)} جنيه</span>
                </div>
                ` : ''}
                ${walletAdd > 0 ? `
                <div class="wallet-row">
                  <span class="wallet-label">سيتم إضافة للمحفظة:</span>
                  <span>${walletAdd.toFixed(2)} جنيه</span>
                </div>
                ` : ''}
              </div>
              ` : ''}
              

              
              <div class="footer">
                <div class="thank-you">🌸 شكراً لتعاملكم معنا 🌸</div>
                <div class="contact-info">
                  هاتف: 0123456789 | واتساب: 0123456789<br>
                  العنوان: شارع الرئيسي، المدينة<br>
                  ساعات العمل: 9 ص - 10 م
                </div>
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
            try {
              printWindow.focus()
              printWindow.print()
            } catch (e) {
              console.error('Print failed:', e)
            }
          }, 800)
        })
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء QR code",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" dir="rtl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50" dir="rtl">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">تعديل الفاتورة رقم: {invoiceId} ✏️</h2>
        </div>
        {/* نقل أزرار الحفظ والطباعة لأسفل الصفحة */}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer Selection */}
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-gray-800">معلومات العميل 👤</CardTitle>
            <CardDescription className="text-gray-600">ابحث عن العميل بالاسم أو رقم الهاتف</CardDescription>
          </CardHeader>
          <CardContent>
            <AutocompleteCustomer
              selectedCustomer={selectedCustomer}
              onSelectCustomer={handleSelectCustomer}
              onCreateNewCustomer={handleCreateNewCustomer}
              placeholder="ابحث عن العميل بالاسم أو رقم الهاتف..."
              label="اختيار العميل"
              showCreateOption={true}
            />
            
            {selectedCustomer && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">العميل المختار</h4>
                    <p className="text-sm text-green-700">
                      {selectedCustomer.name} - {selectedCustomer.phone}
                    </p>
                    {selectedCustomer.wallet_balance !== undefined && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600">رصيد المحفظة:</span>
                          <span className="text-sm font-semibold text-green-800">
                            {selectedCustomer.wallet_balance.toFixed(2)} جنيه
                          </span>
                        </div>
                        {walletPayment > 0 && (
                          <div className="text-xs">
                            {walletPayment <= selectedCustomer.wallet_balance ? (
                              <span className="text-green-600 bg-green-100 px-2 py-1 rounded">
                                ✓ رصيد كافي للدفع
                              </span>
                            ) : (
                              <span className="text-red-600 bg-red-100 px-2 py-1 rounded">
                                ✗ رصيد غير كافي
                              </span>
                            )}
                          </div>
                        )}
                        {walletAdd > 0 && (
                          <div className="text-xs">
                            <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              بعد الإضافة: {(selectedCustomer.wallet_balance + walletAdd).toFixed(2)} جنيه
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-gray-800">إضافة المنتجات 🛍️</CardTitle>
            <CardDescription className="text-gray-600">ابحث وأضف المنتجات إلى الفاتورة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="تصفية حسب الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        جميع الفئات
                      </div>
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleScanQRCode}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mergeProducts"
                  checked={mergeSameProducts}
                  onChange={(e) => setMergeSameProducts(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="mergeProducts" className="text-sm">
                  دمج المنتجات المتشابهة
                </Label>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث بالاسم أو رمز المنتج..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                  />
                </div>
                {(searchTerm || selectedCategory !== "all") && (
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    مسح الفلاتر
                  </Button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {selectedCategory !== "all" || searchTerm ? "لا توجد منتجات تطابق البحث" : "لا توجد منتجات"}
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddProduct(product)}
                    >
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <div className="text-right flex-1 mr-3">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                          <span>{product.quantity} متوفر</span>
                          <span>•</span>
                          <span>{product.price.toFixed(2)} يجنيه</span>
                          <span>•</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-gray-800">عناصر الفاتورة 📋</CardTitle>
          <CardDescription className="text-gray-600">المنتجات المضافة إلى هذه الفاتورة</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم إضافة منتجات بعد. ابحث وأضف المنتجات أعلاه.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">المجموع</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-right">{item.productName}</TableCell>
                    <TableCell className="text-right">{item.price.toFixed(2)} يجنيه</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.total.toFixed(2)} يجنيه</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleUpdateQuantity(item.productId, 0)}>
                        إزالة
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Summary */}
      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-gray-800">ملخص الفاتورة 💰</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="discount">الخصم</Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                  placeholder={discountType === "percentage" ? "0" : "0.00"}
                />
                <Select value={discountType} onValueChange={(value: any) => setDiscountType(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">جنيه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletPayment">الدفع من المحفظة</Label>
              <Input
                id="walletPayment"
                type="number"
                step="0.01"
                value={walletPayment}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 0
                  setWalletPayment(Math.min(value, total))
                }}
                placeholder="0.00"
                max={total}
              />
              {walletPayment > total && (
                <p className="text-xs text-red-600">
                  الدفع من المحفظة لا يمكن أن يتجاوز المجموع
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>إضافة للمحفظة</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={walletAdd}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 0
                  setWalletAdd(Math.max(0, value))
                }}
                className="w-full"
              />
              {walletAdd > 0 && (
                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  سيتم إضافة {walletAdd.toFixed(2)} جنيه لمحفظة العميل عند حفظ الفاتورة
                </p>
              )}
            </div>
            {/* زر تبديل حالة الدفع بدلاً من القائمة */}
            <div className="space-y-2">
              <Label>حالة الدفع</Label>
              <Button
                type="button"
                variant={paymentStatus === 'Paid' ? 'destructive' : 'default'}
                className={paymentStatus === 'Paid' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                onClick={async () => {
                  try {
                    const next = paymentStatus === 'Paid' ? 'Pending' : 'Paid'
                    await apiClient.updateInvoiceStatus(invoiceId, next)
                    setPaymentStatus(next as any)
                    toast({ title: 'تم', description: next === 'Paid' ? 'تم تعليم الفاتورة كمدفوعة' : 'تم التراجع عن الدفع' })
                  } catch (e) {
                    toast({ title: 'خطأ', description: 'تعذر تحديث حالة الدفع', variant: 'destructive' })
                  }
                }}
              >
                {paymentStatus === 'Paid' ? 'تراجع عن الدفع' : 'تم الدفع'}
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Input
              id="notes"
              placeholder="أضف ملاحظات للفاتورة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span>{subtotal.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between">
              <span>الخصم {discountType === "percentage" ? `(${discount}%)` : `(${discount} جنيه)`}:</span>
              <span>-{discountAmount.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between">
              <span>المجموع بعد الخصم:</span>
              <span>{total.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between">
              <span>الدفع من المحفظة:</span>
              <span>-{walletPayment.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>المتبقي:</span>
              <span>{(total - walletPayment).toFixed(2)} جنيه</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أزرار الحفظ والطباعة في الأسفل */}
      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={handlePrintInvoice} className="border-pink-200 hover:bg-pink-50">
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button 
              onClick={() => setShowSaveConfirmation(true)} 
              disabled={isSavingInvoice}
              className="min-w-[140px] bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              variant={invoiceItems.length > 0 ? "default" : "outline"}
            >
              {isSavingInvoice ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="ml-2 h-4 w-4" />
                  حفظ التعديلات
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4 text-center">مسح رمز المنتج</h3>
            <QRScanner
              onScanResult={handleQRScanResult}
              onError={handleQRScanError}
              onClose={() => setIsQRScannerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Save Invoice Confirmation Dialog */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-semibold">تأكيد حفظ التعديلات</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                هل أنت متأكد من حفظ التعديلات على هذه الفاتورة؟
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• العميل: {selectedCustomer?.name}</p>
                <p>• عدد المنتجات: {invoiceItems.length}</p>
                <p>• المجموع: {total.toFixed(2)} جنيه</p>
                {notes && <p>• الملاحظات: {notes}</p>}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSaveConfirmation(false)}
                disabled={isSavingInvoice}
              >
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  setShowSaveConfirmation(false)
                  try {
                    await handleUpdateInvoice()
                  } catch (error) {
                    console.error('Error in confirmation dialog:', error)
                    // Error is already handled in handleUpdateInvoice
                  }
                }}
                disabled={isSavingInvoice}
                className="min-w-[100px]"
              >
                {isSavingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    حفظ...
                  </>
                ) : (
                  'حفظ'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Dialog */}
      {/* {showDeleteConfirmation && (
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
                onClick={handleDeleteInvoice}
              >
                حذف
              </Button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}
