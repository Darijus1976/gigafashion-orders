import type { User } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'darijusbrizgys@gmail.com'

export function isAdmin(user: User | null): boolean {
  return user?.email === ADMIN_EMAIL
}
