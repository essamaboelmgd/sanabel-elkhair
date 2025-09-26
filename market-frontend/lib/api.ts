/**
 * API Client Configuration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Initialize token from localStorage if available (only in browser)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || null
    }
  }

  setToken(token: string) {
    this.token = token
    // Store token in localStorage (only in browser)
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    // Remove token from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure baseURL doesn't end with slash and endpoint starts with slash
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${cleanBaseURL}${cleanEndpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
                 // If unauthorized, clear token and redirect to login
         if (response.status === 401) {
           this.clearToken()
           if (typeof window !== 'undefined') {
             localStorage.removeItem('user_data')
             // Redirect to appropriate login page based on current path
             const currentPath = window.location.pathname
             if (currentPath.startsWith('/admin')) {
               window.location.href = '/admin/login'
             } else if (currentPath.startsWith('/customer')) {
               window.location.href = '/customer/login'
             } else {
               window.location.href = '/'
             }
           }
         }
        
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Auth endpoints
  async login(phone: string, password: string, role: 'admin' | 'cashier' | 'customer') {
    const response = await this.request<{
      access_token: string
      token_type: string
      user: any
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, role }),
    })
    
    if (response.access_token) {
      this.setToken(response.access_token)
    }
    
    return response
  }

  async register(userData: { name: string; phone: string; password: string; role?: 'admin' | 'customer' }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me')
  }

  async changePassword(phone: string, new_password: string) {
    return this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ phone, new_password }),
    })
  }

  async checkCustomerExists(phone: string) {
    return this.request<any>(`/auth/check-customer?phone=${encodeURIComponent(phone)}`, {
      method: 'POST',
    })
  }

  async setCustomerPasswordByPhone(phone: string, password: string) {
    return this.request<any>('/auth/set-customer-password', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    })
  }

  // Products endpoints
  async getProducts(params: {
    page?: number
    page_size?: number
    category_id?: string
    search?: string
    min_price?: number
    max_price?: number
    in_stock_only?: boolean
    low_stock_only?: boolean
  } = {}) {
    const queryString = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString())
      }
    })
    
    return this.request<any>(`/products/?${queryString}`)
  }

  async getProduct(id: string | number) {
    return this.request<any>(`/products/${id}`)
  }

  async getProductByProductId(productId: string) {
    return this.request<any>(`/products/by-product-id/${productId}`)
  }

  async createProduct(productData: any) {
    return this.request<any>('/products/', {
      method: 'POST',
      body: JSON.stringify(productData),
    })
  }

  async updateProduct(productData: any) {
    return this.request<any>(`/products/${productData.id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    })
  }

  async deleteProduct(id: string | number) {
    return this.request<any>(`/products/${id}`, {
      method: 'DELETE',
    })
  }

  async updateProductStock(id: string | number, quantity: number) {
    return this.request<any>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    })
  }

  async getLowStockProducts() {
    return this.request<any>('/dashboard/low-stock-products')
  }

  async exportInventory(): Promise<Blob> {
    // Ensure baseURL doesn't end with slash 
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
    const url = `${cleanBaseURL}/products/export/inventory`
    
    const config: RequestInit = {
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Inventory export failed:', error)
      throw error
    }
  }

  // Categories endpoints
  async getCategories() {
    return this.request<any>('/categories')
  }

  async createCategory(categoryData: any) {
    return this.request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  }

  async updateCategory(id: string, categoryData: any) {
    return this.request<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  }

  async deleteCategory(id: string) {
    return this.request<any>(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // Customers endpoints
  async getCustomers(params: {
    page?: number
    page_size?: number
    search?: string
    has_balance?: boolean
    status?: string
    min_balance?: number
    max_balance?: number
  } = {}) {
    const queryString = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString())
      }
    })
    
    return this.request<any>(`/customers/?${queryString}`)
  }

  async getCustomer(id: string | number) {
    return this.request<any>(`/customers/${id}`)
  }

  async getMyProfile() {
    return this.request<any>('/customers/me')
  }

  async createCustomer(customerData: any) {
    return this.request<any>('/customers/', {
      method: 'POST',
      body: JSON.stringify(customerData),
    })
  }

  async updateCustomer(customerData: any) {
    return this.request<any>(`/customers/${customerData.id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    })
  }

  async updateCustomerBalance(customerId: string | number, newBalance: number) {
    return this.request<any>(`/customers/${customerId}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        amount: newBalance,
        transaction_type: "admin_update"
      }),
    })
  }

  async setCustomerPasswordById(customerId: string | number, newPassword: string) {
    return this.request<any>('/auth/set-customer-password-by-id', {
      method: 'POST',
      body: JSON.stringify({ 
        customer_id: customerId,
        password: newPassword
      }),
    })
  }

  async deleteCustomer(id: string | number) {
    return this.request<any>(`/customers/${id}`, {
      method: 'DELETE',
    })
  }

  async updateCustomerWallet(id: string | number, amount: number, transaction_type: 'add' | 'deduct', description?: string) {
    const body: any = { amount, transaction_type }
    if (description) {
      body.description = description
    }
    
    return this.request<any>(`/customers/${id}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async getCustomerStats() {
    return this.request<any>('/customers/stats')
  }

  // Invoices endpoints
  async getInvoices(params: {
    page?: number
    page_size?: number
    customer_id?: number
    status?: string
    min_total?: number
    max_total?: number
    min_date?: string
    max_date?: string
  } = {}) {
    const queryString = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString())
      }
    })
    
    return this.request<any>(`/invoices/?${queryString}`)
  }

  async getInvoice(id: string | number) {
    return this.request<any>(`/invoices/${id}`)
  }

  async createInvoice(invoiceData: any) {
    return this.request<any>('/invoices/', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    })
  }

  async updateInvoice(id: string | number, invoiceData: any) {
    console.log('Updating invoice with ID:', id)
    console.log('Invoice data:', invoiceData)
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    })
  }

  async deleteInvoice(id: string | number) {
    return this.request<any>(`/invoices/${id}`, {
      method: 'DELETE',
    })
  }

  async updateInvoiceStatus(id: string | number, status: string) {
    return this.request<any>(`/invoices/${id}/status?status=${status}`, {
      method: 'PATCH',
    })
  }

  async getCustomerInvoices(customerId: string | number) {
    console.log('API: getCustomerInvoices called with customerId:', customerId, 'Type:', typeof customerId)
    const result = await this.request<any>(`/invoices/customer/${customerId}`)
    console.log('API: getCustomerInvoices result:', result)
    return result
  }

  async getMyInvoices(customerId?: string | number) {
    console.log('API: getMyInvoices called with customerId:', customerId)
    const url = customerId ? `/invoices/my-invoices?customer_id=${customerId}` : '/invoices/my-invoices'
    const result = await this.request<any>(url)
    console.log('API: getMyInvoices result:', result)
    return result
  }

  async getInvoiceStats() {
    return this.request<any>('/invoices/stats')
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request<any>('/dashboard/stats')
  }

  async getSalesTrend(days: number = 7) {
    return this.request<any>(`/dashboard/sales-trend?days=${days}`)
  }

  async getCategoryDistribution() {
    return this.request<any>('/dashboard/category-distribution')
  }

  async getRecentActivities(limit: number = 10) {
    return this.request<any>(`/dashboard/recent-activities?limit=${limit}`)
  }

  logout() {
    this.clearToken()
  }
}

export const apiClient = new ApiClient(API_BASE_URL || 'http://localhost:8000')
export default apiClient
