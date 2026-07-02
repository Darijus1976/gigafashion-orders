import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/lib/auth/admin'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    )
  }

  if (!user || !isAdmin(user)) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    return null
  }

  return <>{children}</>
}
