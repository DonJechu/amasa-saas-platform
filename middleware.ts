import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Respuesta base
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          // CORRECCIÓN DEL ERROR ROJO:
          // Solo forzamos la cookie en la RESPUESTA (lo que va al navegador), que es lo importante.
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          
          // Aquí aplicamos el truco para forzar 24 horas (86400 seg) en el navegador
          response.cookies.set({ name, value, ...options, maxAge: 86400 })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/suspended')

  // --- REGLA: SI NO ESTÁ LOGUEADO Y NO ES PÚBLICA -> LOGIN ---
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // A. REGLA 24 HORAS
    const lastSignIn = new Date(user.last_sign_in_at || '')
    const now = new Date()
    const diffHours = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60)

    if (diffHours > 24) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'Sesión expirada.')
        const res = NextResponse.redirect(redirectUrl)
        request.cookies.getAll().forEach(c => {
          if (c.name.includes('sb-') || c.name.includes('auth')) res.cookies.delete(c.name)
        })
        return res
    }

    // B. OBTENER PERFIL
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin, organizations(status, plan)')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.is_super_admin || false
    // @ts-ignore
    const orgStatus = profile?.organizations?.status || 'active'
    // @ts-ignore
    const orgPlan = profile?.organizations?.plan || 'basic'

    // 🛑 LOGICA SUPER ADMIN (NUEVA) 🛑
    if (isSuperAdmin) {
        // 1. Si intenta ir al Dashboard normal ('/'), lo mandamos a su panel
        if (request.nextUrl.pathname === '/') {
            return NextResponse.redirect(new URL('/super-admin', request.url))
        }
        // 2. El Super Admin NO tiene restricciones de Kill Switch ni de Planes.
        // Solo lo dejamos pasar.
        return response
    }

    // SI NO ES SUPER ADMIN, PERO QUIERE ENTRAR A ESA ZONA -> PATEARLO
    if (request.nextUrl.pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/', request.url))
    }
    // 🛑 FIN LOGICA SUPER ADMIN 🛑

    // C. KILL SWITCH
    if (orgStatus === 'suspended' && !request.nextUrl.pathname.startsWith('/suspended')) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }
    if (orgStatus === 'active' && request.nextUrl.pathname.startsWith('/suspended')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // D. BLOQUEO PLANES (Quitamos 'rutas' de aquí también)
    const PRO_ROUTES = ['/nomina', '/produccion', '/despacho', '/devolucion'] 
    const isTryingProRoute = PRO_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))

    if (orgPlan === 'basic' && isTryingProRoute) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // E. LOGIN
    if (request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}