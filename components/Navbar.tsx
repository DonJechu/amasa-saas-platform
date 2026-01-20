"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Truck, RotateCcw, BarChart3, Settings, ChefHat, Lock, X, Package, Banknote, LayoutDashboard, Menu, ShoppingCart, LogOut, Map, Gem} from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization' 
import { supabase } from '@/utils/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  
  // 1. OBTENEMOS DATOS Y EL PLAN 
  const { orgName, adminPin, plan } = useOrganization()

  // ESTADOS
  const [showAuth, setShowAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  
  // ESTADO PARA EL MENÚ DE CELULAR
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Helpers de estilos
  const isActive = (path: string) => pathname === path ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  const isAdminActive = pathname === '/admin' ? "text-black rotate-90 bg-gray-100" : "text-gray-400 hover:text-black hover:rotate-90 hover:bg-gray-50"
  const isHomeActive = pathname === '/' ? "text-black bg-gray-100" : "text-gray-400 hover:text-orange-600 hover:bg-orange-50"

  const handleAdminClick = () => {
    if (pathname === '/admin') return
    setShowAuth(true)
    setTimeout(() => document.getElementById('pin-input')?.focus(), 100)
  }

  const verifyPin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === adminPin) {
      setShowAuth(false)
      setPassword('')
      router.push('/admin')
    } else {
      setError(true)
      setPassword('')
    }
  }

  // ALERTA DE VENTA (UPSALE)
  const handleLockedClick = (featureName: string) => {
    alert(`🔒 MÓDULO BLOQUEADO\n\nLa función de "${featureName}" es exclusiva del PLAN PRO.\n\nContacta a soporte para actualizar tu plan y desbloquear:\n- Nómina\n- Producción\n- Rutas\n- Reportes Avanzados`)
  }
  
  // LISTA COMPLETA DE MENÚS
  const ALL_MENU_ITEMS = [
    { path: '/caja', label: 'Caja (POS)', icon: <ShoppingCart size={20} />, isPro: false },
    { path: '/almacen', label: 'Almacén', icon: <Package size={20} />, isPro: false },
    // MÓDULOS PRO (Se mostrarán bloqueados si es basic)
    { path: '/despacho', label: 'Salida', icon: <Truck size={20} />, isPro: true },
    { path: '/devolucion', label: 'Devolución', icon: <RotateCcw size={20} />, isPro: true },
    { path: '/produccion', label: 'Producción', icon: <ChefHat size={20} />, isPro: true },
    { path: '/nomina', label: 'Nómina', icon: <Banknote size={20} />, isPro: true },
    { path: '/reportes', label: 'Reportes', icon: <BarChart3 size={20} />, isPro: true },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh() 
  }

  return (
    <>
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
            
            {/* 1. IZQUIERDA: BOTÓN HOME + NOMBRE EMPRESA */}
            <div className="flex items-center gap-3">
                <Link 
                    href="/" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`p-2.5 rounded-full transition-all duration-300 ${isHomeActive}`}
                    title="Panel Principal"
                >
                    <LayoutDashboard size={24} />
                </Link>
                
                <div className="flex flex-col">
                    <span className="font-black text-gray-800 tracking-tight text-sm md:text-base uppercase hidden xs:block leading-none">
                        {orgName || 'Cargando...'}
                    </span>
                    {/* Badge del Plan */}
                    {plan === 'pro' && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded w-fit flex items-center gap-1 mt-0.5">
                            <Gem size={10}/> PRO
                        </span>
                    )}
                </div>
            </div>

            {/* 2. CENTRO (SOLO DESKTOP): MENÚ HORIZONTAL */}
            <div className="hidden lg:flex gap-2 justify-center flex-1">
                {ALL_MENU_ITEMS.map((item) => {
                    // LÓGICA DE BLOQUEO VISUAL
                    const isLocked = plan === 'basic' && item.isPro
                    
                    if (isLocked) {
                        return (
                            <button 
                                key={item.path} 
                                onClick={() => handleLockedClick(item.label)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-gray-50 text-gray-400 cursor-not-allowed opacity-70 hover:bg-gray-100 transition-all"
                                title="Función exclusiva Plan Pro"
                            >
                                {item.icon} <span>{item.label}</span> <Lock size={12} className="text-gray-300"/>
                            </button>
                        )
                    }

                    return (
                        <Link key={item.path} href={item.path} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all text-sm ${isActive(item.path)}`}>
                            {item.icon} <span>{item.label}</span>
                        </Link>
                    )
                })}
            </div>

            {/* 3. DERECHA: ADMIN + SALIR + HAMBURGUESA */}
            <div className="flex items-center gap-2">
                
                {/* BOTÓN SALIR */}
                <button 
                    onClick={handleLogout}
                    className="p-2.5 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Cerrar Sesión"
                >
                    <LogOut size={20} />
                </button>
                
                {/* BOTÓN ADMIN */}
                <button 
                    onClick={() => { setIsMobileMenuOpen(false); handleAdminClick(); }}
                    className={`p-2.5 rounded-full transition-all duration-500 ease-out ${isAdminActive}`}
                    title="Configuración"
                >
                    <Settings size={24} />
                </button>

                {/* Botón Hamburguesa (SOLO MÓVIL / TABLET) */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden p-2.5 rounded-full text-gray-600 hover:bg-gray-100"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </div>

        {/* --- MENÚ DESPLEGABLE MÓVIL --- */}
        {isMobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top-5 shadow-xl absolute w-full left-0 z-40 max-h-[80vh] overflow-y-auto">
                <div className="p-4 grid grid-cols-2 gap-3">
                    {ALL_MENU_ITEMS.map((item) => {
                        // LÓGICA DE BLOQUEO MÓVIL
                        const isLocked = plan === 'basic' && item.isPro

                        if (isLocked) {
                             return (
                                <button 
                                    key={item.path} 
                                    onClick={() => { setIsMobileMenuOpen(false); handleLockedClick(item.label); }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 opacity-60"
                                >
                                    <div className="relative">
                                        {item.icon}
                                        <div className="absolute -top-1 -right-2 bg-gray-200 rounded-full p-0.5"><Lock size={10} /></div>
                                    </div>
                                    <span className="text-xs font-bold uppercase text-center flex items-center gap-1">
                                        {item.label}
                                    </span>
                                </button>
                            )
                        }

                        return (
                            <Link 
                                key={item.path} 
                                href={item.path} 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${pathname === item.path ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                            >
                                {item.icon}
                                <span className="text-xs font-bold uppercase text-center">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        )}
      </nav>

      {/* MODAL DE SEGURIDAD (ADMIN) */}
      {showAuth && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <div className="text-center mb-6">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500"><Lock size={32} /></div>
              <h2 className="text-xl font-black text-gray-900">Acceso Admin</h2>
              <p className="text-sm text-gray-500 mt-1">{orgName}</p> 
            </div>
            <form onSubmit={verifyPin}>
              <input 
                id="pin-input" type="password" maxLength={4} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className={`w-full text-center text-4xl tracking-[1em] font-black p-4 border-2 rounded-xl outline-none transition-all ${error ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 focus:border-black'}`}
                placeholder="••••" autoComplete="off"
              />
              <button className="w-full bg-black text-white font-bold py-4 rounded-xl mt-6 hover:bg-gray-800">Desbloquear</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}