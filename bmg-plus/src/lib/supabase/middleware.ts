import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Role-based route access map.
 * Key = path prefix, Value = roles allowed to access it.
 * Routes not listed here are accessible to any authenticated user.
 */
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['coordinador'],
  '/auditoria': ['coordinador', 'supervisor'],
  '/llamadas': ['coordinador', 'supervisor'],
  '/pausas': ['coordinador', 'supervisor', 'agente'],
  '/reportes': ['coordinador', 'supervisor'],
  '/calidad': ['coordinador', 'supervisor'],
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoutes = ['/login', '/register', '/landing']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // --- Unauthenticated users: redirect to login (unless public route) ---
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- Authenticated user on /login: redirect to dashboard ---
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // --- Role-based route protection for authenticated users ---
  if (user) {
    const pathname = request.nextUrl.pathname

    // Find the matching protected route prefix
    const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
      pathname.startsWith(prefix)
    )

    if (matchedPrefix) {
      // Fetch the user's role from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role as string | undefined

      const allowedRoles = ROLE_ROUTES[matchedPrefix]

      if (!userRole || !allowedRoles.includes(userRole)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
