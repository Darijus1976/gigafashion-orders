import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut, LayoutGrid, Package, Settings, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface AdminLayoutProps {
  children: ReactNode
}

const catalogueTabs = [
  { value: 'wedding', label: 'Wedding', href: '/admin?tab=wedding' },
  { value: 'debs', label: 'Debs', href: '/admin?tab=debs' },
  { value: 'christening', label: 'Christening', href: '/admin?tab=christening' },
  { value: 'communion', label: 'Communion', href: '/admin?tab=communion' },
  { value: 'confirmation', label: 'Confirmation', href: '/admin?tab=confirmation' },
  { value: 'extras', label: 'Extras', href: '/admin?tab=extras' },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Skip auth check for testing
  useEffect(() => {
    setIsLoading(false)
    setIsAuthenticated(true)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Get current tab from URL
  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'wedding'

  // Determine active section
  const isCatalogues = location.pathname === '/admin' && !location.pathname.includes('/products')
  const isProducts = location.pathname.includes('/admin/products')
  const isSettings = location.pathname.includes('/admin/settings')

  // Skip auth for testing
  // if (isLoading) { ... }
  // if (!isAuthenticated) { ... }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <a href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GF</span>
              </div>
              <span className="font-bold text-rose-800">Admin CMS</span>
            </a>
            
            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <a
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isCatalogues
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Catalogues
              </a>
              <a
                href="/admin/products"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isProducts
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                Products
              </a>
              <a
                href="/admin/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSettings
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </a>
            </nav>
          </div>
          
          {/* User & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Administrator</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-rose-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        
        {/* Catalogue Tabs (only on catalogue page) */}
        {isCatalogues && (
          <div className="border-t border-gray-200 bg-gray-50/50">
            <div className="container mx-auto px-4">
              <Tabs value={currentTab} className="w-full">
                <TabsList className="w-full justify-start h-12 bg-transparent rounded-none border-b-0">
                  {catalogueTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      onClick={() => navigate(tab.href)}
                      className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-rose-600 rounded-none px-4"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
