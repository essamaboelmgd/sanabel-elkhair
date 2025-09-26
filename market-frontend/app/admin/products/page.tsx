"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Menu } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Edit, Trash2, AlertTriangle, QrCode, Palette, DollarSign, TrendingUp, Package, Download } from "lucide-react"
import apiClient from "@/lib/api"
import { QRScanner } from "@/components/ui/qr-scanner-real"
import { BarcodePrinter } from "@/components/ui/barcode-printer"

interface Product {
  id: string
  product_id?: string // Physical product ID from QR code/barcode
  name: string
  price: number
  selling_price?: number // New: selling price
  buying_price?: number // New: buying price
  expiry_date?: string // New: expiry date
  size_unit?: string // New: size unit (piece or dozen)
  quantity: number
  category_id: string  // Changed from number to string for MongoDB ObjectId
  category?: string // Category name for display
  description?: string
  discount?: number
  is_expired?: boolean // New: expired status
  days_until_expiry?: number // New: days until expiry
}

interface Category {
  id: string  // Changed from number to string for MongoDB ObjectId
  name: string
  description?: string
}

export default function ProductsPage() {
  // Simple guard: redirect cashier to invoices
  if (typeof window !== 'undefined') {
    try {
      const userData = localStorage.getItem('user_data')
      if (userData) {
        const user = JSON.parse(userData)
        if (user?.role === 'cashier') {
          window.location.href = '/admin/invoices'
        }
      }
    } catch {}
  }
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [productForm, setProductForm] = useState({
    product_id: "",
    name: "",
    price: "",
    selling_price: "",
    buying_price: "",
    expiry_date: "",
    size_unit: "piece",
    quantity: "",
    category: "",
    description: "",
    discount: "",
  })

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      try {
        setLoading(true)
        const productsResponse = await apiClient.getProducts()
        const categoriesResponse = await apiClient.getCategories()
        
        // Handle API response structure - check if it's paginated or direct array
        const productsData = productsResponse?.products || productsResponse || []
        let categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : []
        
        // Fix ID mapping: backend sends _id, frontend expects id
        const normalizedProducts = productsData.map(product => ({
          ...product,
          id: product._id || product.id  // Use _id if exists, otherwise use id
        }))
        
        // Fix category ID mapping: backend sends _id, frontend expects id
        categoriesData = categoriesData.map(cat => ({
          ...cat,
          id: cat._id || cat.id  // Use _id if exists, otherwise use id
        }))
        
        console.log("🔍 Debug - Raw Products Response:", productsResponse)
        console.log("🔍 Debug - Raw Categories Response:", categoriesResponse)
        console.log("🔍 Debug - Products Data:", normalizedProducts)
        console.log("🔍 Debug - Categories Data:", categoriesData)
        
        setProducts(normalizedProducts)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch products or categories:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل بيانات المنتجات أو الفئات",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchProductsAndCategories()
  }, [])

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.product_id?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.selling_price || !productForm.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة (اسم المنتج، سعر البيع، الفئة)",
        variant: "destructive",
      })
      return
    }

    const sellingPrice = parseFloat(productForm.selling_price)
    const productData = {
      product_id: productForm.product_id,
      name: productForm.name,
      price: sellingPrice, // Use selling_price as the main price for backward compatibility
      selling_price: sellingPrice,
      buying_price: productForm.buying_price ? parseFloat(productForm.buying_price) : null,
      expiry_date: productForm.expiry_date || null,
      size_unit: productForm.size_unit,
      quantity: parseInt(productForm.quantity) || 0,
      category_id: productForm.category,
      description: productForm.description,
      discount: productForm.discount ? parseFloat(productForm.discount) : 0,
    }

    try {
      if (editingProduct) {
        const updatedProduct = await apiClient.updateProduct({ ...productData, id: editingProduct.id })
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
        toast({
          title: "نجح",
          description: "تم تحديث المنتج بنجاح",
        })
      } else {
        const newProduct = await apiClient.createProduct(productData)
        setProducts([...products, newProduct])
        toast({
          title: "نجح",
          description: "تم إنشاء المنتج بنجاح",
        })
      }

      setIsProductDialogOpen(false)
      setEditingProduct(null)
      setProductForm({
        product_id: "",
        name: "",
        price: "",
        selling_price: "",
        buying_price: "",
        expiry_date: "",
        size_unit: "piece",
        quantity: "",
        category: "",
        description: "",
        discount: "",
      })
    } catch (error) {
      console.error('Failed to save product:', error)
      toast({
        title: "خطأ",
        description: `فشل في ${editingProduct ? "تحديث" : "إنشاء"} المنتج`,
        variant: "destructive",
      })
    }
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الفئة",
        variant: "destructive",
      })
      return
    }

    const categoryData = {
      name: categoryForm.name,
      description: categoryForm.description,
    }

    try {
      if (editingCategory) {
        const updatedCategory = await apiClient.updateCategory(editingCategory.id, categoryData)
        setCategories(categories.map(c => c.id === editingCategory.id ? updatedCategory : c))
        toast({
          title: "نجح",
          description: "تم تحديث الفئة بنجاح",
        })
      } else {
        const newCategory = await apiClient.createCategory(categoryData)
        setCategories([...categories, newCategory])
        toast({
          title: "نجح",
          description: "تم إنشاء الفئة بنجاح",
        })
      }

      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryForm({ name: "", description: "" })
    } catch (error) {
      console.error('Failed to save category:', error)
      toast({
        title: "خطأ",
        description: `فشل في ${editingCategory ? "تحديث" : "إنشاء"} الفئة`,
        variant: "destructive",
      })
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    // Use selling_price if available, otherwise use price as fallback
    const displayPrice = product.selling_price || product.price
    setProductForm({
      product_id: product.product_id || "",
      name: product.name,
      price: product.price.toString(),
      selling_price: displayPrice.toString(),
      buying_price: product.buying_price?.toString() || "",
      expiry_date: product.expiry_date || "",
      size_unit: product.size_unit || "piece",
      quantity: product.quantity.toString(),
      category: product.category_id,
      description: product.description || "",
      discount: product.discount?.toString() || "",
    })
    setIsProductDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || "",
    })
    setIsCategoryDialogOpen(true)
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiClient.deleteProduct(productId)
      setProducts(products.filter(p => p.id !== productId))
      toast({
        title: "نجح",
        description: "تم حذف المنتج بنجاح",
      })
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف المنتج",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await apiClient.deleteCategory(categoryId)
      setCategories(categories.filter(c => c.id !== categoryId))
      toast({
        title: "نجح",
        description: "تم حذف الفئة بنجاح",
      })
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف الفئة",
        variant: "destructive",
      })
    }
  }

  const handleExportInventory = async () => {
    try {
      toast({
        title: "جاري التصدير",
        description: "يتم الآن تحضير ملف الجرد...",
      })
      
      const blob = await apiClient.exportInventory()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD format
      link.download = `جرد_المنتجات_${dateStr}.xlsx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "تم التصدير بنجاح",
        description: "تم تحميل ملف الجرد بنجاح",
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير الجرد، حاول مرة أخرى",
        variant: "destructive",
      })
    }
  }

  // Calculate stats
  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.quantity < 10).length
  const outOfStockProducts = products.filter(p => p.quantity === 0).length
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">المنتجات 💄</h2>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            onClick={handleExportInventory}
            variant="outline"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
          >
            <Download className="ml-2 h-4 w-4" />
            تصدير جرد
          </Button>
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0">
                <Plus className="ml-2 h-4 w-4" />
                فئة جديدة
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Plus className="ml-2 h-4 w-4" />
                منتج جديد
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي المنتجات</CardTitle>
            <Palette className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalProducts}</div>
            <p className="text-xs text-pink-500">جميع المنتجات</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">المنتجات منخفضة المخزون</CardTitle>
            <AlertTriangle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{lowStockProducts}</div>
            <p className="text-xs text-purple-500">أقل من 10 قطع</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">المنتجات النافدة</CardTitle>
            <Package className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{outOfStockProducts}</div>
            <p className="text-xs text-rose-500">كمية صفر</p>
          </CardContent>
        </Card>

        <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">إجمالي القيمة</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totalValue.toFixed(2)} جنيه</div>
            <p className="text-xs text-pink-500">قيمة المخزون</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">البحث والتصفية 🔍</CardTitle>
          <CardDescription className="text-gray-600">ابحث في المنتجات وصف حسب الفئة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث في المنتجات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">الفئة</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                }}
                className="w-full"
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-pink-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">قائمة المنتجات 💄</CardTitle>
          <CardDescription className="text-gray-600">
            {filteredProducts.length} منتج من أصل {products.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <span className="mr-3 text-gray-600">جاري التحميل...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد منتجات</h3>
              <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة منتج جديد</p>
              <div className="mt-6">
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة منتج
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-pink-50">
                    <TableHead className="text-right text-pink-700">المنتج</TableHead>
                    <TableHead className="text-right text-pink-700">الفئة</TableHead>
                    <TableHead className="text-right text-pink-700">الأسعار</TableHead>
                    <TableHead className="text-right text-pink-700">وحدة القياس</TableHead>
                    <TableHead className="text-right text-pink-700">الكمية</TableHead>
                    <TableHead className="text-right text-pink-700">الصلاحية</TableHead>
                    <TableHead className="text-right text-pink-700">الحالة</TableHead>
                    <TableHead className="text-right text-pink-700">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-pink-50">
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">ID: {product.product_id || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {categories.find(c => c.id === product.category_id)?.name || 'غير محدد'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-pink-600">
                            بيع: {(product.selling_price || product.price).toFixed(2)} جنيه
                          </div>
                          {product.buying_price && (
                            <div className="text-xs text-gray-500">
                              شراء: {product.buying_price.toFixed(2)} جنيه
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {product.size_unit === 'dozen' ? 'دسته' : 'قطعة'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={product.quantity < 10 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                            {product.quantity}
                          </span>
                          {product.quantity < 10 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.expiry_date ? (
                          <div className="space-y-1">
                            <div className={`text-xs ${
                              product.is_expired ? 'text-red-600 font-semibold' :
                              (product.days_until_expiry !== null && product.days_until_expiry <= 7) ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              {new Date(product.expiry_date).toLocaleDateString('ar-EG')}
                            </div>
                            {product.is_expired && (
                              <Badge variant="destructive" className="text-xs">
                                منتهي الصلاحية
                              </Badge>
                            )}
                            {!product.is_expired && product.days_until_expiry !== null && product.days_until_expiry <= 7 && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                ينتهي في {product.days_until_expiry} يوم
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">غير محدد</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={product.quantity === 0 ? "destructive" : product.quantity < 10 ? "secondary" : "default"}
                          className={product.quantity === 0 ? "bg-red-100 text-red-700 border-red-200" : 
                                   product.quantity < 10 ? "bg-orange-100 text-orange-700 border-orange-200" : 
                                   "bg-green-100 text-green-700 border-green-200"}
                        >
                          {product.quantity === 0 ? "نافد" : product.quantity < 10 ? "منخفض" : "متوفر"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
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

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
                <DialogDescription>
              {editingProduct ? "تحديث معلومات المنتج" : "إنشاء منتج جديد في النظام"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                {/* معلومات أساسية */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-right text-sm font-medium">
                اسم المنتج *
                  </Label>
                  <Input
                    id="name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="text-right"
                required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="product_id" className="text-right text-sm font-medium">
                      رمز المنتج
                    </Label>
                    <Input
                      id="product_id"
                      placeholder="QR/Barcode"
                      value={productForm.product_id}
                      onChange={(e) => setProductForm({ ...productForm, product_id: e.target.value })}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-right text-sm font-medium">
                      الفئة *
                    </Label>
                    <Select value={productForm.category} onValueChange={(value) => setProductForm({ ...productForm, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* الأسعار */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="selling_price" className="text-right text-sm font-medium">
                      سعر البيع *
                    </Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      placeholder="السعر"
                      value={productForm.selling_price}
                      onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                      className="text-right"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="buying_price" className="text-right text-sm font-medium">
                      سعر الشراء
                    </Label>
                    <Input
                      id="buying_price"
                      type="number"
                      step="0.01"
                      placeholder="اختياري"
                      value={productForm.buying_price}
                      onChange={(e) => setProductForm({ ...productForm, buying_price: e.target.value })}
                      className="text-right"
                    />
                  </div>
                </div>
                
                {/* الكمية ووحدة القياس */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-right text-sm font-medium">
                      الكمية
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="size_unit" className="text-right text-sm font-medium">
                      وحدة القياس
                    </Label>
                    <Select value={productForm.size_unit} onValueChange={(value) => setProductForm({ ...productForm, size_unit: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر وحدة القياس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">قطعة واحدة</SelectItem>
                        <SelectItem value="dozen">دسته (12 قطعة)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* تاريخ الصلاحية والخصم */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date" className="text-right text-sm font-medium">
                      تاريخ انتهاء الصلاحية
                    </Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={productForm.expiry_date}
                      onChange={(e) => setProductForm({ ...productForm, expiry_date: e.target.value })}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-right text-sm font-medium">
                      الخصم %
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={productForm.discount}
                      onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                      className="text-right"
                    />
                  </div>
                </div>
                
                {/* الوصف */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-right text-sm font-medium">
                    الوصف
                  </Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="text-right min-h-[60px]"
                    placeholder="وصف اختياري للمنتج"
                  />
                </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)} className="flex-1 sm:flex-initial">
              إلغاء
            </Button>
            <Button onClick={handleSaveProduct} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex-1 sm:flex-initial">
              {editingProduct ? "تحديث" : "إنشاء"} المنتج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "تحديث معلومات الفئة" : "إنشاء فئة جديدة للمنتجات"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_name" className="text-right">
                اسم الفئة
                  </Label>
                  <Input
                id="category_name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_description" className="text-right">
                الوصف
              </Label>
              <Textarea
                id="category_description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveCategory} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              {editingCategory ? "تحديث" : "إنشاء"} الفئة
            </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>مسح رمز QR</DialogTitle>
            <DialogDescription>
              قم بتوجيه الكاميرا نحو رمز QR للمنتج
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <QRScanner
              onResult={(result) => {
                setProductForm({ ...productForm, product_id: result })
                setIsQRScannerOpen(false)
              }}
              onError={(error) => {
                console.error('QR Scanner error:', error)
                toast({
                  title: "خطأ",
                  description: "فشل في مسح رمز QR",
                  variant: "destructive",
                })
              }}
          />
        </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
