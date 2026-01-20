"use client"
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization' 
import { getLocalDateISO, formatDateTime } from '@/utils/dateUtils'
import { TrendingUp, ShoppingBag, Users, Activity, DollarSign, Clock, Loader2 } from 'lucide-react'
import WelcomeTutorial from '@/components/WelcomeTutorial'

export default function Home() {
  const { orgId, orgName, showTutorial, loading: orgLoading } = useOrganization()

  const [loading, setLoading] = useState(true)
  
  // Agrupamos el estado para hacer menos renders
  const [dashboardData, setDashboardData] = useState({
     dineroEnCalle: 0,
     panSalida: 0,
     vendedoresActivos: 0,
     sellersRanking: [] as any[],
     recentActivity: [] as any[]
  })

  // 1. FUNCIÓN DE CARGA OPTIMIZADA (Memorizada con useCallback)
  const getDashboardData = useCallback(async () => {
      // No ponemos loading(true) aquí para que la recarga de 30s sea silenciosa (sin parpadeo)
      
      const today = getLocalDateISO()

      // OPTIMIZACIÓN: Solo pedimos columnas vitales
      const { data: movements } = await supabase
        .from('movements')
        .select('id, type, quantity, created_at, products(name, price), sellers(name)')
        .gte('created_at', today)
        .order('created_at', { ascending: false })

      if (movements) {
        let dineroTotal = 0
        let piezasTotal = 0
        const sellersMap: Record<string, number> = {}

        // BUCLE DE UNA SOLA PASADA (O(n))
        movements.forEach(m => {
          if (m.type === 'SALIDA') {
            // @ts-ignore
            const precio = m.products?.price || 0
            const monto = m.quantity * precio
            
            dineroTotal += monto
            piezasTotal += m.quantity
            
            // @ts-ignore
            const vendedorNombre = m.sellers?.name
            if (vendedorNombre) {
                sellersMap[vendedorNombre] = (sellersMap[vendedorNombre] || 0) + monto
            }
          }
        })

        // Ordenamos Ranking
        const ranking = Object.entries(sellersMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)

        setDashboardData({
            dineroEnCalle: dineroTotal,
            panSalida: piezasTotal,
            vendedoresActivos: Object.keys(sellersMap).length,
            sellersRanking: ranking,
            recentActivity: movements.slice(0, 10) // Solo los ultimos 10
        })
      }
      setLoading(false)
  }, []) // Sin dependencias para que sea estable

  // 2. EFECTO DE CARGA Y AUTO-RECARGA
  useEffect(() => {
    getDashboardData() // Carga inicial

    // Polling inteligente cada 30s
    const interval = setInterval(() => {
        getDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [getDashboardData])

  return (
    <main className="p-6 md:p-10 min-h-screen bg-gray-50">
      
      {/* TUTORIAL */}
      {!orgLoading && showTutorial && orgId && (
          <WelcomeTutorial 
            orgId={orgId} 
            orgName={orgName} 
            onClose={() => window.location.reload()} 
          />
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
             {orgLoading ? '...' : `Hola, ${orgName || 'Patrón'} 👋`}
          </h1>
          <p className="text-gray-500 text-sm">Resumen de operaciones en tiempo real.</p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 animate-in fade-in">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistema En Línea</span>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-gray-400" size={40}/>
            <p className="text-gray-400 text-sm animate-pulse">Sincronizando rutas...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-5 duration-500">
          
          {/* TARJETAS DE RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Dinero */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] bg-green-50 p-4 rounded-full transition-transform group-hover:scale-110">
                  <DollarSign className="text-green-600" size={32} />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Venta Estimada</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">${dashboardData.dineroEnCalle.toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 w-fit px-2 py-1 rounded-lg"><TrendingUp size={14} /> Hoy</div>
            </div>

            {/* Piezas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] bg-orange-50 p-4 rounded-full transition-transform group-hover:scale-110">
                  <ShoppingBag className="text-orange-600" size={32} />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Despachado</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{dashboardData.panSalida} <span className="text-lg text-gray-400 font-medium">pzas</span></p>
              <div className="mt-4 flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 w-fit px-2 py-1 rounded-lg"><Activity size={14} /> Producción</div>
            </div>

            {/* Vendedores */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] bg-blue-50 p-4 rounded-full transition-transform group-hover:scale-110">
                  <Users className="text-blue-600" size={32} />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Equipo Activo</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{dashboardData.vendedoresActivos}</p>
              <div className="mt-4 text-xs text-blue-600 font-bold bg-blue-50 w-fit px-2 py-1 rounded-lg">Rutas</div>
            </div>
          </div>

          {/* RANKING Y ACTIVIDAD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* RANKING */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><Users size={20} className="text-blue-600"/> Desglose por Ruta</h2>
                 <div className="space-y-2">
                     {dashboardData.sellersRanking.map((seller, index) => (
                         <div key={seller.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${index === 0 ? 'bg-yellow-400 shadow-md' : 'bg-gray-300'}`}>{index + 1}</div>
                                 <span className="font-bold text-gray-700">{seller.name}</span>
                             </div>
                             <span className="font-mono font-black text-gray-900">${seller.total.toLocaleString()}</span>
                         </div>
                     ))}
                     {dashboardData.sellersRanking.length === 0 && <p className="text-gray-400 text-sm italic py-4 text-center">Nadie ha salido a ruta aún.</p>}
                 </div>
             </div>

             {/* ÚLTIMOS MOVIMIENTOS */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="text-gray-400" size={20}/> Últimos Movimientos</h2>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">En tiempo real</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                    {dashboardData.recentActivity.length === 0 ? (
                        <p className="p-6 text-gray-400 italic text-center">Aún no hay actividad hoy.</p>
                    ) : (
                        dashboardData.recentActivity.map((mov) => (
                            <div key={mov.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${mov.type === 'SALIDA' ? 'bg-orange-400' : 'bg-red-500'}`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{mov.type === 'SALIDA' ? 'Despacho' : 'Devolución'}</p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {/* @ts-ignore */}
                                            {mov.sellers?.name} • {formatDateTime(mov.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {/* @ts-ignore */}
                                    <p className="text-sm font-black text-gray-900">{mov.quantity} {mov.products?.name}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
        </div>
      )}
    </main>
  )
}