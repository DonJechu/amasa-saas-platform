"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { Lock, Mail, Loader2, ShieldCheck, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciales incorrectas')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* LOGO Y TÍTULO */}
        <div className="text-center mb-8">
          <div className="bg-black w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-purple-500/50">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Bienvenido</h1>
          <p className="text-gray-500 text-sm">Ingresa a tu panel de control</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Correo</label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl focus-within:border-black transition-colors">
              <Mail className="text-gray-400" size={20} />
              <input 
                required
                type="email"
                className="bg-transparent outline-none w-full font-bold text-gray-800"
                placeholder="usuario@negocio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Contraseña</label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl focus-within:border-black transition-colors">
              <Lock className="text-gray-400" size={20} />
              <input 
                required
                type="password"
                className="bg-transparent outline-none w-full font-bold text-gray-800"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Iniciar Sesión'}
          </button>
        </form>

        {/* === TÉRMINOS Y CONDICIONES (LA PARTE ABURRIDA) === */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 leading-tight">
                Al ingresar, aceptas que este software es una <b>herramienta de apoyo administrativo</b>. 
                El usuario es el único responsable de la veracidad de los datos y del cumplimiento de sus obligaciones fiscales ante el SAT. 
                El proveedor no se hace responsable por pérdidas de datos, fallas de conexión o interrupciones del servicio.
            </p>
            
            <a 
                href="https://wa.me/527661033386" 
                target="_blank" 
                className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-gray-500 hover:text-black transition-colors"
            >
                <HelpCircle size={12}/> ¿Necesitas Soporte Técnico?
            </a>
        </div>

      </div>
      
      <p className="text-gray-600 text-xs mt-8 font-mono">v1.2.0 • Sistema Seguro</p>
    </div>
  )
}