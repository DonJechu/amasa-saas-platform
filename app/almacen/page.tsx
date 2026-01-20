"use client"
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Package, PlusCircle, Search, Loader2, Save, X } from 'lucide-react'
import { sendWhatsAppAlert } from '@/utils/whatsapp'

export default function AlmacenPage() {
  const { orgId, orgName } = useOrganization()
  
  const [ingredients, setIngredients] = useState<any[]>([])
  const [loading, setLoading] = useState(true) // Loading inicial de página
  const [processing, setProcessing] = useState(false) // Loading de acción (guardar)
  
  // OPTIMIZACIÓN UX: Buscador Cliente
  const [searchTerm, setSearchTerm] = useState('')

  // ESTADOS DEL MODAL
  const [selectedIng, setSelectedIng] = useState<any>(null)
  const [addAmount, setAddAmount] = useState('')
  const [captureUnit, setCaptureUnit] = useState<'MAYOR' | 'MENOR'>('MAYOR') 

  // 1. CARGA DE DATOS SIMPLE Y RÁPIDA
  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setIngredients(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // 2. FILTRADO EN TIEMPO REAL (Sin peticiones extra al servidor) ⚡️
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => 
        ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [ingredients, searchTerm])

  // HELPERS
  const isConvertible = (unit: string) => unit === 'gramos' || unit === 'ml'
  
  const getUnitLabel = (mode: 'MAYOR' | 'MENOR') => { 
      if (!selectedIng) return ''
      if (mode === 'MAYOR') return selectedIng.unit === 'gramos' ? 'Kilogramos (kg)' : 'Litros (L)'
      if (mode === 'MENOR') return selectedIng.unit === 'gramos' ? 'Gramos (g)' : 'Mililitros (ml)'
      return selectedIng.unit 
  }

  const handleOpenModal = (ing: any) => { 
      setSelectedIng(ing)
      setCaptureUnit('MAYOR')
      setAddAmount('') 
  }

  // 3. LOGICA DE GUARDADO ROBUSTA
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIng || !addAmount || !orgId) return

    const amountInput = parseFloat(addAmount)
    if (amountInput <= 0) return alert("Por favor ingresa una cantidad válida mayor a 0.")

    setProcessing(true)

    // Conversión a unidad base (siempre guardamos en gramos/ml)
    let amountToAdd = amountInput
    if (isConvertible(selectedIng.unit) && captureUnit === 'MAYOR') { 
        amountToAdd = amountInput * 1000 
    }

    const newStock = (selectedIng.current_stock || 0) + amountToAdd

    // Actualizamos
    const { error } = await supabase
      .from('ingredients')
      .update({ current_stock: newStock })
      .eq('id', selectedIng.id)

    if (!error) {
      // Preparamos Notificación
      const unitDisplay = (isConvertible(selectedIng.unit) && captureUnit === 'MAYOR') 
          ? (selectedIng.unit === 'gramos' ? 'KG' : 'Litros')
          : selectedIng.unit
      
      const alertMsg = `📦 *${orgName.toUpperCase()} - ALMACÉN*\n\n🛒 *Producto:* ${selectedIng.name}\n➕ *Entrada:* ${addAmount} ${unitDisplay}\n📊 *Nuevo Stock:* ${newStock > 1000 && isConvertible(selectedIng.unit) ? (newStock/1000).toFixed(2) : newStock}`

      // Bitácora
      await supabase.from('audit_logs').insert({ 
          action: 'Compra Insumo', 
          details: `Entrada de ${addAmount} ${unitDisplay} de ${selectedIng.name}`,
          organization_id: orgId
      })
      
      await sendWhatsAppAlert(alertMsg)
      
      // Actualización Optimista (Para que se sienta instantáneo)
      setIngredients(prev => prev.map(item => 
          item.id === selectedIng.id ? { ...item, current_stock: newStock } : item
      ))
      
      setAddAmount('')
      setSelectedIng(null)
    } else {
        alert("Error al actualizar inventario")
    }
    setProcessing(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-8 pb-32">
      
      {/* HEADER + BUSCADOR */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
                <Package size={32} className="text-blue-600"/> Almacén: {orgName}
            </h1>
            <p className="text-gray-500">Administra y registra compras de materia prima.</p>
        </div>
        
        {/* BUSCADOR */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm w-full md:w-auto min-w-[300px]">
            <Search className="text-gray-400 ml-2" size={20}/>
            <input 
                placeholder="Buscar ingrediente..." 
                className="outline-none p-2 w-full font-bold text-gray-700 placeholder:font-normal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* CONTENIDO */}
      {loading ? (
          <div className="flex justify-center py-20 text-gray-400"><Loader2 className="animate-spin" size={40}/></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {filteredIngredients.map((ing) => (
                <div key={ing.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden">
                    {/* Barra de Estado Visual */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${ing.current_stock > 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-800 leading-tight">{ing.name}</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded mt-2 inline-block">Unidad Base: {ing.unit}</span>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Disponible</p>
                            <p className={`text-3xl font-black tracking-tighter ${ing.current_stock > 0 ? 'text-gray-900' : 'text-red-500'}`}>
                                {ing.current_stock > 1000 && ing.unit === 'gramos' 
                                    ? (ing.current_stock / 1000).toFixed(2) + ' kg' 
                                    : ing.current_stock > 1000 && ing.unit === 'ml' 
                                        ? (ing.current_stock / 1000).toFixed(2) + ' L' 
                                        : ing.current_stock}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => handleOpenModal(ing)} 
                        className="w-full bg-gray-50 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                    >
                        <PlusCircle size={20} /> Registrar Compra
                    </button>
                </div>
            ))}
            
            {filteredIngredients.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400 italic">No se encontraron ingredientes con ese nombre.</div>
            )}
          </div>
      )}

      {/* MODAL DE COMPRA */}
      {selectedIng && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                <button onClick={() => setSelectedIng(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X/></button>
                
                <h2 className="text-2xl font-black text-gray-900 mb-1">Entrada de Almacén</h2>
                <p className="text-blue-600 font-bold text-lg mb-6">{selectedIng.name}</p>

                <form onSubmit={handleAddStock}>
                    {isConvertible(selectedIng.unit) && ( 
                        <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
                            <button type="button" onClick={() => setCaptureUnit('MAYOR')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${captureUnit === 'MAYOR' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {selectedIng.unit === 'gramos' ? 'Kilos (KG)' : 'Litros (L)'}
                            </button>
                            <button type="button" onClick={() => setCaptureUnit('MENOR')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${captureUnit === 'MENOR' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {selectedIng.unit === 'gramos' ? 'Gramos (g)' : 'Mili (ml)'}
                            </button>
                        </div> 
                    )}
                    
                    <div className="mb-8 relative">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-center">Cantidad a Ingresar</label>
                        <div className="relative flex justify-center items-baseline gap-2">
                            <input 
                                type="number" 
                                autoFocus 
                                min="0.01"
                                step="any"
                                value={addAmount} 
                                onChange={e => setAddAmount(e.target.value)} 
                                className="w-40 text-5xl font-black text-center border-b-2 border-gray-200 focus:border-blue-600 outline-none py-2 bg-transparent text-gray-900" 
                                placeholder="0" 
                            />
                            <span className="text-gray-400 font-bold text-lg">
                                {isConvertible(selectedIng.unit) ? (captureUnit === 'MAYOR' ? (selectedIng.unit === 'gramos' ? 'kg' : 'L') : (selectedIng.unit === 'gramos' ? 'g' : 'ml')) : selectedIng.unit}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setSelectedIng(null)} className="py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                        <button disabled={processing} className="py-4 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none transition-all flex justify-center items-center gap-2">
                            {processing ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                            {processing ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}