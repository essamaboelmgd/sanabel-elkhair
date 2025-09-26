"use client"

import React from 'react'

interface InvoiceItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

interface Customer {
  id: string
  name: string
  phone: string
  wallet_balance?: number
}

interface InvoicePrintProps {
  invoice: {
    id: string
    customer_id: string
    customer_name: string
    created_at?: string
    status: string
    notes?: string
  }
  customer: Customer
  items: InvoiceItem[]
  subtotal: number
  discount: number
  discountType: "percentage" | "fixed"
  total: number
  walletPayment: number
  walletAdd: number
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({
  invoice,
  customer,
  items,
  subtotal,
  discount,
  discountType,
  total,
  walletPayment,
  walletAdd
}) => {
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const finalTotal = total - walletPayment

  const printInvoice = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>فاتورة ${invoice.id} - سنابل</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">
          <style>
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            
            body { 
              font-family: 'Cairo', 'Arial', sans-serif; 
              background: white;
              padding: 0;
              direction: rtl; 
              text-align: right;
              font-size: 12px;
              color: #333;
              line-height: 1.4;
            }
            
            .invoice-container {
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              background: white;
              padding: 5mm;
              font-size: 10px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 8mm;
              border-bottom: 2px solid #ff69b4;
              padding-bottom: 5mm;
            }
            
            .logo {
              font-size: 18px;
              font-weight: 900;
              color: #ff69b4;
              margin-bottom: 2mm;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            
            .tagline {
              font-size: 8px;
              color: #666;
              margin-bottom: 2mm;
            }
            
            .invoice-title {
              font-size: 14px;
              font-weight: 700;
              color: #333;
              margin-bottom: 1mm;
            }
            
            .invoice-number {
              font-size: 12px;
              color: #ff69b4;
              font-weight: 600;
            }
            
            .customer-info {
              margin-bottom: 6mm;
              padding: 3mm;
              background: #fff5f8;
              border-radius: 2mm;
              border-right: 3px solid #ff69b4;
            }
            
            .customer-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1mm;
              font-size: 9px;
            }
            
            .customer-label {
              font-weight: 600;
              color: #ff69b4;
            }
            
            .customer-value {
              color: #333;
            }
            
            .date-time {
              text-align: center;
              margin-bottom: 5mm;
              font-size: 8px;
              color: #666;
              border-bottom: 1px dashed #ddd;
              padding-bottom: 3mm;
            }
            
            .products-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 5mm;
              font-size: 8px;
            }
            
            .products-table th {
              background: #ff69b4;
              color: white;
              padding: 2mm 1mm;
              font-weight: 600;
              text-align: center;
              font-size: 8px;
            }
            
            .products-table td {
              padding: 1.5mm 1mm;
              text-align: center;
              border-bottom: 1px solid #eee;
              font-size: 8px;
            }
            
            .product-name {
              text-align: right;
              font-weight: 500;
            }
            
            .totals-section {
              margin-bottom: 5mm;
              font-size: 9px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 1mm 0;
              border-bottom: 1px solid #eee;
            }
            
            .total-row.grand-total {
              border-top: 2px solid #ff69b4;
              border-bottom: 2px solid #ff69b4;
              font-weight: 700;
              font-size: 11px;
              color: #ff69b4;
              padding: 2mm 0;
            }
            
            .wallet-info {
              background: #f0f8ff;
              padding: 3mm;
              border-radius: 2mm;
              margin-bottom: 5mm;
              font-size: 8px;
              border-right: 3px solid #4a90e2;
            }
            
            .wallet-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1mm;
            }
            
            .wallet-label {
              font-weight: 600;
              color: #4a90e2;
            }
            
            .footer {
              text-align: center;
              padding: 3mm 0;
              border-top: 2px solid #ff69b4;
              font-size: 8px;
              color: #666;
            }
            
            .thank-you {
              font-size: 10px;
              font-weight: 600;
              color: #ff69b4;
              margin-bottom: 2mm;
            }
            
            .contact-info {
              font-size: 7px;
              color: #999;
            }
            
            .barcode-area {
              text-align: center;
              margin-top: 3mm;
              padding: 2mm;
              border: 1px dashed #ccc;
              font-size: 6px;
              color: #999;
            }
            
            @media print {
              body { 
                padding: 0; 
                margin: 0;
              }
              .invoice-container {
                width: 80mm;
                max-width: 80mm;
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
              <div class="invoice-number">رقم: ${invoice.id}</div>
            </div>
            
            <div class="customer-info">
              <div class="customer-row">
                <span class="customer-label">العميل:</span>
                <span class="customer-value">${customer.name}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">الهاتف:</span>
                <span class="customer-value">${customer.phone}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">رصيد المحفظة:</span>
                <span class="customer-value">${customer.wallet_balance?.toFixed(2) || '0.00'} جنيه</span>
              </div>
            </div>
            
            <div class="date-time">
              التاريخ: ${new Date(invoice.created_at || '').toLocaleDateString('ar-SA')}<br>
              الوقت: ${new Date(invoice.created_at || '').toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}
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
                ${items.map(item => `
                  <tr>
                    <td class="product-name">${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="total-row">
                <span>المجموع الفرعي:</span>
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
                <span>المتبقي:</span>
                <span>${finalTotal.toFixed(2)} جنيه</span>
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
            
            ${invoice.notes ? `
            <div style="background: #fff9e6; padding: 2mm; border-radius: 2mm; margin-bottom: 3mm; font-size: 8px; border-right: 3px solid #ffa500;">
              <div style="font-weight: 600; color: #ffa500; margin-bottom: 1mm;">ملاحظات:</div>
              <div>${invoice.notes}</div>
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
            
            <div class="barcode-area">
              [باركود الفاتورة]<br>
              ${invoice.id}
            </div>
          </div>
        </body>
      </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="hidden">
      {/* This component is only for printing, not for display */}
    </div>
  )
}

export default InvoicePrint

