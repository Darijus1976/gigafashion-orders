import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { OrdersTable } from '@/components/dashboard/OrdersTable'
import { SearchBar } from '@/components/dashboard/SearchBar'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    )
  }

  if (!user) {
    window.location.href = '/login'
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-rose-700">Client Files</h1>
          <p className="text-muted-foreground">
            Search, open and update customer orders from any device
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </a>
          </Button>
        </div>
      </header>

      {/* Statistics */}
      <DashboardStats />

      {/* Search and Filter */}
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
      />

      {/* Orders Table */}
      <OrdersTable 
        searchQuery={searchQuery}
        dateFilter={dateFilter}
      />
    </div>
  )
}
