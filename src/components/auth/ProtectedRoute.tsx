import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

const ADMIN_EMAIL = 'darijusbrizgys@gmail.com'

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.href = '/login'
    return null
  }

  return <>{children}</>
}
