"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Heart, Star, Palette, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-pink-500 mr-3" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">سنابل</h1>
            </div>
            <div className="flex space-x-4 space-x-reverse">
              <Link href="/customer/login">
                <Button className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                  <Heart className="h-4 w-4" />
                  تسجيل دخول العميلة
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
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-pink-100">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <span className="text-pink-600 font-medium">أفضل محل ميك أب وأكسسوارات</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            مرحباً بك في
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 bg-clip-text text-transparent block">سنابل</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            محل متخصص في الميك أب والأكسسوارات الحريمي. اكتشفي أحدث المنتجات وأفضل العروض مع نظام إدارة متكامل.
          </p>
          
          <div className="max-w-2xl mx-auto">
            {/* Customer Card */}
            <Card className="hover:shadow-xl transition-all duration-300 border-purple-100 hover:border-purple-200 bg-gradient-to-br from-white to-purple-50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full">
                  <Heart className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl text-gray-800">العميلة</CardTitle>
                <CardDescription className="text-gray-600">
                  عرض أحدث المنتجات والوصول إلى محفظتك وسجل المشتريات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/customer/login">
                  <Button className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" size="lg">
                    تسجيل دخول العميلة
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">مميزات محل سنابل</h2>
            <p className="text-xl text-gray-600">نظام متكامل لإدارة محل الميك أب والأكسسوارات بكفاءة عالية</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Palette className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">أحدث منتجات الميك أب</h3>
              <p className="text-gray-600">مجموعة متنوعة من الميك أب عالي الجودة</p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">أكسسوارات أنيقة</h3>
              <p className="text-gray-600">أجمل الأكسسوارات الحريمي بأحدث التصاميم</p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">خدمة عملاء متميزة</h3>
              <p className="text-gray-600">نظام محافظ متكامل وتقارير شاملة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
