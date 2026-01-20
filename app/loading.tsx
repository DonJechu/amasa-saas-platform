// app/loading.tsx
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 z-50">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-4 rounded-2xl shadow-xl mb-4">
            <Loader2 className="h-10 w-10 text-black animate-spin" />
        </div>
        <h2 className="text-gray-500 font-bold text-sm tracking-wider animate-pulse">
            CARGANDO AMASA...
        </h2>
      </div>
    </div>
  )
}