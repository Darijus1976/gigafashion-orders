import { supabase } from './client'
import type { Database, Order, OrderItem, Product, Payment, OrderPhoto } from './types'

// Orders
export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  
  if (error) throw error
  return data as Order
}

export async function getOrderByNumber(orderNumber: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single()
  
  if (error) throw error
  return data as Order
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Order[]
}

export async function updateOrder(orderId: string, updates: any) {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()
  
  if (error) throw error
  return data as Order
}

export async function deleteOrder(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
  
  if (error) throw error
}

// Order Items
export async function getOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: true })
  
  if (error) throw error
  return data as OrderItem[]
}

export async function createOrderItem(item: any) {
  const { data, error } = await supabase
    .from('order_items')
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data as OrderItem
}

export async function updateOrderItem(itemId: string, updates: any) {
  const { data, error } = await supabase
    .from('order_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()
  
  if (error) throw error
  return data as OrderItem
}

export async function deleteOrderItem(itemId: string) {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)
  
  if (error) throw error
}

// Products
export async function getProducts(catalogue?: string) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  if (catalogue) {
    query = query.eq('catalogue', catalogue)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data as Product[]
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return data as Product[]
}

export async function createProduct(product: any) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()
  
  if (error) throw error
  return data as Product
}

export async function updateProduct(productId: string, updates: any) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single()
  
  if (error) throw error
  return data as Product
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
  
  if (error) throw error
}

// Payments
export async function getPayments(orderId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: false })
  
  if (error) throw error
  return data as Payment[]
}

export async function createPayment(payment: any) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  
  if (error) throw error
  return data as Payment
}

export async function updatePayment(paymentId: string, updates: any) {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single()
  
  if (error) throw error
  return data as Payment
}

export async function deletePayment(paymentId: string) {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
  
  if (error) throw error
}

// Order Photos
export async function getOrderPhotos(orderId: string) {
  const { data, error } = await supabase
    .from('order_photos')
    .select('*')
    .eq('order_id', orderId)
    .order('uploaded_at', { ascending: false })
  
  if (error) throw error
  return data as OrderPhoto[]
}

export async function createOrderPhoto(photo: any) {
  const { data, error } = await supabase
    .from('order_photos')
    .insert(photo)
    .select()
    .single()
  
  if (error) throw error
  return data as OrderPhoto
}

export async function updateOrderPhoto(photoId: string, updates: any) {
  const { data, error } = await supabase
    .from('order_photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .single()
  
  if (error) throw error
  return data as OrderPhoto
}

export async function deleteOrderPhoto(photoId: string) {
  const { error } = await supabase
    .from('order_photos')
    .delete()
    .eq('id', photoId)
  
  if (error) throw error
}

// Dashboard queries
export async function getDashboardStats() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, total_amount, total_paid')
  
  if (error) throw error
  
  const stats = {
    totalOrders: orders.length,
    newOrders: orders.filter((o: any) => o.status === 'new').length,
    inProgress: orders.filter((o: any) => o.status === 'in_progress').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
    totalPaid: orders.reduce((sum: number, o: any) => sum + (o.total_paid || 0), 0),
  }
  
  return stats
}
