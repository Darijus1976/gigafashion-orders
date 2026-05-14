import { supabase } from '@/lib/supabase/client'

interface DriveUploadResult {
  success: boolean
  fileId?: string
  webViewLink?: string
  error?: string
}

/**
 * Upload PDF to Google Drive
 * Uses server-side API with service account
 */
export async function uploadPdfToDrive(
  pdfBlob: Blob,
  fileName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  try {
    // Get signed URL from Supabase (or your backend)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // Create form data
    const formData = new FormData()
    formData.append('file', pdfBlob, fileName)
    if (folderId) {
      formData.append('folderId', folderId)
    }

    // Upload to backend API (you need to create this endpoint)
    const response = await fetch('/api/google-drive/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result = await response.json()
    return {
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    }
  } catch (error) {
    console.error('Google Drive upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Generate PDF from order data
 */
export function generateOrderPdf(orderData: {
  orderNumber: string
  clientName: string
  phone: string
  visitDate: string
  occasion: string
  items: Array<{
    description: string
    price: number
  }>
  totalAmount: number
  staffMember: string
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // For now, create a simple HTML and convert to blob
    // In production, use @react-pdf/renderer or similar
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #8B1A4A; }
          .order-info { margin-bottom: 20px; }
          .order-info h2 { color: #8B1A4A; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f8f8; }
          .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Giga Fashion</div>
          <p>Užsakymo forma</p>
        </div>
        
        <div class="order-info">
          <h2>Užsakymo informacija</h2>
          <p><strong>Užsakymo Nr.:</strong> ${orderData.orderNumber}</p>
          <p><strong>Klientas:</strong> ${orderData.clientName}</p>
          <p><strong>Telefonas:</strong> ${orderData.phone}</p>
          <p><strong>Vizito data:</strong> ${orderData.visitDate}</p>
          <p><strong>Proga:</strong> ${orderData.occasion}</p>
          <p><strong>Darbuotojas:</strong> ${orderData.staffMember}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Pavadinimas</th>
              <th style="text-align: right;">Kaina</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: right;">€${item.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Viso: €${orderData.totalAmount.toFixed(2)}</p>
        </div>
        
        <div class="footer">
          <p>Data: ${new Date().toLocaleDateString('lt-LT')}</p>
          <p>Giga Fashion - info@gigafashion.ie</p>
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([html], { type: 'text/html' })
    resolve(blob)
  })
}

/**
 * Check if Google Drive is configured
 */
export function isGoogleDriveConfigured(): boolean {
  // Check if service account is configured
  return !!import.meta.env.VITE_GOOGLE_CLIENT_ID
}
