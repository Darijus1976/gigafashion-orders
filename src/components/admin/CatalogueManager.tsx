import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const STORAGE_KEY = 'giga_fashion_products'

const catalogueLabels: Record<string, string> = {
  wedding: 'Vestuvės',
  debs: 'Debs',
  christening: 'Krikštynos',
  communion: 'Komunija',
  confirmation: 'Sutvirtinimas',
  extras: 'Extras',
}

const catalogueOrder = ['wedding', 'debs', 'christening', 'communion', 'confirmation', 'extras']

export function CatalogueManager() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [catalogueCounts, setCatalogueCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Product[] = JSON.parse(stored)
        setProducts(parsed)
        
        // Count products per catalogue
        const counts: Record<string, number> = {}
        parsed.forEach(p => {
          if (p.catalogue) {
            counts[p.catalogue] = (counts[p.catalogue] || 0) + 1
          }
        })
        setCatalogueCounts(counts)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Produktų katalogai</h2>
        <button 
          className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
          onClick={() => navigate('/admin/products')}
        >
          + Pridėti produktą
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {catalogueOrder.map((catalogue) => {
          const count = catalogueCounts[catalogue] || 0
          return (
            <div 
              key={catalogue} 
              className="rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-colors"
              onClick={() => navigate(`/admin/products?catalogue=${catalogue}`)}
            >
              <h3 className="font-medium">{catalogueLabels[catalogue] || catalogue}</h3>
              <p className="text-sm text-gray-500">{count} produktų</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
