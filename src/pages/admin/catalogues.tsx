import { AdminLayout } from '@/components/admin/AdminLayout'
import { CatalogueManager } from '@/components/admin/CatalogueManager'

export default function AdminCataloguesPage() {
  return (
    <AdminLayout>
      <CatalogueManager />
    </AdminLayout>
  )
}
