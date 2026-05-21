import { useLocation } from 'react-router-dom'
import { OrderForm } from '@/components/order/OrderForm'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'

export default function IndexPage() {
  const location = useLocation()
  const isNewOrderRoute = location.pathname === '/new-order'

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-rose-700">Giga Fashion</h1>
          <p className="text-muted-foreground">New Customer Order</p>
        </div>
        <Button asChild variant="outline">
          <a href="/dashboard">
            <FolderOpen className="w-4 h-4 mr-2" />
            Client Files
          </a>
        </Button>
      </header>
      <OrderForm blankOnMount={isNewOrderRoute} />
    </div>
  )
}
