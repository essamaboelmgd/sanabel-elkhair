"use client"

import { useRef } from 'react'
import { Button } from './button'
import { Printer } from 'lucide-react'

interface BarcodePrinterProps {
  productId: string
  productName: string
  className?: string
}

export function BarcodePrinter({ productId, productName, className }: BarcodePrinterProps) {
  const barcodeRef = useRef<HTMLDivElement>(null)

  const printBarcode = async () => {
    try {
      // Create a single window for printing (directly from click event)
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('فشل في فتح نافذة الطباعة')
        return
      }

      // Write the HTML content with proper styling
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
          <head>
            <title>باركود المنتج - ${productName}</title>
            <style>
              body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                margin: 0;
                padding: 10px;
                text-align: center;
                background: white;
                direction: rtl;
              }
              .barcode-container {
                display: inline-block;
                padding: 20px;
                border: 2px solid #333;
                background: white;
                border-radius: 8px;
                min-width: 280px;
                max-width: 576px;
                text-align: center;
              }
              .product-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
                text-align: center;
              }
              .product-id {
                font-size: 14px;
                color: #666;
                margin-bottom: 15px;
                font-family: monospace;
                text-align: center;
              }
              .barcode-image {
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
                padding: 10px;
                background: white;
                margin: 10px 0;
              }
              .barcode-text {
                font-family: monospace;
                font-size: 16px;
                font-weight: bold;
                letter-spacing: 2px;
                margin-top: 10px;
                color: #000;
                text-align: center;
              }
              .arabic-label {
                font-size: 12px;
                color: #333;
                margin-bottom: 5px;
                text-align: center;
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
                .barcode-container { 
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
            <div class="loading">جاري تحضير الباركود للطباعة...</div>
            <div class="barcode-container" style="display: none;">
              <div class="product-name">${productName}</div>
              <div class="arabic-label">رمز المنتج:</div>
              <div class="product-id">${productId}</div>
              <div id="barcode-output"></div>
              <div class="barcode-text">${productId}</div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
            <script>
              // Wait for all libraries to load completely
              function waitForLibraries() {
                if (typeof JsBarcode !== 'undefined' && typeof html2canvas !== 'undefined') {
                  console.log('Libraries loaded successfully');
                  generateBarcode();
                } else {
                  console.log('Waiting for libraries...');
                  setTimeout(waitForLibraries, 200);
                }
              }
              
              // Generate barcode when page loads
              window.onload = function() {
                console.log('Page loaded, waiting for libraries...');
                waitForLibraries();
              };
              
              function generateBarcode() {
                try {
                  console.log('Generating barcode for: ${productId}');
                  
                  // Create canvas element for barcode
                  const canvas = document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 120;
                  
                  // Generate barcode on canvas
                  JsBarcode(canvas, '${productId}', {
                    format: "CODE128",
                    width: 2,
                    height: 60,
                    displayValue: false,
                    fontSize: 0,
                    margin: 5,
                    background: "#ffffff",
                    lineColor: "#000000",
                  });
                  
                  // Convert canvas to data URL
                  const dataURL = canvas.toDataURL('image/png');
                  
                  // Create image element
                  const img = document.createElement('img');
                  img.src = dataURL;
                  img.className = 'barcode-image';
                  img.alt = 'باركود المنتج';
                  
                  // Add image to page
                  const output = document.getElementById('barcode-output');
                  output.appendChild(img);
                  
                  // Show the container and hide loading
                  document.querySelector('.loading').style.display = 'none';
                  document.querySelector('.barcode-container').style.display = 'inline-block';
                  
                  // Wait for image to load, then convert to image and print
                  img.onload = function() {
                    console.log('Barcode image loaded, converting to print image...');
                    setTimeout(() => {
                      // Convert the entire barcode container to image
                      const container = document.querySelector('.barcode-container');
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
                            <img src="\${canvas.toDataURL('image/png')}" class="print-image" alt="باركود المنتج" />
                          \`;
                          
                          // Wait longer for content to render before printing
                          setTimeout(() => {
                            console.log('Printing...');
                            window.print();
                          }, 1500);
                          
                        }).catch(function(error) {
                          console.error('Error converting to image:', error);
                          document.body.innerHTML = '<div class="error">خطأ في تحويل الباركود إلى صورة</div>';
                        });
                      }
                    }, 1000);
                  };
                  
                  // Handle image load error
                  img.onerror = function() {
                    console.error('Failed to load barcode image');
                    document.querySelector('.loading').style.display = 'none';
                    document.body.innerHTML = '<div class="error">خطأ في تحميل صورة الباركود</div>';
                  };
                  
                } catch (error) {
                  console.error('Error generating barcode:', error);
                  document.querySelector('.loading').style.display = 'none';
                  document.body.innerHTML = '<div class="error">خطأ في إنشاء الباركود - يرجى المحاولة مرة أخرى</div>';
                }
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    } catch (error) {
      console.error('Error printing barcode:', error)
      alert('حدث خطأ في طباعة الباركود')
    }
  }

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={printBarcode}
        className="flex items-center gap-2"
        title="طباعة باركود المنتج"
      >
        <Printer className="h-4 w-4" />
        طباعة باركود
      </Button>
      <div ref={barcodeRef} style={{ display: 'none' }} />
    </div>
  )
}
