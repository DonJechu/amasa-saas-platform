"use client"
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization' // <--- IMPORT
import { Plus, Trash2, Save, User, CheckCircle2, AlertCircle } from 'lucide-react'

export default function DespachoPage() {
  const { orgId, orgName } = useOrganization() // <--- USO
  const [sellers, setSellers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([]) 
  const [selectedSeller, setSelectedSeller] = useState('')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentProdId, setCurrentProdId] = useState('')
  const [currentQty, setCurrentQty] = useState('')
  const qtyRef = useRef<HTMLInputElement>(null)
  const prodRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Selects automáticos por RLS
    supabase.from('sellers').select('*').then(({ data }) => setSellers(data || []))
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []))
  }, [])

  // ... (HANDLERS DE TECLADO Y AGREGAR A CARRITO IGUALES) ...
  const foundProduct = products.find(p => p.id === parseInt(currentProdId || '0'))
  const handleProductEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { if (foundProduct) { qtyRef.current?.focus() } else { alert("Ese código de pan no existe"); setCurrentProdId('') } } }
  const handleQtyEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && currentQty) { addItem() } }
  const addItem = () => { if (!foundProduct || !currentQty) return; setCart(prev => [{ product_id: foundProduct.id, product_name: foundProduct.name, quantity: parseInt(currentQty), type: 'SALIDA' }, ...prev]); setCurrentProdId(''); setCurrentQty(''); prodRef.current?.focus() }

  // --- GUARDAR SALIDA (SAAS) ---
  const handleSave = async () => {
    if (!selectedSeller) return alert('Selecciona un vendedor')
    if (cart.length === 0) return alert('La lista está vacía')
    if (!orgId) return

    setLoading(true)
    
    // AQUÍ ESTÁ EL CAMBIO CLAVE: Insertar organization_id en cada movimiento
    const payload = cart.map(item => ({
      seller_id: parseInt(selectedSeller),
      product_id: item.product_id,
      quantity: item.quantity,
      type: 'SALIDA',
      organization_id: orgId // <--- ETIQUETA SAAS
    }))

    const { error } = await supabase.from('movements').insert(payload)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`✅ Salida registrada para ${orgName}`)
      setCart([])
      setSelectedSeller('')
    }
    setLoading(false)
  }

  // ... (JSX IGUAL, SOLO AGREGAMOS EL NOMBRE DE LA ORG EN EL TÍTULO) ...
  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900">🚚 Salida: {orgName}</h1>
      </div>
      {/* ... RESTO DEL JSX IGUALITO ... */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6"><label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><User size={16} /> ¿Quién se lleva el pan?</label><select className="w-full p-4 text-lg border border-gray-300 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500" value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)}><option value="">-- Selecciona Vendedor --</option>{sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      {selectedSeller && ( <div className="bg-orange-50 p-6 rounded-2xl mb-8 border border-orange-100 shadow-inner"><div className="flex gap-4 items-start"><div className="flex-1"><label className="text-xs font-bold text-orange-800 uppercase mb-1 block">Código (Ej. 101)</label><input ref={prodRef} value={currentProdId} type="number" onChange={e => setCurrentProdId(e.target.value)} onKeyDown={handleProductEnter} placeholder="---" className="w-full p-4 text-2xl font-mono border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" autoFocus /><div className="h-6 mt-2">{currentProdId && ( foundProduct ? ( <span className="text-green-600 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-left-2"><CheckCircle2 size={16} /> {foundProduct.name}</span> ) : ( <span className="text-red-500 font-bold flex items-center gap-1 animate-in fade-in"><AlertCircle size={16} /> Código no existe</span> ) )}</div></div><div className="w-32"><label className="text-xs font-bold text-orange-800 uppercase mb-1 block">Cantidad</label><input type="number" ref={qtyRef} value={currentQty} onChange={e => setCurrentQty(e.target.value)} onKeyDown={handleQtyEnter} placeholder="0" className="w-full p-4 text-2xl font-bold border border-gray-300 rounded-xl text-center shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div><button onClick={addItem} className="bg-black text-white h-[68px] w-[68px] rounded-xl hover:bg-gray-800 flex items-center justify-center shadow-lg active:scale-95 transition-transform mt-6"><Plus size={32} /></button></div></div> )}
      <div className="space-y-3">{cart.map((item, idx) => ( <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><div className="flex items-center gap-4"><div className="h-10 w-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center font-bold font-mono">{item.product_id}</div><div><span className="font-bold text-lg text-gray-900 block">{item.product_name}</span></div></div><div className="flex items-center gap-6"><span className="text-2xl font-black text-gray-900">{item.quantity}</span><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={20} /></button></div></div> ))}</div>
      {cart.length > 0 && ( <button onClick={handleSave} disabled={loading} className="w-full mt-10 bg-green-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-green-700 shadow-xl transition-all">{loading ? 'Guardando...' : 'CONFIRMAR SALIDA'}</button> )}
    </div>
  )
}