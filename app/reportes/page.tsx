"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, User, ShieldCheck, Trophy, Loader2 } from 'lucide-react'
import { getLocalDateISO } from '@/utils/dateUtils'

export default function ReportesPage() {
  const { orgName } = useOrganization()
  const [stats, setStats] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [globalTotal, setGlobalTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // VISTA
  const [viewMode, setViewMode] = useState<'ADMIN' | 'VENDEDOR'>('ADMIN')
  const [selectedSellerId, setSelectedSellerId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true) // Aseguramos loading visual
      const today = getLocalDateISO()

      // 1. OPTIMIZACIÓN: PARALELISMO (Pedimos todo junto) ⚡️
      const [sellerRes, movRes] = await Promise.all([
        supabase.from('sellers').select('id, name').order('name'),
        supabase.from('movements')
          .select('quantity, type, seller_id, product_id, sellers(name), products(name, price)') // Solo lo necesario
          .gte('created_at', today)
      ])

      const sellerList = sellerRes.data || []
      const movements = movRes.data || []
      setSellers(sellerList)

      if (movements.length === 0) {
        setLoading(false)
        return
      }

      // 2. OPTIMIZACIÓN: ALGORITMO DE UNA SOLA PASADA (Single Pass) 🏎️
      // En lugar de filtrar mil veces, recorremos una sola vez y sumamos.
      
      const sellerMap: Record<string, any> = {}
      const productMap: Record<string, number> = {}
      let totalDia = 0

      // Inicializamos el mapa con los vendedores (para que aparezcan aunque tengan 0 ventas)
      sellerList.forEach(s => {
          sellerMap[s.id] = { 
              id: s.id, 
              name: s.name, 
              llevado: 0, 
              devuelto: 0, 
              dinero: 0,
              vendido: 0,
              eficiencia: 0
          }
      })

      // Único bucle pesado
      movements.forEach(m => {
        const sId = m.seller_id
        // @ts-ignore
        const pName = m.products?.name || 'Item'
        // @ts-ignore
        const price = m.products?.price || 0
        const qty = m.quantity

        // Si el vendedor fue borrado pero hay historial, lo creamos al vuelo (seguridad)
        if (!sellerMap[sId]) {
             // @ts-ignore
             sellerMap[sId] = { id: sId, name: m.sellers?.name || 'Ex-Vendedor', llevado: 0, devuelto: 0, dinero: 0, vendido: 0 }
        }

        if (m.type === 'SALIDA') {
            sellerMap[sId].llevado += qty
            sellerMap[sId].dinero += (qty * price) // Sumamos valor potencial
            productMap[pName] = (productMap[pName] || 0) + qty
        } else if (m.type === 'DEVOLUCION') {
            sellerMap[sId].devuelto += qty
            sellerMap[sId].dinero -= (qty * price) // Restamos valor devuelto
        }
      })

      // 3. POST-PROCESAMIENTO (Cálculos finales rápidos)
      const finalStats = Object.values(sellerMap).map((s: any) => {
          const ventaReal = Math.max(0, s.llevado - s.devuelto)
          // Dinero ya se calculó en el bucle principal (Salida$ - Devolución$)
          // Solo sumamos al global
          totalDia += s.dinero
          
          return {
              ...s,
              vendido: ventaReal,
              // Evitamos división por cero
              eficiencia: s.llevado > 0 ? ((ventaReal / s.llevado) * 100).toFixed(0) : 0
          }
      })

      // Ordenar Top Productos
      const topProds = Object.entries(productMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Top 5
        .map(([name, qty]) => ({ name, qty }))

      setStats(finalStats)
      setTopProducts(topProds)
      setGlobalTotal(totalDia)
      setLoading(false)
    }

    fetchData()
  }, [])

  const myStat = stats.find(s => s.id === parseInt(selectedSellerId))

  return (
    <div className="max-w-5xl mx-auto p-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">📊 Reportes: {orgName}</h1>
        </div>
        
        <div className="bg-gray-100 p-1 rounded-xl flex">
          <button onClick={() => setViewMode('ADMIN')} className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'ADMIN' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}><ShieldCheck size={16} /> Vista Dueño</button>
          <button onClick={() => setViewMode('VENDEDOR')} className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'VENDEDOR' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}><User size={16} /> Soy Vendedor</button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-400 mb-2" size={40} />
            <p className="text-gray-400 text-sm">Analizando ventas...</p>
        </div>
      ) : (
        <>
          {/* === VISTA VENDEDOR === */}
          {viewMode === 'VENDEDOR' && (
            <div className="max-w-xl mx-auto animate-in fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <h2 className="text-xl font-bold text-gray-500 mb-6">Consulta tu desempeño hoy</h2>
                <select className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl mb-8 text-center font-bold" value={selectedSellerId} onChange={(e) => setSelectedSellerId(e.target.value)}>
                  <option value="">-- Busca tu nombre --</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedSellerId && myStat ? (
                  <div className="space-y-6 animate-in slide-in-from-bottom-2">
                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100"><p className="text-sm font-bold text-green-600 uppercase mb-1">Tu Ganancia Generada</p><p className="text-5xl font-black text-green-700 tracking-tighter">${myStat.dinero.toFixed(2)}</p></div>
                    <div className="grid grid-cols-2 gap-4"><div className="bg-gray-50 p-4 rounded-xl"><p className="text-xs font-bold text-gray-400 uppercase">Efectividad</p><p className={`text-3xl font-black ${Number(myStat.eficiencia) > 80 ? 'text-green-600' : 'text-orange-500'}`}>{myStat.eficiencia}%</p></div><div className="bg-gray-50 p-4 rounded-xl"><p className="text-xs font-bold text-gray-400 uppercase">Vendido</p><p className="text-3xl font-black text-gray-800">{myStat.vendido} <span className="text-sm text-gray-400 font-normal">pzas</span></p></div></div>
                    {Number(myStat.eficiencia) > 90 && (<div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center justify-center gap-2 font-bold border border-yellow-200"><Trophy className="text-yellow-600" /> ¡Excelente trabajo hoy!</div>)}
                  </div>
                ) : selectedSellerId ? (<p className="text-gray-400 italic">Aún no tienes registros hoy.</p>) : null}
              </div>
            </div>
          )}

          {/* === VISTA ADMIN === */}
          {viewMode === 'ADMIN' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
               <div className="lg:col-span-3 bg-black text-white p-6 rounded-2xl flex justify-between items-center mb-4 shadow-lg"><div><h2 className="text-xl font-bold">Resumen Global</h2><p className="text-gray-400 text-sm">Venta total de {orgName} hoy</p></div><div className="text-right"><p className="text-4xl font-black text-green-400">${globalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p></div></div>
               
               <div className="lg:col-span-2 space-y-4">
                  {stats.map((stat) => (
                    <div key={stat.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                        <div><h3 className="text-xl font-black text-gray-800">{stat.name}</h3><div className="flex gap-4 text-sm mt-1"><span className="text-gray-500">Llevó: <b>{stat.llevado}</b></span><span className="text-red-400">Regresó: <b>{stat.devuelto}</b></span></div></div>
                        <div className="text-right"><p className="text-2xl font-black text-green-600">${stat.dinero.toFixed(2)}</p><span className={`text-xs font-bold px-2 py-1 rounded ${Number(stat.eficiencia) > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{stat.eficiencia}% Efic.</span></div>
                    </div>
                  ))}
               </div>

               <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-64"><p className="font-bold text-gray-500 mb-4 text-sm uppercase">Comparativa</p><ResponsiveContainer width="100%" height="100%"><BarChart data={stats}><XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} /><Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} /><Bar dataKey="dinero" radius={[4, 4, 0, 0]}>{stats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.dinero > 500 ? '#22c55e' : '#f97316'} />))}</Bar></BarChart></ResponsiveContainer></div>
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100"><h2 className="font-bold text-orange-900 mb-4 flex items-center gap-2"><Package size={20} /> Top Productos</h2><ul className="space-y-3">{topProducts.map((prod, idx) => (<li key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm"><span className="font-medium text-gray-700 flex gap-2"><span className="text-orange-400 font-bold">#{idx+1}</span> {prod.name}</span><span className="font-black text-gray-900">{prod.qty}</span></li>))}</ul></div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}