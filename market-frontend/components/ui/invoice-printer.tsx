"use client"

import { useRef } from 'react'
import { Button } from './button'
import { Printer } from 'lucide-react'

interface InvoicePrinterProps {
  invoice: any
  className?: string
}

export function InvoicePrinter({ invoice, className }: InvoicePrinterProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  const printInvoice = async () => {
    try {
      // Create a single window for printing (directly from click event)
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('فشل في فتح نافذة الطباعة')
        return
      }

      // Generate HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl">
          <head>
            <title>فاتورة - ${invoice.invoice_number || 'فاتورة جديدة'}</title>
            <style>
              body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                margin: 0;
                padding: 10px;
                background: white;
                direction: rtl;
                font-size: 12px;
              }
              .invoice-container {
                width: 100%;
                max-width: 576px;
                margin: 0 auto;
                padding: 15px;
                border: 1px solid #000;
                background: white;
              }
              .invoice-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .invoice-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .invoice-number {
                font-size: 14px;
                margin-bottom: 5px;
              }
              .invoice-date {
                font-size: 12px;
                color: #666;
              }
              .customer-info {
                margin-bottom: 20px;
                padding: 10px;
                border: 1px solid #ddd;
                background: #f9f9f9;
              }
              .customer-name {
                font-weight: bold;
                margin-bottom: 5px;
              }
              .customer-phone {
                font-size: 11px;
                color: #666;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              .items-table th,
              .items-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
                font-size: 11px;
              }
              .items-table th {
                background: #f0f0f0;
                font-weight: bold;
              }
              .total-section {
                border-top: 2px solid #000;
                padding-top: 10px;
                text-align: left;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 12px;
              }
              .total-amount {
                font-weight: bold;
                font-size: 14px;
                border-top: 1px solid #000;
                padding-top: 5px;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #000;
                font-size: 10px;
                color: #666;
              }
              .loading {
                text-align: center;
                padding: 20px;
                color: #666;
              }
              .error {
                color: red;
                padding: 20px;
                border: 1px solid red;
                text-align: center;
                font-weight: bold;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 5px;
                  background: white;
                }
                .invoice-container { 
                  border: 1px solid #000; 
                  max-width: none;
                  width: 100%;
                }
                .loading, .error {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="loading">جاري تحضير الفاتورة للطباعة...</div>
            <div class="invoice-container" style="display: none;">
              <div class="invoice-header">
                <div class="invoice-title">فاتورة</div>
                <div class="invoice-number">رقم الفاتورة: ${invoice.invoice_number || 'غير محدد'}</div>
                <div class="invoice-date">التاريخ: ${new Date(invoice.created_at || Date.now()).toLocaleDateString('ar-EG')}</div>
              </div>
              
              <div class="customer-info">
                <div class="customer-name">العميل: ${invoice.customer?.name || 'غير محدد'}</div>
                <div class="customer-phone">الهاتف: ${invoice.customer?.phone || 'غير محدد'}</div>
              </div>
              
              <table class="items-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items?.map((item: any) => `
                    <tr>
                      <td>${item.product?.name || 'غير محدد'}</td>
                      <td>${item.quantity}</td>
                      <td>${item.price?.toFixed(2)} جنيه</td>
                      <td>${(item.quantity * item.price).toFixed(2)} جنيه</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4">لا توجد منتجات</td></tr>'}
                </tbody>
              </table>
              
              <div class="total-section">
                <div class="total-row">
                  <span>المجموع الفرعي:</span>
                  <span>${invoice.subtotal?.toFixed(2) || '0.00'} جنيه</span>
                </div>
                <div class="total-row">
                  <span>الضريبة (15%):</span>
                  <span>${invoice.tax?.toFixed(2) || '0.00'} جنيه</span>
                </div>
                <div class="total-row">
                  <span>الخصم:</span>
                  <span>${invoice.discount?.toFixed(2) || '0.00'} جنيه</span>
                </div>
                <div class="total-row total-amount">
                  <span>الإجمالي النهائي:</span>
                  <span>${invoice.total?.toFixed(2) || '0.00'} جنيه</span>
                </div>
              </div>
              
              <div class="footer">
                شكراً لزيارتكم
              </div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
            <script>
              // Wait for html2canvas library to load completely
              function waitForLibrary() {
                if (typeof html2canvas !== 'undefined') {
                  console.log('html2canvas library loaded successfully');
                  convertToImage();
                } else {
                  console.log('Waiting for html2canvas library...');
                  setTimeout(waitForLibrary, 200);
                }
              }
              
              // Convert to image when page loads
              window.onload = function() {
                console.log('Page loaded, waiting for html2canvas...');
                waitForLibrary();
              };
              
              function convertToImage() {
                try {
                  console.log('Converting invoice to image...');
                  
                  // Show the container and hide loading
                  document.querySelector('.loading').style.display = 'none';
                  document.querySelector('.invoice-container').style.display = 'block';
                  
                  setTimeout(() => {
                    // Convert the entire invoice container to image
                    const container = document.querySelector('.invoice-container');
                    if (container) {
                      html2canvas(container, {
                        width: 576,
                        height: container.scrollHeight,
                        scale: 2,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        allowTaint: true,
                        logging: false
                      }).then(function(canvas) {
                        console.log('Image conversion successful, preparing for print...');
                        
                        // Replace the entire page content with the image for printing
                        document.body.innerHTML = \`
                          <style>
                            body {
                              margin: 0;
                              padding: 10px;
                              text-align: center;
                              background: white;
                            }
                            .print-image {
                              max-width: 100%;
                              height: auto;
                              display: block;
                              margin: 0 auto;
                            }
                            @media print {
                              body { margin: 0; padding: 5px; }
                              .print-image { max-width: none; }
                            }
                          </style>
                          <img src="\${canvas.toDataURL('image/png')}" class="print-image" alt="الفاتورة" />
                        \`;
                        
                        // Wait longer for content to render before printing
                        setTimeout(() => {
                          console.log('Printing...');
                          window.print();
                        }, 1500);
                        
                      }).catch(function(error) {
                        console.error('Error converting to image:', error);
                        document.body.innerHTML = '<div class="error">خطأ في تحويل الفاتورة إلى صورة</div>';
                      });
                    }
                  }, 1000);
                  
                } catch (error) {
                  console.error('Error converting invoice:', error);
                  document.querySelector('.loading').style.display = 'none';
                  document.body.innerHTML = '<div class="error">خطأ في تحويل الفاتورة - يرجى المحاولة مرة أخرى</div>';
                }
              }
            </script>
          </body>
        </html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()
    } catch (error) {
      console.error('Error printing invoice:', error)
      alert('حدث خطأ في طباعة الفاتورة')
    }
  }

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={printInvoice}
        className="flex items-center gap-2"
        title="طباعة الفاتورة"
      >
        <Printer className="h-4 w-4" />
        طباعة الفاتورة
      </Button>
      <div ref={invoiceRef} style={{ display: 'none' }} />
    </div>
  )
}
