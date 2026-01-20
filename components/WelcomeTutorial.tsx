"use client"
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { X, CheckCircle, ShoppingCart, Settings, FileText, ChevronRight } from 'lucide-react'

interface Props {
  orgId: string
  orgName: string
  onClose: () => void
}

export default function WelcomeTutorial({ orgId, orgName, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [closing, setClosing] = useState(false)

  const handleFinish = async () => {
    setClosing(true)
    // 1. Apagamos el tutorial en la base de datos para siempre
    await supabase
      .from('organizations')
      .update({ show_tutorial: false })
      .eq('id', orgId)
    
    // 2. Cerramos visualmente
    onClose()
  }

  // CONTENIDO DE LOS PASOS
  const steps = [
    {
      title: `¡Bienvenido a ${orgName}!`,
      content: "El sistema ya está configurado con tus vendedores, recetas y productos. Todo está listo para operar.",
      icon: <div className="text-4xl">👋</div>
    },
    {
      title: "1. Venta (Caja)",
      content: "Usa el botón 'Caja (POS)' para cobrar en mostrador. El sistema descontará inventario y calculará el cambio automáticamente.",
      icon: <ShoppingCart size={40} className="text-blue-500" />
    },
    {
      title: "2. Administración",
      content: "En el ícono de engrane (⚙️) puedes ajustar precios, ver a tus vendedores y modificar recetas.",
      icon: <Settings size={40} className="text-gray-600" />
    },
    {
      title: "3. Reportes",
      content: "Aquí en el Dashboard principal verás tus ventas en tiempo real. Si algo se pone en rojo, ¡necesita tu atención!",
      icon: <FileText size={40} className="text-orange-500" />
    }
  ]

  const currentStep = steps[step - 1]

  if (closing) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative">
        
        {/* Barra de Progreso */}
        <div className="h-2 bg-gray-100 w-full">
            <div 
                className="h-full bg-black transition-all duration-500 ease-out" 
                style={{ width: `${(step / steps.length) * 100}%` }}
            ></div>
        </div>

        <div className="p-8 text-center">
          <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            {currentStep.icon}
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">{currentStep.title}</h2>
          <p className="text-gray-500 mb-8 text-lg leading-relaxed">{currentStep.content}</p>

          <div className="flex gap-3">
            {step > 1 && (
                <button 
                    onClick={() => setStep(step - 1)}
                    className="flex-1 py-3 font-bold text-gray-400 hover:text-gray-600"
                >
                    Atrás
                </button>
            )}
            
            {step < steps.length ? (
                <button 
                    onClick={() => setStep(step + 1)}
                    className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all flex justify-center items-center gap-2"
                >
                    Siguiente <ChevronRight size={20}/>
                </button>
            ) : (
                <button 
                    onClick={handleFinish}
                    className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-all flex justify-center items-center gap-2 shadow-lg shadow-green-200"
                >
                    <CheckCircle size={20}/> ¡Entendido, Iniciar!
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}