import { FileText, FolderOpen, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPage() {
  const choices = [
    {
      title: 'Nauja forma',
      description: 'Pildyti naują kliento užsakymo formą',
      href: '/new-order',
      icon: FileText,
    },
    {
      title: 'Katalogai',
      description: 'Tvarkyti katalogus ir prekes',
      href: '/admin/catalogues',
      icon: LayoutGrid,
    },
    {
      title: 'Esami užsakymai',
      description: 'Atidaryti, ieškoti ir redaguoti išsaugotus užsakymus',
      href: '/dashboard',
      icon: FolderOpen,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-rose-700">Giga Fashion Admin</h1>
          <p className="mt-2 text-muted-foreground">Pasirinkite, ką norite daryti</p>
        </header>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {choices.map((choice) => {
            const Icon = choice.icon
            return (
              <Card key={choice.href} className="flex flex-col">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle>{choice.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col text-center">
                  <p className="mb-6 flex-1 text-sm text-muted-foreground">{choice.description}</p>
                  <Button asChild>
                    <a href={choice.href}>Atidaryti</a>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
