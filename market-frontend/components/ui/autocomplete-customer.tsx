"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, User, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import apiClient from "@/lib/api"

interface Customer {
  id: string
  _id?: string
  name: string
  phone: string
  first_login: boolean
  wallet_balance?: number
}

interface AutocompleteCustomerProps {
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onCreateNewCustomer?: (customer: Customer) => void
  placeholder?: string
  label?: string
  showCreateOption?: boolean
  className?: string
}

export function AutocompleteCustomer({
  selectedCustomer,
  onSelectCustomer,
  onCreateNewCustomer,
  placeholder = "ابحث عن العميل بالاسم أو رقم الهاتف...",
  label = "اختيار العميل",
  showCreateOption = true,
  className = ""
}: AutocompleteCustomerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load customers on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true)
        const customersResponse = await apiClient.getCustomers()
        let customersData = []
        
        if (Array.isArray(customersResponse)) {
          customersData = customersResponse
        } else if (customersResponse && Array.isArray(customersResponse.customers)) {
          customersData = customersResponse.customers
        }
        
        const normalizedCustomers = customersData.map((customer: any) => ({
          ...customer,
          id: customer._id || customer.id,
          name: customer.name || customer.full_name || 'عميل بدون اسم',
          phone: customer.phone || customer.phone_number || 'بدون رقم'
        }))
        
        setCustomers(normalizedCustomers)
      } catch (error) {
        console.error('Failed to load customers:', error)
        toast({
          title: "خطأ",
          description: "فشل في تحميل قائمة العملاء",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers.slice(0, 12))
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = customers.filter((customer) => {
      const nameMatch = customer.name.toLowerCase().includes(searchLower)
      const phoneMatch = customer.phone.includes(searchTerm)
      return nameMatch || phoneMatch
    }).slice(0, 12) // Limit to 12 results

    setFilteredCustomers(filtered)
  }, [searchTerm, customers])

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true)
    if (!searchTerm) {
      setFilteredCustomers(customers.slice(0, 12))
    }
  }

  // Handle customer selection
  const handleSelectCustomer = async (customer: Customer) => {
    setSearchTerm(customer.name)
    setIsOpen(false)
    
    // Refresh customer wallet balance from API
    try {
      const customerResponse = await apiClient.getCustomer(customer.id)
      if (customerResponse && customerResponse.wallet_balance !== undefined) {
        const updatedCustomer = { ...customer, wallet_balance: customerResponse.wallet_balance }
        onSelectCustomer(updatedCustomer)
        
        // Update in customers list
        const updatedCustomers = customers.map((c: Customer) => 
          c.id === customer.id ? updatedCustomer : c
        )
        setCustomers(updatedCustomers)
      } else {
        onSelectCustomer(customer)
      }
    } catch (error) {
      console.warn('Failed to refresh customer wallet balance:', error)
      onSelectCustomer(customer)
    }
  }

  // Handle create new customer
  const handleCreateNewCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العميل ورقم الهاتف",
        variant: "destructive",
      })
      return
    }

    try {
      const customerData = {
        name: newCustomerName,
        phone: newCustomerPhone,
        first_login: true,
      }

      let newCustomer: Customer
      try {
        const apiResponse = await apiClient.createCustomer(customerData)
        newCustomer = {
          id: apiResponse.id || apiResponse._id || Date.now().toString(),
          name: newCustomerName,
          phone: newCustomerPhone,
          first_login: true,
        }
        console.log('Customer created via API:', apiResponse)
      } catch (apiError) {
        console.warn('Failed to create customer via API, using local storage:', apiError)
        newCustomer = {
          id: Date.now().toString(),
          name: newCustomerName,
          phone: newCustomerPhone,
          first_login: true,
        }
      }

      const updatedCustomers = [...customers, newCustomer]
      setCustomers(updatedCustomers)
      localStorage.setItem("customers", JSON.stringify(updatedCustomers))

      onSelectCustomer(newCustomer)
      if (onCreateNewCustomer) {
        onCreateNewCustomer(newCustomer)
      }
      
      setNewCustomerPhone("")
      setNewCustomerName("")
      setShowCreateForm(false)
      setSearchTerm(newCustomer.name)
      setIsOpen(false)

      toast({
        title: "نجح",
        description: "تم إنشاء عميل جديد",
      })
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: "خطأ",
        description: "فشل في إنشاء العميل",
        variant: "destructive",
      })
    }
  }

  // Handle input change
  const handleInputChange = (value: string) => {
    setSearchTerm(value)
    setIsOpen(true)
    
    // If input is cleared, clear selection
    if (!value.trim()) {
      onSelectCustomer(null)
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowCreateForm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            className="pr-10"
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-2">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {/* Search Results */}
              {filteredCustomers.length > 0 && (
                <div className="p-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                            {customer.wallet_balance !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-medium">
                                  {customer.wallet_balance.toFixed(2)} جنيه
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {filteredCustomers.length === 0 && searchTerm && (
                <div className="p-4 text-center text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>لم يتم العثور على عملاء</p>
                </div>
              )}

              {/* Create New Customer */}
              {showCreateOption && (
                <div className="border-t border-gray-200">
                  {!showCreateForm ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 text-pink-600 hover:bg-pink-50"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء عميل جديد
                    </Button>
                  ) : (
                    <Card className="m-2">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium text-gray-900">إنشاء عميل جديد</h4>
                        <Input
                          placeholder="اسم العميل"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                        />
                        <Input
                          placeholder="رقم الهاتف"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleCreateNewCustomer}
                            className="flex-1"
                          >
                            إنشاء
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCreateForm(false)}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Selected Customer Info */}
      {selectedCustomer && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{selectedCustomer.name}</p>
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-green-700">
                  <Phone className="h-3 w-3" />
                  <span>{selectedCustomer.phone}</span>
                  {selectedCustomer.wallet_balance !== undefined && (
                    <>
                      <span>•</span>
                      <span className="font-medium">
                        {selectedCustomer.wallet_balance.toFixed(2)} جنيه
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSelectCustomer(null)
                setSearchTerm("")
              }}
              className="text-red-600 hover:text-red-700"
            >
              إزالة
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
