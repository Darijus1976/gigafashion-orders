import { OrderForm } from '@/components/order/OrderForm'

export default function IndexPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-rose-700">Giga Fashion</h1>
        <p className="text-muted-foreground">New Customer Order</p>
      </header>
      <OrderForm />
    </div>
  )
}
