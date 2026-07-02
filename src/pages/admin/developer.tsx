import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Euro, Lock, CreditCard, Banknote, Link as LinkIcon } from 'lucide-react'
import type { Payment } from '@/lib/supabase/types'

const DEVELOPER_PASSWORD = import.meta.env.VITE_DEVELOPER_PASSWORD || 'gigafashion-dev'
const SESSION_KEY = 'developer_unlocked'

interface RevenueStats {
  total: number
  byMethod: Record<string, number>
  payments: Payment[]
}

export default function DeveloperPage() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<RevenueStats>({
    total: 0,
    byMethod: {},
    payments: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isUnlocked) {
      setIsLoading(false)
      return
    }

    fetchRevenueStats()
  }, [isUnlocked])

  const fetchRevenueStats = async () => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })

      if (error) throw error

      const byMethod: Record<string, number> = {}
      const total = (payments as Payment[] | null)?.reduce((sum, payment) => {
        byMethod[payment.method] = (byMethod[payment.method] || 0) + (payment.amount || 0)
        return sum + (payment.amount || 0)
      }, 0) ?? 0

      setStats({
        total,
        byMethod,
        payments: (payments as Payment[] | null) ?? [],
      })
    } catch (err) {
      console.error('Error fetching revenue stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = () => {
    if (password === DEVELOPER_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsUnlocked(true)
      setError('')
    } else {
      setError('Neteisingas slaptažodis')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT')
  }

  const methodLabels: Record<string, string> = {
    cash: 'Grynieji',
    card: 'Kortele',
    payment_link: 'Mokėjimo nuoroda',
  }

  const methodIcons: Record<string, React.ReactNode> = {
    cash: <Banknote className="w-4 h-4" />,
    card: <CreditCard className="w-4 h-4" />,
    payment_link: <LinkIcon className="w-4 h-4" />,
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Lock className="h-7 w-7" />
            </div>
            <CardTitle>Developer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="developer-password">Slaptažodis</Label>
              <Input
                id="developer-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Įveskite slaptažodį..."
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a href="/admin">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atgal
                </a>
              </Button>
              <Button onClick={handleUnlock} className="flex-1">
                Atrakinti
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-rose-700">Revenue</h1>
            <p className="mt-2 text-muted-foreground">Visų mokėjimų suvestinė</p>
          </div>
          <Button asChild variant="outline">
            <a href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Atgal į meniu
            </a>
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bendra pajamų suma
              </CardTitle>
              <div className="bg-yellow-50 text-amber-600 p-2 rounded-lg">
                <Euro className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mokėjimų skaičius
              </CardTitle>
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.payments.length}</div>
            </CardContent>
          </Card>

          {Object.entries(stats.byMethod).map(([method, amount]) => (
            <Card key={method}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {methodLabels[method] || method}
                </CardTitle>
                <div className="bg-slate-50 text-slate-600 p-2 rounded-lg">
                  {methodIcons[method] || <Euro className="w-4 h-4" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paskutiniai mokėjimai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Data</th>
                    <th className="text-left py-3 px-2 font-medium">Metodas</th>
                    <th className="text-right py-3 px-2 font-medium">Suma</th>
                    <th className="text-left py-3 px-2 font-medium">Pastabos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.payments.slice(0, 20).map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 px-2">{formatDate(payment.payment_date)}</td>
                      <td className="py-3 px-2">{methodLabels[payment.method] || payment.method}</td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                  {stats.payments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        Mokėjimų dar nėra
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
