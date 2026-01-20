"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { ChefHat, Calendar, TrendingUp, AlertTriangle, Beaker, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ProduccionPage() {
  const { orgId, orgName } = useOrganization()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [predictions, setPredictions] = useState<any[]>([])
  const [stockList, setStockList] = useState<any[]>([])
  
  // CONFIGURACIÓN: Margen de seguridad (15% extra)
  const SAFETY_MARGIN = 1.15 

  // CONFIGURACIÓN SaaS
  const businessConfig = {
    actionVerb: "hornear", 
    actionLabel: "Hornear",
    materialsName: "ingredientes",
    storageName: "Almacén",
    recipeName: "receta"
  }

  // ESTADO INICIAL: Mañana
  const [targetDate, setTargetDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toLocaleDateString('en-CA'); 
  })

  // CÁLCULO OPTIMIZADO CON PROMISE.ALL ⚡️
  useEffect(() => {
    calculateProduction()
  }, [targetDate])

  const calculateProduction = async () => {
    setLoading(true)
    
    const dateObj = new Date(targetDate + 'T12:00:00')
    const targetDayIndex = dateObj.getDay()

    // 1. DISPARAMOS LAS 3 PETICIONES AL MISMO TIEMPO
    const [productsResult, movementsResult, stockResult] = await Promise.all([
        // A. Productos con sus recetas
        supabase.from('products').select('*, product_ingredients(quantity, ingredients(id, name, unit))').order('id'),
        // B. Movimientos (Historial de ventas)
        supabase.from('movements').select('*'),
        // C. Stock Actual (Ingredientes)
        supabase.from('ingredients').select('*')
    ])

    const products = productsResult.data
    const movements = movementsResult.data
    const stock = stockResult.data

    if (!products || !movements || !stock) { setLoading(false); return }

    // 2. ACTUALIZAMOS EL STOCK FRESCO
    setStockList(stock)

    // 3. EL ALGORITMO DEL ORÁCULO
    const report = products.map(prod => {
      const sameDayMovements = movements.filter(m => {
        const movDate = new Date(m.created_at)
        return movDate.getDay() === targetDayIndex && m.product_id === prod.id
      })

      if (sameDayMovements.length === 0) {
        return { ...prod, suggested: 0, avgSale: 0, historyCount: 0, status: 'NO_DATA' }
      }

      let totalSold = 0
      // Obtenemos fechas únicas para sacar el promedio diario real
      const uniqueDates = [...new Set(sameDayMovements.map(m => new Date(m.created_at).toLocaleDateString('en-CA')))]
      
      uniqueDates.forEach(dateStr => {
        const movesOnDate = sameDayMovements.filter(m => new Date(m.created_at).toLocaleDateString('en-CA') === dateStr)
        const salidas = movesOnDate.filter(m => m.type === 'SALIDA').reduce((sum, m) => sum + m.quantity, 0)
        const dev = movesOnDate.filter(m => m.type === 'DEVOLUCION').reduce((sum, m) => sum + m.quantity, 0)
        const realSale = salidas - dev
        totalSold += (realSale > 0 ? realSale : 0)
      })

      const avgSale = Math.ceil(totalSold / (uniqueDates.length || 1))
      const suggested = Math.ceil(avgSale * SAFETY_MARGIN)

      return { ...prod, avgSale, suggested, historyCount: uniqueDates.length, status: 'OK' }
    })
    
    setPredictions(report)
    setLoading(false)
  }

  // --- CÁLCULO DE MATERIA PRIMA (EN TIEMPO REAL) ---
  const rawMaterialTotals: Record<string, { id: number, totalNeeded: number, currentStock: number, unit: string, status: 'OK' | 'FALTA' }> = {}
  let canProduce = true 

  predictions.forEach(pred => {
     if (pred.product_ingredients && pred.suggested > 0) {
        // @ts-ignore
        pred.product_ingredients.forEach((ingRel: any) => {
           const ingName = ingRel.ingredients.name
           const ingId = ingRel.ingredients.id
           const ingUnit = ingRel.ingredients.unit
           const totalNeeded = pred.suggested * ingRel.quantity
           const currentStock = stockList.find(i => i.id === ingId)?.current_stock || 0

           if (!rawMaterialTotals[ingName]) {
              rawMaterialTotals[ingName] = { id: ingId, totalNeeded: 0, currentStock: currentStock, unit: ingUnit, status: 'OK' }
           }
           rawMaterialTotals[ingName].totalNeeded += totalNeeded
        })
     }
  })

  // Validación de Stock Suficiente
  Object.keys(rawMaterialTotals).forEach(key => {
      const item = rawMaterialTotals[key]
      if (item.totalNeeded > item.currentStock) {
          item.status = 'FALTA'
          canProduce = false
      }
  })

  // --- FUNCIÓN PARA DESCONTAR INVENTARIO ---
  const handleConfirmProduction = async () => {
    if (!orgId) return 
    if (!confirm(`¿Confirmar producción? Esto descontará los ${businessConfig.materialsName} del ${businessConfig.storageName.toLowerCase()}.`)) return
    
    setProcessing(true)
    
    // 1. Descontar Ingredientes
    for (const key of Object.keys(rawMaterialTotals)) {
        const item = rawMaterialTotals[key]
        const newStock = item.currentStock - item.totalNeeded
        await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', item.id)
    }

    // 2. Registrar en Bitácora
    await supabase.from('audit_logs').insert({
        action: 'Producción',
        details: `Se confirmó producción del día ${targetDate}. Inventario descontado.`,
        organization_id: orgId
    })

    alert("✅ Producción confirmada e inventario actualizado.")
    setProcessing(false)
    
    // 3. Recargar TODO (Predicciones + Stock fresco)
    calculateProduction() 
  }

  const getDayName = (dateStr: string) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const d = new Date(dateStr + 'T12:00:00')
    return days[d.getDay()]
  }

  return (
    <div className="max-w-6xl mx-auto p-8 pb-32">
      
      {/* HEADER */}
      <div className="bg-black text-white p-8 rounded-3xl mb-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <ChefHat size={32} className="text-orange-400" /> Producción: {orgName}
          </h1>
          <p className="text-gray-400">Te sugerimos cuánto {businessConfig.actionVerb} basándonos en tu historial.</p>
        </div>
        <div className="absolute right-[-20px] top-[-20px] text-gray-800 opacity-20 rotate-12"><ChefHat size={200} /></div>
      </div>

      {/* CONTROLES */}
      <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-2xl w-fit shadow-sm border border-gray-100">
          <Calendar size={20} className="text-gray-500" />
          <span className="font-bold text-gray-500">Predecir para:</span>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-gray-100 p-2 rounded-lg font-bold outline-none cursor-pointer" />
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-black text-xs uppercase ml-2">{getDayName(targetDate)}</span>
      </div>

      {/* GRID DE PREDICCIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={40}/>
                <p>Analizando historial y recetas...</p>
            </div>
        ) : (
          predictions.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex justify-between items-center relative overflow-hidden group hover:shadow-md transition-all">
               <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.status === 'OK' ? 'bg-black' : 'bg-gray-200'}`}></div>
               <div className="pl-4">
                  <h3 className="text-lg font-black text-gray-800">{item.name}</h3>
                  {item.status === 'OK' ? (<p className="text-xs text-gray-400 flex gap-1"><TrendingUp size={12}/> Promedio: {item.avgSale}</p>) : <span className="text-xs text-orange-400 font-bold">Sin datos históricos</span>}
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{businessConfig.actionLabel}</p>
                  <p className="text-4xl font-black">{item.suggested}</p>
               </div>
            </div>
          ))
        )}
      </div>

      {/* SECCIÓN MATERIA PRIMA */}
      {!loading && predictions.length > 0 && Object.keys(rawMaterialTotals).length > 0 && (
        <div className="border-t-2 border-dashed border-gray-200 pt-8 animate-in slide-in-from-bottom-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Beaker className="text-purple-600"/> Requerimiento de Insumos
                    </h2>
                    <p className="text-gray-500 text-sm">El sistema ha cruzado la {businessConfig.recipeName} con tu inventario actual.</p>
                </div>
                <button 
                    onClick={handleConfirmProduction} 
                    disabled={!canProduce || processing} 
                    className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 ${canProduce ? 'bg-black text-white hover:bg-gray-800 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    {processing ? <Loader2 className="animate-spin"/> : canProduce ? <CheckCircle2/> : <AlertTriangle/>}
                    {processing ? 'Descontando...' : canProduce ? 'Confirmar y Descontar Stock' : 'Falta Inventario'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(rawMaterialTotals).map(([name, data]) => (
                    <div key={name} className={`p-5 rounded-2xl border-2 transition-all ${data.status === 'OK' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className={`text-xs font-bold uppercase ${data.status === 'OK' ? 'text-green-600' : 'text-red-500'}`}>{name}</p>
                            {data.status === 'OK' ? <CheckCircle2 size={18} className="text-green-500"/> : <XCircle size={18} className="text-red-500"/>}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <p className={`text-2xl font-black ${data.status === 'OK' ? 'text-green-900' : 'text-red-900'}`}>
                                {data.unit === 'gramos' && data.totalNeeded >= 1000 ? (data.totalNeeded/1000).toFixed(1) : data.totalNeeded}
                            </p>
                            <span className="text-xs font-bold opacity-60">
                                {data.unit === 'gramos' && data.totalNeeded >= 1000 ? 'kg' : data.unit}
                            </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-black/5 text-xs flex justify-between">
                            <span className="text-gray-500">Tienes: <b>{data.unit === 'gramos' && data.currentStock >= 1000 ? (data.currentStock/1000).toFixed(1) + 'kg' : data.currentStock}</b></span>
                            {data.status === 'FALTA' && (<span className="text-red-600 font-bold bg-red-100 px-2 rounded">Faltan {data.totalNeeded - data.currentStock}</span>)}
                        </div>
                    </div>
                ))}
            </div>
            
            {!canProduce && (
                <div className="mt-6 bg-red-100 text-red-800 p-4 rounded-xl font-bold text-center border border-red-200 flex items-center justify-center gap-2">
                    <AlertTriangle/> No puedes confirmar la producción porque te faltan {businessConfig.materialsName}. Ve a "{businessConfig.storageName}" a registrar compras.
                </div>
            )}
        </div>
      )}
    </div>
  )
}