"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization' 
import { PlusCircle, UserPlus, Beaker, Save, Trash2, ArrowRight, ShieldAlert, History, AlertCircle, Pencil, Check, X, DollarSign, FileSpreadsheet, Download } from 'lucide-react'

// --- 1. CONFIGURACIÓN CAMALEÓNICA ---
const UI_CONFIG: any = {
  panaderia: {
    productLabel: 'Pan',
    families: [
      { label: '🥖 Pan Salado (100)', base: 100, max: 199 },
      { label: '🐚 Conchas (200)', base: 200, max: 299 },
      { label: '🍩 Donas (300)', base: 300, max: 399 },
      { label: '🥐 Hojaldre (400)', base: 400, max: 499 },
    ]
  },
  tortilleria: {
    productLabel: 'Producto',
    families: [
      { label: '🌽 Tortilla (100)', base: 100, max: 199 },
      { label: '🥡 Masa (200)', base: 200, max: 299 },
      { label: '🌮 Totopos/Otros (300)', base: 300, max: 399 },
      { label: '🥤 Bebidas (400)', base: 400, max: 499 },
    ]
  },
  pizzeria: {
    productLabel: 'Pizza',
    families: [
      { label: '🍕 Clásicas (100)', base: 100, max: 199 },
      { label: '🧀 Especiales (200)', base: 200, max: 299 },
      { label: '🥗 Complementos (300)', base: 300, max: 399 },
      { label: '🥤 Bebidas (400)', base: 400, max: 499 },
    ]
  }
}

