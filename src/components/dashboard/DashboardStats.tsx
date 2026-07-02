import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Users, Calendar } from 'lucide-react'

interface Stats {
  totalOrders: number
  todayOrders: number
  uniqueClients: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    todayOrders: 0,
    uniqueClients: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Today's orders
      const today = new Date().toISOString().split('T')[0]
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)

      // Unique clients
      const { data: clients } = await supabase
        .from('orders')
        .select('client_name:client_name')
        .limit(1000)
      
      const uniqueClients = clients && Array.isArray(clients)
        ? new Set((clients as { client_name: string }[]).map(c => c.client_name)).size 
        : 0

      setStats({
        totalOrders: totalOrders || 0,
        todayOrders: todayOrders || 0,
        uniqueClients,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      title: 'Today',
      value: stats.todayOrders,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Unique Clients',
      value: stats.uniqueClients,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`${card.bgColor} ${card.color} p-2 rounded-lg`}>
              <card.icon className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
