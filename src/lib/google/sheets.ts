import { supabase } from '@/lib/supabase/client'

interface SheetsSyncResult {
  success: boolean
  updatedRange?: string
  error?: string
}

interface OrderRow {
  orderNumber: string
  clientName: string
  phone: string
  visitDate: string
  occasion: string
  totalAmount: number
  staffMember: string
  createdAt: string
  status: string
}

/**
 * Sync order to Google Sheets
 * Appends order to the "Visos sukneles" sheet
 */
export async function syncOrderToSheets(order: OrderRow): Promise<SheetsSyncResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/google-sheets/append', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID,
        range: 'Sheet1!A:I',
        values: [
          [
            order.orderNumber,
            order.clientName,
            order.phone,
            order.visitDate,
            order.occasion,
            order.totalAmount.toFixed(2),
            order.staffMember,
            new Date(order.createdAt).toLocaleDateString('lt-LT'),
            order.status,
          ],
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result = await response.json()
    return {
      success: true,
      updatedRange: result.updatedRange,
    }
  } catch (error) {
    console.error('Google Sheets sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    }
  }
}

/**
 * Batch sync multiple orders to Google Sheets
 */
export async function batchSyncOrdersToSheets(orders: OrderRow[]): Promise<SheetsSyncResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const values = orders.map(order => [
      order.orderNumber,
      order.clientName,
      order.phone,
      order.visitDate,
      order.occasion,
      order.totalAmount.toFixed(2),
      order.staffMember,
      new Date(order.createdAt).toLocaleDateString('lt-LT'),
      order.status,
    ])

    const response = await fetch('/api/google-sheets/append', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID,
        range: 'Sheet1!A:I',
        values,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result = await response.json()
    return {
      success: true,
      updatedRange: result.updatedRange,
    }
  } catch (error) {
    console.error('Google Sheets batch sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Batch sync failed',
    }
  }
}

/**
 * Check if Google Sheets is configured
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!import.meta.env.VITE_GOOGLE_SHEETS_ID
}

/**
 * Get column headers for the sheet
 */
export function getSheetHeaders(): string[] {
  return [
    'Užsakymo Nr.',
    'Klientas',
    'Telefonas',
    'Vizito data',
    'Proga',
    'Suma (€)',
    'Darbuotojas',
    'Sukurta',
    'Statusas',
  ]
}