export default function AdminPage() {
    // --- FUNCIÓN PARA EXPORTAR A EXCEL (CSV) ---
  const handleExportExcel = async () => {
    if (!orgId) return
    setLoading(true)
    
    // 1. Pedimos TODOS los movimientos (Ventas y Devoluciones)
    // Puedes agregar .gte('created_at', '2024-01-01') si quieres filtrar por fecha
    const { data: movimientos, error } = await supabase
      .from('movements')
      .select(`
        created_at,
        type,
        quantity,
        products (name, price),
        sellers (name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      alert('Error al descargar: ' + error.message)
      setLoading(false)
      return
    }

    if (!movimientos || movimientos.length === 0) {
      alert('No hay datos para exportar.')
      setLoading(false)
      return
    }

    // 2. Convertimos JSON a formato CSV (Excel)
    // Encabezados
    let csvContent = "Fecha,Hora,Vendedor,Movimiento,Producto,Cantidad,Precio Unit.,Total ($)\n"

    movimientos.forEach((m: any) => {
      const fecha = new Date(m.created_at).toLocaleDateString('es-MX')
      const hora = new Date(m.created_at).toLocaleTimeString('es-MX')
      const vendedor = m.sellers?.name || 'Desconocido'
      const tipo = m.type // SALIDA o DEVOLUCION
      const producto = m.products?.name || 'Borrado'
      const precio = m.products?.price || 0
      const total = (m.quantity * precio).toFixed(2)

      // Unimos con comas (y protegemos textos con comillas si tienen comas)
      const linea = `${fecha},${hora},"${vendedor}",${tipo},"${producto}",${m.quantity},${precio},${total}`
      csvContent += linea + "\n"
    })

    // 3. Crear el archivo invisible y darle clic automáticamente
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    await logAction('Exportar', 'Se descargó reporte de ventas en Excel')
    setLoading(false)
  }

  // Obtenemos el tipo de negocio
  const { orgId, orgName, businessType, loading: orgLoading } = useOrganization()
  
  // Seleccionamos la config correcta (o panaderia por defecto)
  const currentConfig = UI_CONFIG[businessType] || UI_CONFIG['panaderia']
  const FAMILIAS = currentConfig.families

  const [selectedSellerConfig, setSelectedSellerConfig] = useState<any>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPriceVal, setEditPriceVal] = useState('')
  const [activeTab, setActiveTab] = useState<'PRODUCTOS' | 'VENDEDORES' | 'RECETAS' | 'SEGURIDAD' | 'REPORTES'>('PRODUCTOS')

  const [products, setProducts] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([]) 
  const [loading, setLoading] = useState(false)

  const [selectedFamily, setSelectedFamily] = useState(FAMILIAS[0])
  
  // Efecto para actualizar la familia seleccionada cuando carga el tipo de negocio
  useEffect(() => {
      setSelectedFamily(FAMILIAS[0])
  }, [businessType])

  const [nextId, setNextId] = useState(0)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [sellerRoute, setSellerRoute] = useState('')
  const [recipeProdId, setRecipeProdId] = useState('')
  const [recipeIngId, setRecipeIngId] = useState('')
  const [recipeQty, setRecipeQty] = useState('')
  const [newIngName, setNewIngName] = useState('')
  const [newIngUnit, setNewIngUnit] = useState('gramos')
  const [currentRecipe, setCurrentRecipe] = useState<any[]>([])

  const fetchData = async () => {
    const { data: prods } = await supabase.from('products').select('*').order('id')
    const { data: sells } = await supabase.from('sellers').select('*').order('id')
    const { data: ings } = await supabase.from('ingredients').select('*').order('name')
    const { data: audit } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
    
    if (prods) setProducts(prods)
    if (sells) setSellers(sells)
    if (ings) setIngredients(ings)
    if (audit) setLogs(audit)
  }

  useEffect(() => { fetchData() }, [])

  const logAction = async (action: string, details: string) => {
    if (!orgId) return
    await supabase.from('audit_logs').insert({ action, details, organization_id: orgId })
  }

  useEffect(() => {
    if (!selectedFamily) return
    const productsInFamily = products.filter(p => p.id >= selectedFamily.base && p.id <= selectedFamily.max)
    if (productsInFamily.length > 0) {
      const maxId = Math.max(...productsInFamily.map(p => p.id))
      setNextId(maxId + 1)
    } else {
      setNextId(selectedFamily.base + 1)
    }
  }, [selectedFamily, products])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setLoading(true)
    const { error } = await supabase.from('products').insert({ id: nextId, name: newName, price: parseFloat(newPrice), organization_id: orgId })
    if (!error) { 
        await logAction(`Crear ${currentConfig.productLabel}`, `Se creó ${newName} (ID: ${nextId}) a $${newPrice}`)
        alert(`✅ ${currentConfig.productLabel} creado`)
        setNewName(''); setNewPrice(''); fetchData() 
    }
    setLoading(false)
  }

const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Validación de seguridad
    if (!orgId) return alert("Error: No se detecta la organización. Recarga la página.")
    if (!sellerName) return alert("Escribe un nombre")

    setLoading(true)

    // 2. Intento de guardado
    const { error } = await supabase.from('sellers').insert({ 
        name: sellerName, 
        route_name: sellerRoute, 
        organization_id: orgId // <--- IMPORTANTE
    })

    // 3. Manejo de respuesta
    if (error) {
        console.error(error)
        alert(`❌ Error al guardar: ${error.message}`)
    } else { 
        await logAction('Nuevo Vendedor', `Se registró a ${sellerName}`)
        alert(`✅ Vendedor creado con éxito`)
        setSellerName('')
        setSellerRoute('')
        fetchData() 
    }
    setLoading(false)
  }

  const handleCreateIngredient = async () => {
    if (!newIngName || !orgId) return
    await supabase.from('ingredients').insert({ name: newIngName, unit: newIngUnit, organization_id: orgId })
    await logAction('Materia Prima', `Alta de ${newIngName}`)
    setNewIngName(''); fetchData()
  }

  useEffect(() => {
    if(!recipeProdId) return
    const loadRecipe = async () => {
        const { data } = await supabase.from('product_ingredients').select('*, ingredients(*)').eq('product_id', parseInt(recipeProdId))
        setCurrentRecipe(data || [])
    }
    loadRecipe()
  }, [recipeProdId])

  const handleAddToRecipe = async () => {
      if (!recipeProdId || !recipeIngId || !recipeQty || !orgId) return alert("Faltan datos")
      await supabase.from('product_ingredients').insert({ product_id: parseInt(recipeProdId), ingredient_id: parseInt(recipeIngId), quantity: parseFloat(recipeQty), organization_id: orgId })
      const pan = products.find(p => p.id === parseInt(recipeProdId))?.name
      const ing = ingredients.find(i => i.id === parseInt(recipeIngId))?.name
      await logAction('Modificar Receta', `Se agregaron ${recipeQty} de ${ing} a ${pan}`)
      const { data } = await supabase.from('product_ingredients').select('*, ingredients(*)').eq('product_id', parseInt(recipeProdId))
      setCurrentRecipe(data || [])
      setRecipeQty('')
  }

  const handleDeleteIngredient = async (id: number) => {
      await supabase.from('product_ingredients').delete().eq('id', id)
      const { data } = await supabase.from('product_ingredients').select('*, ingredients(*)').eq('product_id', parseInt(recipeProdId))
      setCurrentRecipe(data || [])
  }
  const formatDate = (iso: string) => new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })

  const handleUpdatePrice = async (id: number) => {
    if (!editPriceVal) return
    setLoading(true)
    const oldPrice = products.find(p => p.id === id)?.price
    const { error } = await supabase.from('products').update({ price: parseFloat(editPriceVal) }).eq('id', id)
    if (!error) { await logAction('Cambio de Precio', `Producto #${id} cambió de $${oldPrice} a $${editPriceVal}`); alert('✅ Precio actualizado'); setEditingId(null); setEditPriceVal(''); fetchData() } 
    else { alert('Error: ' + error.message) }
    setLoading(false)
  }

  const handleSaveSellerConfig = async () => {
   if (!selectedSellerConfig) return
   setLoading(true)
   const { error } = await supabase.from('sellers').update({
       commission_active: selectedSellerConfig.commission_active,
       base_salary: parseFloat(selectedSellerConfig.base_salary || 0),
       commission_rate: parseFloat(selectedSellerConfig.commission_rate || 0),
       bonus_threshold: parseFloat(selectedSellerConfig.bonus_threshold || 0),
       bonus_amount: parseFloat(selectedSellerConfig.bonus_amount || 0),
   }).eq('id', selectedSellerConfig.id)
   if (!error) { alert('✅ Nómina guardada'); setSelectedSellerConfig(null); fetchData() }
   setLoading(false)
  }

  if (orgLoading) return <div className="p-8">Cargando empresa...</div>

return (
    <div className="max-w-6xl mx-auto p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-gray-900 capitalize">⚙️ Admin: {businessType}</h1>
      </div>
      
      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-1 overflow-x-auto">
          <button onClick={() => setActiveTab('PRODUCTOS')} className={`px-6 py-2 font-bold rounded-t-lg transition-all ${activeTab === 'PRODUCTOS' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}>📦 {currentConfig.productLabel}s</button>
          <button onClick={() => setActiveTab('VENDEDORES')} className={`px-6 py-2 font-bold rounded-t-lg transition-all ${activeTab === 'VENDEDORES' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>🚚 Vendedores</button>
          <button onClick={() => setActiveTab('RECETAS')} className={`px-6 py-2 font-bold rounded-t-lg transition-all ${activeTab === 'RECETAS' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>🧪 Recetas</button>
          {/* NUEVO BOTÓN REPORTES 👇 */}
          <button onClick={() => setActiveTab('REPORTES')} className={`px-6 py-2 font-bold rounded-t-lg transition-all flex items-center gap-2 ${activeTab === 'REPORTES' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>📊 Reportes</button>
          <button onClick={() => setActiveTab('SEGURIDAD')} className={`px-6 py-2 font-bold rounded-t-lg transition-all ${activeTab === 'SEGURIDAD' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>🛡️ Bitácora</button>
      </div>

      {/* --- PESTAÑA PRODUCTOS --- */}
      {activeTab === 'PRODUCTOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600"><PlusCircle /> Nuevo {currentConfig.productLabel}</h2>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                     <div className="grid grid-cols-2 gap-2">
                        {FAMILIAS.map((f: any) => (
                            <button key={f.base} type="button" onClick={() => setSelectedFamily(f)} className={`p-2 text-xs font-bold rounded-lg border transition-all ${selectedFamily.base === f.base ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white hover:bg-gray-50'}`}>{f.label}</button>
                        ))}
                    </div>
                    <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center">
                        <div><p className="text-xs text-gray-400 font-bold uppercase">ID Asignado</p><p className="text-3xl font-black font-mono tracking-wider">#{nextId}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nombre</label><input value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded-lg font-bold" placeholder={`Ej. ${currentConfig.productLabel === 'Pizza' ? 'Pepperoni' : 'Bolillo'}`} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Precio</label><input type="number" step="0.50" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full p-3 border rounded-lg font-bold" placeholder="$0.00" /></div>
                    </div>
                    <button disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200">{loading ? 'Guardando...' : `Crear ${currentConfig.productLabel}`}</button>
                </form>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-gray-200 max-h-[500px] overflow-y-auto">
               <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b z-10">
                   <h3 className="text-gray-400 text-xs font-bold uppercase">Catálogo Vigente</h3>
                   <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">{products.length} items</span>
               </div>
               {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center py-3 px-2 border-b border-gray-50 hover:bg-orange-50/50 rounded-lg transition-colors group">
                       <div className="flex items-center gap-3"><span className="font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs min-w-[40px] text-center">{p.id}</span><span className="font-medium text-gray-800">{p.name}</span></div>
                       <div className="flex items-center gap-2">
                           {editingId === p.id ? (
                               <div className="flex items-center gap-1 animate-in zoom-in duration-200">
                                   <input type="number" className="w-24 pl-5 p-1 border-2 border-orange-400 rounded-md font-bold text-right outline-none bg-white shadow-sm" value={editPriceVal} onChange={(e) => setEditPriceVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrice(p.id)} />
                                   <button onClick={() => handleUpdatePrice(p.id)} className="bg-green-500 text-white p-1.5 rounded-md hover:bg-green-600 shadow-sm"><Check size={14} /></button>
                                   <button onClick={() => setEditingId(null)} className="bg-red-100 text-red-500 p-1.5 rounded-md hover:bg-red-200"><X size={14} /></button>
                               </div>
                           ) : (
                               <div className="flex items-center gap-3">
                                   <span className="font-bold text-gray-900 text-base tabular-nums">${p.price.toFixed(2)}</span>
                                   <button onClick={() => { setEditingId(p.id); setEditPriceVal(p.price.toString()) }} className="text-gray-300 hover:text-orange-500 hover:bg-orange-100 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                               </div>
                           )}
                       </div>
                   </div>
               ))}
           </div>
      </div>)}

      {/* --- PESTAÑA VENDEDORES --- */}
      {activeTab === 'VENDEDORES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                 <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600"><UserPlus /> Nuevo Vendedor</h2>
                 <form onSubmit={handleCreateSeller} className="space-y-4">
                     <input value={sellerName} onChange={e => setSellerName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Nombre Completo" />
                     <input value={sellerRoute} onChange={e => setSellerRoute(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Nombre de la Ruta" />
                     <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">{loading ? '...' : 'Guardar Vendedor'}</button>
                 </form>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  {sellers.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2 border hover:border-blue-300 transition-all group">
                          <div className="flex items-center gap-3"><div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">{s.name.charAt(0)}</div><div><p className="font-bold text-gray-800 text-sm">{s.name}</p><div className="flex gap-2 text-xs items-center"><span className="text-gray-500">{s.route_name}</span>{s.commission_active && <span className="text-green-700 font-bold bg-green-100 px-1 rounded text-[10px]">Comisión</span>}</div></div></div>
                          <div className="flex items-center gap-4"><div className="text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Saldo</p><p className={`font-mono font-bold ${s.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>${s.balance?.toFixed(2) || '0.00'}</p></div><button onClick={() => setSelectedSellerConfig(s)} className="bg-white border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-500 p-2 rounded-lg transition-colors shadow-sm"><DollarSign size={18}/></button></div>
                      </div>
                  ))}
             </div>
             {selectedSellerConfig && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-black text-gray-900 mb-1">Esquema de Pago</h3>
                        <p className="text-gray-500 mb-6">Configura cómo gana dinero <b className="text-blue-600">{selectedSellerConfig.name}</b>.</p>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-gray-100 p-4 rounded-xl"><span className="font-bold text-gray-700">¿Pagar por Comisión?</span><button onClick={() => setSelectedSellerConfig({...selectedSellerConfig, commission_active: !selectedSellerConfig.commission_active})} className={`w-14 h-8 rounded-full p-1 transition-colors ${selectedSellerConfig.commission_active ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`bg-white w-6 h-6 rounded-full shadow-md transition-transform ${selectedSellerConfig.commission_active ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
                            {selectedSellerConfig.commission_active && (<div className="space-y-4 animate-in slide-in-from-top-2"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-400 uppercase">Sueldo Base ($)</label><input type="number" className="w-full p-2 border rounded-lg font-bold" value={selectedSellerConfig.base_salary} onChange={e => setSelectedSellerConfig({...selectedSellerConfig, base_salary: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-400 uppercase">% Comisión</label><input type="number" className="w-full p-2 border rounded-lg font-bold" value={selectedSellerConfig.commission_rate} onChange={e => setSelectedSellerConfig({...selectedSellerConfig, commission_rate: e.target.value})} /></div></div><div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><p className="text-xs font-bold text-orange-400 uppercase mb-2">Bono por Baja Merma</p><div className="flex items-center gap-2 text-sm"><span>Si devuelve menos del</span><input type="number" className="w-16 p-1 border rounded text-center font-bold" value={selectedSellerConfig.bonus_threshold} onChange={e => setSelectedSellerConfig({...selectedSellerConfig, bonus_threshold: e.target.value})} /><span>%, gana:</span></div><div className="mt-2 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold">$</span><input type="number" className="w-full pl-6 p-2 border rounded-lg font-bold" value={selectedSellerConfig.bonus_amount} onChange={e => setSelectedSellerConfig({...selectedSellerConfig, bonus_amount: e.target.value})} /></div></div></div>)}
                            <div className="flex gap-3 mt-6"><button onClick={() => setSelectedSellerConfig(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button onClick={handleSaveSellerConfig} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800">Guardar Reglas</button></div>
                        </div>
                    </div>
                </div>
             )}
          </div>
      )}

      {/* --- PESTAÑA RECETAS --- */}
      {activeTab === 'RECETAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl border border-gray-200 h-fit">
                 <h3 className="font-bold text-gray-700 mb-4 flex gap-2"><Beaker size={20}/> 1. Materia Prima</h3>
                 <div className="flex gap-2 mb-4"><input value={newIngName} onChange={e => setNewIngName(e.target.value)} className="flex-1 p-2 border rounded-lg" placeholder="Ej. Harina / Queso" /><select value={newIngUnit} onChange={e => setNewIngUnit(e.target.value)} className="p-2 border rounded-lg bg-gray-50 text-sm"><option value="gramos">g</option><option value="ml">ml</option><option value="pzas">pzas</option></select></div>
                 <button onClick={handleCreateIngredient} className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-bold">Agregar</button>
                 <div className="mt-4 flex flex-wrap gap-2">{ingredients.map(ing => (<span key={ing.id} className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-bold">{ing.name}</span>))}</div>
             </div>
             <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-700 mb-4 flex gap-2"><Save size={20}/> 2. Armar Receta</h3>
                 <div className="mb-6"><select value={recipeProdId} onChange={e => setRecipeProdId(e.target.value)} className="w-full p-3 text-lg border-2 border-green-100 rounded-xl font-bold bg-green-50 outline-none"><option value="">-- Elige un Producto --</option>{products.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}</select></div>
                 {recipeProdId && (
                     <div className="animate-in slide-in-from-top-2">
                         <div className="flex gap-4 items-end mb-6 p-4 bg-gray-50 rounded-xl">
                            <div className="flex-1"><label className="text-xs font-bold block">Ingrediente</label><select value={recipeIngId} onChange={e => setRecipeIngId(e.target.value)} className="w-full p-2 border rounded-lg"><option value="">-- Selecciona --</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                            <div className="w-24"><label className="text-xs font-bold block">Cant.</label><input type="number" value={recipeQty} onChange={e => setRecipeQty(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="0" /></div>
                            <button onClick={handleAddToRecipe} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
                         </div>
                         <ul className="space-y-2">{currentRecipe.map((item) => (<li key={item.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg"><span className="text-sm flex gap-2 items-center"><ArrowRight size={14} className="text-green-500"/> {item.ingredients.name}</span><div className="flex gap-4 items-center"><span className="font-mono font-bold">{item.quantity} {item.ingredients.unit}</span><button onClick={() => handleDeleteIngredient(item.id)} className="text-red-400"><Trash2 size={16}/></button></div></li>))}</ul>
                     </div>
                 )}
             </div>
          </div>
      )}

      {/* --- NUEVA PESTAÑA REPORTES 👇 --- */}
      {activeTab === 'REPORTES' && (
        <div className="animate-in fade-in max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
            
            <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
              <FileSpreadsheet size={48} />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-2">Exportar Datos</h2>
            <p className="text-gray-500 mb-8">
              Descarga un archivo compatible con Excel, Google Sheets y Numbers. <br/>
              Incluye todas las ventas, despachos y devoluciones registradas hasta hoy.
            </p>

            <button 
              onClick={handleExportExcel}
              disabled={loading}
              className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3 w-full md:w-auto mx-auto"
            >
              {loading ? 'Generando...' : <><Download /> Descargar Excel Ahora</>}
            </button>

            <p className="text-xs text-gray-400 mt-6">
              * El archivo se descargará en formato .CSV (Valores Separados por Comas).
            </p>

          </div>
        </div>
      )}

      {/* --- PESTAÑA SEGURIDAD --- */}
      {activeTab === 'SEGURIDAD' && (
          <div className="animate-in fade-in">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-6 flex items-start gap-4"><ShieldAlert className="text-red-600 shrink-0" size={32} /><div><h2 className="text-xl font-bold text-red-900">Bitácora de Seguridad</h2><p className="text-red-700 text-sm">Este registro es inalterable.</p></div></div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase"><tr><th className="p-4">Fecha / Hora</th><th className="p-4">Acción</th><th className="p-4">Detalles</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">{logs.map((log) => (<tr key={log.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 text-sm font-mono text-gray-500"><div className="flex items-center gap-2"><History size={14} />{formatDate(log.created_at)}</div></td><td className="p-4"><span className="inline-block px-2 py-1 rounded bg-gray-100 font-bold text-xs text-gray-700 border border-gray-300">{log.action}</span></td><td className="p-4 text-sm text-gray-800 font-medium">{log.details}</td></tr>))}</tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  )
}
