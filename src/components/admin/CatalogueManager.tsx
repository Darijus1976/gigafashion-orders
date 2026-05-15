import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const catalogueLabels: Record<string, string> = {
  wedding: 'Wedding',
  debs: 'Debs',
  christening: 'Christening',
  communion: 'Communion',
  confirmation: 'Confirmation',
  extras: 'Extras',
}

const catalogueOrder = ['wedding', 'debs', 'christening', 'communion', 'confirmation', 'extras']

export function CatalogueManager() {
  const navigate = useNavigate()
  const [catalogueCounts, setCatalogueCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchCatalogueCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('catalogue')

        if (error) throw error

        const counts: Record<string, number> = {}
        ;(data as Pick<Product, 'catalogue'>[] | null)?.forEach((product) => {
          counts[product.catalogue] = (counts[product.catalogue] || 0) + 1
        })
        setCatalogueCounts(counts)
      } catch (error) {
        console.error('Error loading products:', error)
      }
    }

    fetchCatalogueCounts()
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Product Catalogues</h2>
        <button 
          className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
          onClick={() => navigate('/admin/products')}
        >
          + Add Product
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
              <p className="text-sm text-gray-500">{count} products</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
