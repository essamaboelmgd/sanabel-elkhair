"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Leaf, Star, ShoppingBasket, ArrowRight, Apple, Truck, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative">
                <ShoppingCart className="h-8 w-8 text-green-600 mr-3" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">سنابل الخير</h1>
            </div>
            <div className="flex space-x-4 space-x-reverse">
              <Link href="/customer/login">
                <Button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800">
                  <ShoppingBasket className="h-4 w-4" />
                  تسجيل دخول العميل
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-green-100">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <span className="text-green-700 font-medium">أفضل سوبر ماركت في المنطقة</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            مرحباً بك في
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-transparent block">سنابل الخير</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            سوبر ماركت متخصص في المواد الغذائية والمنتجات اليومية. اكتشف أجود المنتجات وأفضل العروض مع نظام إدارة متكامل.
          </p>
          
          <div className="max-w-2xl mx-auto">
            {/* Customer Card */}
            <Card className="hover:shadow-xl transition-all duration-300 border-green-100 hover:border-green-200 bg-gradient-to-br from-white to-green-50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full">
                  <ShoppingBasket className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-gray-800">العميل</CardTitle>
                <CardDescription className="text-gray-600">
                  تسوق أجود المنتجات والوصول إلى حسابك وسجل مشترياتك
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/customer/login">
                  <Button className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800" size="lg">
                    تسجيل دخول العميل
                    <ArrowRight className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">مميزات سوبر ماركت سنابل الخير</h2>
            <p className="text-xl text-gray-600">نظام متكامل لإدارة السوبر ماركت بكفاءة عالية وخدمة متميزة</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Apple className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">منتجات طازجة وعالية الجودة</h3>
              <p className="text-gray-600">مجموعة متنوعة من الخضروات والفواكه والمواد الغذائية</p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">خدمة توصيل سريعة</h3>
              <p className="text-gray-600">توصيل مجاني للطلبات الكبيرة وخدمة فورية</p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-lime-100 to-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-lime-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">خدمة عملاء متميزة</h3>
              <p className="text-gray-600">نظام حسابات متكامل وتقارير شاملة للعملاء</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
