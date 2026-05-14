import { useParams } from 'react-router-dom'
import { OrderForm } from '@/components/order/OrderForm'

export default function OrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-rose-700">Giga Fashion</h1>
        <p className="text-muted-foreground">Užsakymas: {orderNumber}</p>
      </header>
      <OrderForm orderNumber={orderNumber} />
    </div>
  )
}
