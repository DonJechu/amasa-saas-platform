"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization' // <--- IMPORT
import { User, Calculator, Wallet, AlertCircle, Lock } from 'lucide-react'
import { sendWhatsAppAlert } from '@/utils/whatsapp'

export default function DevolucionPage() {
  const { orgId, orgName } = useOrganization() // <--- USO
  const [sellers, setSellers] = useState<any[]>([])
  const [selectedSeller, setSelectedSeller] = useState('')
  const [movements, setMovements] = useState<any[]>([])
  const [returns, setReturns] = useState<Record<number, number>>({}) 
  const [loading, setLoading] = useState(false)

  // ESTADOS FINANCIEROS
  const [currentDebt, setCurrentDebt] = useState(0)     
  const [cashReceived, setCashReceived] = useState('')
  const [isRouteClosed, setIsRouteClosed] = useState(false)

  // Cargar lista de vendedores (RLS filtra automático)
  useEffect(() => {
    supabase.from('sellers').select('*').then(({ data }) => setSellers(data || []))
  }, [])

  // Cargar datos al seleccionar vendedor
  useEffect(() => {
    if (!selectedSeller) {
      setMovements([]); setCurrentDebt(0); setCashReceived(''); setIsRouteClosed(false); return
    }

    const fetchData = async () => {
      const date = new Date()
      const today = date.toLocaleDateString('en-CA') 
      
      // 1. REVISAR SI YA PAGÓ HOY (RLS filtra)
      const { data: payments } = await supabase.from('payments').select('*').eq('seller_id', parseInt(selectedSeller)).gte('created_at', today + 'T00:00:00')
      
      if (payments && payments.length > 0) { setIsRouteClosed(true); return } else { setIsRouteClosed(false) }

      // 2. Traer movimientos de SALIDA del día (RLS filtra)
      const { data: movs } = await supabase.from('movements').select('*, products(id, name, price)').eq('seller_id', parseInt(selectedSeller)).eq('type', 'SALIDA').gte('created_at', today)
      
      // 3. Traer Saldo (RLS filtra)
      const { data: sellerData } = await supabase.from('sellers').select('balance').eq('id', parseInt(selectedSeller)).single()

      setMovements(movs || [])
      setCurrentDebt(sellerData?.balance || 0)
    }
    fetchData()
  }, [selectedSeller])

  // --- CÁLCULOS MATEMÁTICOS ---
  const dailySaleTotal = movements.reduce((acc, mov) => {
    const devolucion = returns[mov.products.id] || 0
    const vendido = mov.quantity - devolucion
    const realVendido = vendido > 0 ? vendido : 0
    return acc + (realVendido * mov.products.price)
  }, 0)

  const grandTotal = dailySaleTotal + currentDebt
  const paidAmount = parseFloat(cashReceived) || 0
  const remainingBalance = grandTotal - paidAmount

  const handleSaveReturns = async () => {
    if (!orgId) return // VALIDAR ORGID

    setLoading(true)
    const sellerId = parseInt(selectedSeller)

    // A. Registrar Devoluciones con ORG_ID
    const returnsPayload = Object.entries(returns).map(([productId, qty]) => ({
      seller_id: sellerId,
      product_id: parseInt(productId),
      quantity: Number(qty),
      type: 'DEVOLUCION',
      organization_id: orgId // <--- ETIQUETA SAAS
    }))

    if (returnsPayload.length > 0) {
      const { error } = await supabase.from('movements').insert(returnsPayload)
      if (error) { alert('Error al guardar devoluciones'); setLoading(false); return; }
    }

    // B. Registrar el Pago con ORG_ID
    await supabase.from('payments').insert({
      seller_id: sellerId,
      amount: paidAmount,
      notes: `Corte del día. Venta: $${dailySaleTotal}, Deuda Prev: $${currentDebt}`,
      organization_id: orgId // <--- ETIQUETA SAAS
    })

    // C. Actualizar Saldo (No necesita org_id explícito si RLS funciona)
    const { error: balanceError } = await supabase.from('sellers').update({ balance: remainingBalance }).eq('id', sellerId)

    if (!balanceError) {
      const sellerName = sellers.find(s => s.id === sellerId)?.name || "Vendedor"
      // Mensaje personalizado con nombre de la empresa
      const msg = `💰 *CORTE DE CAJA - ${orgName.toUpperCase()}*\n👤 *Vendedor:* ${sellerName}\n💵 *Entregó:* $${paidAmount}\n📉 *Saldo Pendiente:* $${remainingBalance.toFixed(2)}\n📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}`
      
      await sendWhatsAppAlert(msg) // Asegúrate de actualizar sendWhatsAppAlert para soportar SaaS si usa un número dinámico
      alert(`✅ CORTE GUARDADO`)
      window.location.reload()
    } else {
      alert('Error actualizando saldo: ' + balanceError.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 pb-32">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900">🔄 Corte: {orgName}</h1>
        <p className="text-gray-500">Registra merma y cobra el dinero del día.</p>
      </div>

      {/* Selector Vendedor */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><User size={16} /> Selecciona Vendedor para Corte</label>
        <select className="w-full p-4 text-lg border border-gray-300 rounded-xl bg-gray-50 outline-none" value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)}>
          <option value="">-- Selecciona --</option>
          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* LÓGICA DE BLOQUEO (IGUAL) */}
      {isRouteClosed ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center animate-in zoom-in-95">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><Lock size={40} /></div>
              <h2 className="text-2xl font-black text-green-800 mb-2">Corte Ya Realizado</h2>
              <p className="text-green-700 max-w-md mx-auto">Este vendedor ya cerró su caja hoy.</p>
              <button onClick={() => setSelectedSeller('')} className="mt-6 text-green-700 font-bold underline hover:text-green-900">Seleccionar otro vendedor</button>
          </div>
      ) : (
          <>
            {movements.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* TABLA DE DEVOLUCIONES (IGUAL) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-fit">
                    <div className="grid grid-cols-12 bg-gray-50 p-4 font-bold text-xs text-gray-500 uppercase tracking-wider border-b"><div className="col-span-6">Producto</div><div className="col-span-2 text-center">Llevó</div><div className="col-span-2 text-center">Devuelve</div><div className="col-span-2 text-right">$$</div></div>
                    {movements.map((mov) => {
                    const dev = returns[mov.products.id] || 0
                    const vendido = mov.quantity - dev
                    const dinero = (vendido * mov.products.price).toFixed(2)
                    return (
                        <div key={mov.id} className="grid grid-cols-12 p-4 border-b items-center hover:bg-gray-50 transition-colors text-sm md:text-base">
                        <div className="col-span-6"><span className="font-bold text-gray-900 block">{mov.products.name}</span><span className="text-xs text-gray-400 font-mono">${mov.products.price}</span></div>
                        <div className="col-span-2 text-center font-bold text-gray-400">{mov.quantity}</div>
                        <div className="col-span-2 px-1"><input type="number" className="w-full border-2 border-orange-100 rounded-lg p-1 text-center font-bold text-red-600 focus:border-red-500 outline-none" placeholder="0" min="0" max={mov.quantity} onFocus={(e) => e.target.select()} onChange={(e) => setReturns({...returns, [mov.products.id]: Number(e.target.value)})} /></div>
                        <div className="col-span-2 text-right font-mono font-bold text-green-700">${dinero}</div>
                        </div>
                    )})}
                </div>

                {/* PANEL DE COBRO (IGUAL) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wallet className="text-green-400"/> Resumen Financiero</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-400"><span>Venta del Pan:</span><span>${dailySaleTotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-orange-400 font-bold bg-orange-900/20 p-2 rounded-lg"><span>+ Deuda Anterior:</span><span>${currentDebt.toFixed(2)}</span></div>
                            <div className="border-t border-gray-700 pt-3 flex justify-between text-2xl font-black"><span>Total a Pagar:</span><span>${grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Efectivo Recibido</label>
                        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold text-xl">$</span><input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full p-4 pl-10 text-3xl font-black text-black bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all" placeholder="0.00" /></div>
                    </div>

                    <div className={`p-6 rounded-2xl border-2 text-center transition-all ${remainingBalance > 0.5 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <p className={`text-xs font-bold uppercase mb-1 ${remainingBalance > 0.5 ? 'text-red-500' : 'text-green-600'}`}>{remainingBalance > 0.5 ? 'QUEDA DEBIENDO (Saldo)' : 'CUENTA SALDADA / A FAVOR'}</p>
                        <p className={`text-4xl font-black tracking-tight ${remainingBalance > 0.5 ? 'text-red-600' : 'text-green-600'}`}>${remainingBalance.toFixed(2)}</p>
                    </div>

                    <button onClick={handleSaveReturns} disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                        {loading ? 'Procesando...' : <><Calculator size={20}/> Cerrar Caja</>}
                    </button>
                </div>
                </div>
            ) : (
                selectedSeller && ( <div className="text-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300"><AlertCircle className="mx-auto text-gray-300 mb-2" size={48}/><p className="text-gray-400 font-medium">Este vendedor no sacó pan hoy.</p>{currentDebt > 0 && (<div className="mt-4 inline-block bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-bold">Deuda pendiente: ${currentDebt}</div>)}</div> )
            )}
          </>
      )}
    </div>
  )
}