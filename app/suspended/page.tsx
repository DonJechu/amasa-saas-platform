"use client"
import { Lock, Phone, CreditCard } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      
      <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
          <Lock size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-2">Servicio Pausado</h1>
        <p className="text-gray-500 font-medium mb-8">
          Tu suscripción ha vencido o requiere atención. Para reactivar el sistema y recuperar acceso a tus datos, por favor realiza tu pago.
        </p>

        <div className="space-y-3">
          <button 
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all flex justify-center items-center gap-2 shadow-lg shadow-green-200"
            onClick={() => window.open('https://wa.me/527661033386?text=Hola,%20quiero%20reactivar%20mi%20sistema', '_blank')}
          >
            <Phone size={20} /> Contactar Soporte
          </button>
          
          <div className="flex justify-center gap-4 mt-6 opacity-50">
            <CreditCard size={24}/>
            <span className="text-xs font-bold uppercase tracking-widest mt-1">Pagos Seguros</span>
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-xs mt-8 font-mono">CODE: SUSPENDED_ACCESS_DENIED</p>
    </div>
  )
}