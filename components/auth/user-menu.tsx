'use client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { User, BookMarked, LogOut, Shield } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getInitials } from '@/lib/utils'

interface UserMenuProps {
  user: SupabaseUser
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.refresh()
  }

  const initials = getInitials(user.email ?? '')

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center justify-center w-8 h-8 rounded-full bg-crimson/20 border border-crimson/30 text-crimson text-xs font-semibold hover:bg-crimson/30 transition-colors focus:outline-none focus:ring-2 focus:ring-crimson/30">
          {initials}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[180px] bg-ink-800 border border-white/10 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-1 animate-fade-in"
          sideOffset={8}
          align="end"
        >
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-stone-subtle truncate">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1" />

          <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md cursor-pointer outline-none transition-colors">
            <BookMarked size={14} />
            Favourites
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md cursor-pointer outline-none transition-colors"
            onClick={() => router.push('/admin')}
          >
            <Shield size={14} />
            Admin
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1" />

          <DropdownMenu.Item
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-muted hover:text-red-400 hover:bg-red-900/20 rounded-md cursor-pointer outline-none transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
