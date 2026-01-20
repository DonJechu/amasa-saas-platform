"use client"
import { useState, useEffect } from 'react'
import { ShieldCheck, Building2, User, Mail, Lock, Loader2, List, Plus, Power, Key, Gem, Box, Wrench, Copy, X, Package, Save, Store } from 'lucide-react'

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'LISTA' | 'CREAR'>('LISTA')
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])

  // ESTADO PARA EL MODAL DE HERRAMIENTAS
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  
  // Estado para el formulario de Inventario de Emergencia
  const [inventoryForm, setInventoryForm] = useState({ name: '', stock: '' })
  const [invLoading, setInvLoading] = useState(false)

  // ESTADO DEL FORMULARIO DE CREACIÓN
  const [formData, setFormData] = useState({
    businessName: '', ownerName: '', email: '', password: '', type: 'panaderia', adminPin: '1234'
  })

  const fetchTenants = async () => {
    setLoading(true)
    const res = await fetch('/api/super-admin/tenants')
    const data = await res.json()
    if (data.success) setTenants(data.data)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'LISTA') fetchTenants()
  }, [activeTab])

  const updateTenant = async (id: string, updates: any) => {
    // Actualización visual inmediata (Optimistic UI)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    
    // Si el modal está abierto, actualizamos también su estado local para que se refleje el cambio en el select
    if (selectedTenant && selectedTenant.id === id) {
        setSelectedTenant({ ...selectedTenant, ...updates })
    }

    // Petición al servidor
    await fetch('/api/super-admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
    })
  }

  // --- FUNCIÓN C: AJUSTE DE INVENTARIO ---
  const handleFixInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!inventoryForm.name || !inventoryForm.stock) return alert("Llena ambos campos")
    if(!confirm(`¿Seguro que quieres forzar el stock de "${inventoryForm.name}" a ${inventoryForm.stock}?`)) return

    setInvLoading(true)
    try {
        const res = await fetch('/api/super-admin/fix-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orgId: selectedTenant.id,
                ingredientName: inventoryForm.name,
                newStock: parseFloat(inventoryForm.stock)
            })
        })
        const data = await res.json()
        
        if(data.success) {
            alert(`✅ Inventario corregido. Filas afectadas: ${data.rows}`)
            setInventoryForm({ name: '', stock: '' })
        } else {
            alert(`❌ Error: ${data.error || 'No se encontró el ingrediente'}`)
        }
    } catch (error) {
        alert("Error de conexión")
    }
    setInvLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/create-tenant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ LISTO: ${formData.businessName} creado.\nUsuario: ${formData.email}\nPass: ${formData.password}`)
        setFormData({ businessName: '', ownerName: '', email: '', password: '', type: 'panaderia', adminPin: '1234' })
        setActiveTab('LISTA')
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (err) { alert('Error de conexión') }
    setLoading(false)
  }

  // Helpers de Herramientas
  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      alert("ID Copiado")
  }
  const handleResetPin = async (id: string) => {
      if(!confirm("¿Resetear PIN a '1234'?")) return
      await updateTenant(id, { admin_pin: '1234' })
      alert("✅ PIN restablecido a 1234")
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 text-white">
            <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-900/50">
                    <ShieldCheck size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black">Super Admin</h1>
                    <p className="text-gray-400 text-sm">Panel de Control Dios</p>
                </div>
            </div>
            <div className="bg-gray-800 p-1 rounded-xl flex gap-1">
                <button onClick={() => setActiveTab('LISTA')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LISTA' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}><List size={18}/> Mis Clientes</button>
                <button onClick={() => setActiveTab('CREAR')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'CREAR' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}><Plus size={18}/> Nuevo Cliente</button>
            </div>
        </div>

        {/* LISTA DE CLIENTES */}
        {activeTab === 'LISTA' && (
            <div className="bg-white rounded-3xl p-6 shadow-2xl overflow-hidden animate-in fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                            <tr><th className="p-4">Negocio</th><th className="p-4">Plan</th><th className="p-4">Status</th><th className="p-4 text-center">Herramientas</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && tenants.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Cargando imperio...</td></tr>}
                            {tenants.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4"><p className="font-bold text-gray-900">{tenant.name}</p><span className="text-[10px] bg-gray-100 px-2 rounded font-bold uppercase text-gray-400">{tenant.business_type}</span></td>
                                    <td className="p-4"><button onClick={() => updateTenant(tenant.id, { plan: tenant.plan === 'pro' ? 'basic' : 'pro' })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs border ${tenant.plan === 'pro' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{tenant.plan === 'pro' ? <><Gem size={14}/> PRO</> : <><Box size={14}/> BÁSICO</>}</button></td>
                                    <td className="p-4"><button onClick={() => updateTenant(tenant.id, { status: tenant.status === 'active' ? 'suspended' : 'active' })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}><Power size={14} /> {tenant.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}</button></td>
                                    <td className="p-4 text-center"><button onClick={() => {setSelectedTenant(tenant); setInventoryForm({name:'', stock:''})}} className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 shadow-lg hover:scale-105 transition-all"><Wrench size={18}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL DE HERRAMIENTAS (DIOS) */}
        {selectedTenant && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => setSelectedTenant(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X/></button>
                    
                    <h2 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-2"><Wrench className="text-gray-400"/> Soporte Técnico</h2>
                    <p className="text-gray-500 mb-6">Acciones para <b>{selectedTenant.name}</b></p>

                    <div className="space-y-4">
                        {/* 1. ID */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">Org ID</p><p className="font-mono text-xs text-gray-600 truncate max-w-[200px]">{selectedTenant.id}</p></div>
                            <button onClick={() => copyToClipboard(selectedTenant.id)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"><Copy size={16}/></button>
                        </div>

                        {/* 2. PIN Reset */}
                        <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                            <div><p className="font-bold text-yellow-800 text-sm">PIN Actual: {selectedTenant.admin_pin}</p></div>
                            <button onClick={() => handleResetPin(selectedTenant.id)} className="px-3 py-1 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-500 text-xs">Reset 1234</button>
                        </div>
                        
                        {/* 3. Reactivar Tutorial */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                             <div><p className="font-bold text-blue-800 text-sm">Tutorial Bienvenida</p></div>
                             <button onClick={() => updateTenant(selectedTenant.id, { show_tutorial: true })} className="px-3 py-1 bg-blue-200 text-blue-800 font-bold rounded-lg hover:bg-blue-300 text-xs">Reactivar</button>
                        </div>

                        {/* 4. CAMBIAR GIRO (NUEVO) */}
                        <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-xl">
                             <div>
                                <p className="font-bold text-purple-800 text-sm flex items-center gap-2"><Store size={14}/> Giro del Negocio</p>
                                <p className="text-[10px] text-purple-600">Actual: {selectedTenant.business_type}</p>
                             </div>
                             <select 
                                value={selectedTenant.business_type} 
                                onChange={(e) => updateTenant(selectedTenant.id, { business_type: e.target.value })}
                                className="px-2 py-1 bg-white border border-purple-200 text-purple-900 font-bold rounded-lg text-xs outline-none focus:border-purple-500 cursor-pointer"
                             >
                                <option value="panaderia">Panadería</option>
                                <option value="tortilleria">Tortillería</option>
                                <option value="pizzeria">Pizzería</option>
                             </select>
                        </div>

                        <hr className="border-gray-100 my-2"/>

                        {/* 5. AJUSTE DE INVENTARIO (C) */}
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3 text-sm"><Package size={16}/> Ajuste de Emergencia</h3>
                            <form onSubmit={handleFixInventory} className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-red-400 uppercase">Nombre EXACTO del Ingrediente</label>
                                    <input 
                                        className="w-full p-2 text-sm border border-red-200 rounded-lg outline-none focus:border-red-500 bg-white"
                                        placeholder="Ej. Harina de Trigo"
                                        value={inventoryForm.name}
                                        onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-red-400 uppercase">Nuevo Stock Total (Base)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number"
                                            className="w-full p-2 text-sm border border-red-200 rounded-lg outline-none focus:border-red-500 font-bold bg-white"
                                            placeholder="Ej. 5000"
                                            value={inventoryForm.stock}
                                            onChange={e => setInventoryForm({...inventoryForm, stock: e.target.value})}
                                        />
                                        <button disabled={invLoading} className="bg-red-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50">
                                            {invLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-1">* Si es harina (g), 5000 = 5kg.</p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* FORMULARIO DE CREACIÓN */}
        {activeTab === 'CREAR' && (
            <div className="bg-white rounded-3xl p-8 max-w-md mx-auto shadow-2xl animate-in fade-in">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nombre del Negocio</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <Building2 className="text-gray-400" size={20} />
                      <input required className="bg-transparent outline-none w-full font-bold text-gray-800" placeholder="Ej. Tortillería La Esperanza" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
                    </div>
                  </div>
                  
                  {/* Dueño */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nombre del Dueño</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <User className="text-gray-400" size={20} />
                      <input required className="bg-transparent outline-none w-full font-bold text-gray-800" placeholder="Ej. Don Pancho" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Correo de Acceso</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <Mail className="text-gray-400" size={20} />
                      <input required type="email" className="bg-transparent outline-none w-full font-bold text-gray-800" placeholder="cliente@gmail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Contraseña Inicial</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <Lock className="text-gray-400" size={20} />
                      <input required type="text" className="bg-transparent outline-none w-full font-bold text-gray-800" placeholder="Contraseña123" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>

                  {/* PIN ADMIN */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">PIN Panel Admin (Tienda)</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <Key className="text-gray-400" size={20} />
                      <input required type="text" maxLength={4} className="bg-transparent outline-none w-full font-bold text-gray-800" placeholder="1234" value={formData.adminPin} onChange={e => setFormData({...formData, adminPin: e.target.value})} />
                    </div>
                  </div>

                  {/* GIRO DEL NEGOCIO */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Giro del Negocio</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                      <span className="text-xl">🏭</span>
                      <select required className="bg-transparent outline-none w-full font-bold text-gray-800 cursor-pointer" value={formData.type || 'panaderia'} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="panaderia">Panadería (Tradicional)</option>
                        <option value="tortilleria">Tortillería (Masa y Maíz)</option>
                        <option value="pizzeria">Pizzería (Comida Rápida)</option>
                      </select>
                    </div>
                  </div>

                  <button disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : '🚀 Crear Cliente SaaS'}
                  </button>
                </form>
            </div>
        )}

      </div>
    </div>
  )
}