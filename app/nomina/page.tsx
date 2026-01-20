"use client"
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Banknote, Calendar, Printer, Loader2, AlertCircle } from 'lucide-react'

export default function NominaPage() {
  const { orgName } = useOrganization()
  
  const [loading, setLoading] = useState(true)
  const [sellers, setSellers] = useState<any[]>([])
  // En lugar de guardar movimientos crudos, guardamos la "Nómina Ya Calculada" 👇
  const [payrollMap, setPayrollMap] = useState<Record<number, any>>({}) 
  
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 1. FECHAS (Igual)
  useEffect(() => {
    const curr = new Date()
    const first = curr.getDate() - curr.getDay() + 1 
    const last = first + 6 
    const monday = new Date(curr.setDate(first)).toISOString().split('T')[0]
    const sunday = new Date(curr.setDate(last)).toISOString().split('T')[0]
    setStartDate(monday); setEndDate(sunday)
  }, [])

  // 2. CARGA ULTRA-RÁPIDA Y CÁLCULO EN UNA SOLA PASADA ⚡️
  useEffect(() => {
     if (!startDate || !endDate) return

     const loadPayrollData = async () => {
        setLoading(true)
        
        const [sellersRes, movementsRes] = await Promise.all([
            supabase.from('sellers').select('*').order('name'),
            supabase.from('movements')
                // OPTIMIZACIÓN 1: Solo pedimos lo estrictamente necesario (Menos KB = Más velocidad)
                .select('seller_id, quantity, type, products(price)') 
                .gte('created_at', startDate + 'T00:00:00')
                .lte('created_at', endDate + 'T23:59:59')
        ])

        const sellerList = sellersRes.data || []
        const movementsList = movementsRes.data || []
        
        setSellers(sellerList)

        // OPTIMIZACIÓN 2: Pre-cálculo masivo (Single Pass)
        // Creamos un diccionario temporal para sumar todo de una sola vez
        const tempMap: Record<number, { salida: number, devolucion: number }> = {}

        // Inicializamos contadores para cada vendedor
        sellerList.forEach(s => { tempMap[s.id] = { salida: 0, devolucion: 0 } })

        // Una sola vuelta a los movimientos (Súper rápido)
        movementsList.forEach((m: any) => {
            const sId = m.seller_id
            if (tempMap[sId]) {
                const precio = m.products?.price || 0
                const monto = m.quantity * precio
                
                if (m.type === 'SALIDA') tempMap[sId].salida += monto
                if (m.type === 'DEVOLUCION') tempMap[sId].devolucion += monto
            }
        })

        // Ahora calculamos las comisiones finales basadas en los totales
        const finalPayroll: Record<number, any> = {}
        
        sellerList.forEach(seller => {
            if (!seller.commission_active) return

            const totals = tempMap[seller.id]
            const totalSalidaDinero = totals.salida
            const totalDevolucionDinero = totals.devolucion

            const ventaNeta = totalSalidaDinero - totalDevolucionDinero
            const porcentajeDevolucion = totalSalidaDinero > 0 ? (totalDevolucionDinero / totalSalidaDinero) * 100 : 0
            
            const pagoComision = ventaNeta * (seller.commission_rate / 100)
            const ganoBono = porcentajeDevolucion <= seller.bonus_threshold && totalSalidaDinero > 0 
            const pagoBono = ganoBono ? seller.bonus_amount : 0
            const sueldoBase = seller.base_salary || 0
            
            finalPayroll[seller.id] = {
                ventaNeta,
                porcentajeDevolucion,
                pagoComision,
                ganoBono,
                pagoBono,
                sueldoBase,
                granTotal: sueldoBase + pagoComision + pagoBono
            }
        })

        setPayrollMap(finalPayroll)
        setLoading(false)
     }

     loadPayrollData()
  }, [startDate, endDate])

  // IMPRESIÓN (Sin cambios)
  const printReceipt = (sellerId: number) => {
    const style = document.createElement('style');
    style.innerHTML = `@media print { body * { visibility: hidden; } #receipt-${sellerId}, #receipt-${sellerId} * { visibility: visible; } #receipt-${sellerId} { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; border: 1px solid #000; } .no-print { display: none !important; } .print-header { display: block !important; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; border-bottom: 1px solid black; padding-bottom: 10px; } }`;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  }

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32">
      <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
        <Banknote size={32} className="text-green-600"/> Nómina: {orgName}
      </h1>
      <p className="text-gray-500 mb-8">Calcula comisiones y bonos semanales automáticamente.</p>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-center w-fit">
          <div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase"><Calendar size={18}/> Periodo:</div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-100 p-2 rounded-lg font-bold outline-none cursor-pointer" />
          <span className="text-gray-300 font-bold">-</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-100 p-2 rounded-lg font-bold outline-none cursor-pointer" />
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 animate-in fade-in">
              <Loader2 className="animate-spin mb-4" size={40}/>
              <p>Procesando nómina...</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-5">
            {sellers.map(seller => {
                // OPTIMIZACIÓN 3: Lectura Directa (O(1)) - Ya no calculamos nada aquí
                const nomina = payrollMap[seller.id]

                if (!nomina) return (
                    <div key={seller.id} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 opacity-60 flex items-center justify-between">
                        <div><h3 className="text-lg font-bold text-gray-400">{seller.name}</h3><p className="text-xs font-bold text-gray-400 mt-1">Sueldo Fijo / Sin Comisión</p></div>
                        <AlertCircle className="text-gray-300"/>
                    </div>
                )

                return (
                    <div id={`receipt-${seller.id}`} key={seller.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all relative overflow-hidden group">
                        
                        <div className="hidden print-header">
                            <div>{orgName}</div><div style={{fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px'}}>RECIBO DE NÓMINA</div>
                        </div>

                        <div className="flex justify-between items-start mb-4 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{seller.name}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{seller.route_name || 'Vendedor General'}</p>
                                <p className="text-[10px] text-gray-400 mt-1 hidden print:block">Periodo: {startDate} al {endDate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase font-bold">Total a Pagar</p>
                                <p className="text-3xl font-black text-green-600">${nomina.granTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            {nomina.sueldoBase > 0 && (<div className="flex justify-between text-gray-600"><span>Sueldo Base</span><span className="font-bold text-gray-900">${nomina.sueldoBase.toFixed(2)}</span></div>)}
                            <div className="flex justify-between text-gray-600"><span className="flex flex-col"><span>Comisión ({seller.commission_rate}%)</span><span className="text-[10px] text-gray-400">Sobre Venta Neta: ${nomina.ventaNeta.toFixed(0)}</span></span><span className="font-bold text-gray-900">${nomina.pagoComision.toFixed(2)}</span></div>
                            <div className={`flex justify-between items-center p-2 rounded-lg border ${nomina.ganoBono ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}><div><span className="font-bold block text-xs uppercase flex items-center gap-1">{nomina.ganoBono ? '🎉 Bono Ganado' : '❌ Bono Perdido'}</span><span className="text-[10px] opacity-80">Merma: {nomina.porcentajeDevolucion.toFixed(1)}% (Límite: {seller.bonus_threshold}%)</span></div><span className="font-bold">{nomina.ganoBono ? `+$${nomina.pagoBono}` : '$0.00'}</span></div>
                        </div>
                        
                        <div className="mt-12 pt-4 hidden print:block"><div className="border-b border-black w-3/4 mx-auto mb-2"></div><p className="text-center text-xs text-black font-bold uppercase">Firma de Conformidad</p></div>

                        <button onClick={() => printReceipt(seller.id)} className="no-print mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 hover:bg-black shadow-lg"><Printer size={16}/> Imprimir Recibo</button>
                    </div>
                )
            })}
        </div>
      )}
    </div>
  )
}