export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          order_number: string
          client_name: string
          phone: string
          visit_date: string
          occasion: 'christening' | 'communion' | 'confirmation' | 'debs' | 'wedding' | 'wedding_alteration' | 'other'
          occasion_custom: string | null
          event_date: string | null
          dress_type: 'catalogue' | 'custom'
          status: 'new' | 'in_progress' | 'fitted' | 'completed' | 'collected'
          staff_member: string
          total_amount: number
          total_paid: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          item_type: 'dress' | 'alteration' | 'extra' | 'fitting' | 'custom'
          description: string
          price: number
          product_id: string | null
          image_url: string | null
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      products: {
        Row: {
          id: string
          name: string
          catalogue: 'christening' | 'communion' | 'confirmation' | 'debs' | 'wedding' | 'extras'
          extras_type: 'bags' | 'veils' | 'belts' | 'headbands' | 'tiaras' | 'cuffs_gloves' | null
          price: number
          description: string | null
          image_url: string | null
          is_active: boolean
          display_order: number
          occasion_tags: string[] | null
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      payments: {
        Row: {
          id: string
          order_id: string
          amount: number
          method: 'cash' | 'card' | 'payment_link'
          payment_date: string
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      fitting_sessions: {
        Row: {
          id: string
          order_id: string
          session_key: string
          fitting_date: string
          notes: any[]
          photo_urls: string[]
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['fitting_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['fitting_sessions']['Insert']>
      }
      order_photos: {
        Row: {
          id: string
          order_id: string
          section: 'custom_dress' | 'fitting'
          storage_path: string
          is_annotated: boolean
          uploaded_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_photos']['Row'], 'id' | 'uploaded_at'>
        Update: Partial<Database['public']['Tables']['order_photos']['Insert']>
      }
    }
  }
}

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type OrderPhoto = Database['public']['Tables']['order_photos']['Row']
