"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { ShoppingCart, Trash2, Banknote, Printer, Search } from 'lucide-react'

export default function PuntoDeVentaPage() {
  // 1. MODIFICACIÓN: Obtenemos también ticketHeader y ticketFooter
  const { orgId, orgName, ticketHeader, ticketFooter, loading: orgLoading } = useOrganization()
  
  // DATOS
  const [products, setProducts] = useState<any[]>([])
  const [filteredProds, setFilteredProds] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  
  // ESTADO DE LA VENTA
  const [cart, setCart] = useState<any[]>([])
  const [selectedSeller, setSelectedSeller] = useState('') 
  const [searchTerm, setSearchTerm] = useState('')
  const [amountPaid, setAmountPaid] = useState('') 
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

// CARGAR DATOS (OPTIMIZADO CON PROMISE.ALL) ⚡️
  useEffect(() => {
    const loadData = async () => {
      // 1. Disparamos ambas peticiones al mismo tiempo
      const [productsResult, sellersResult] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sellers').select('*').order('name')
      ])

      // 2. Procesamos Productos
      if (productsResult.data) {
        setProducts(productsResult.data)
        setFilteredProds(productsResult.data)
      }

      // 3. Procesamos Vendedores
      if (sellersResult.data) {
        setSellers(sellersResult.data)
        // Auto-seleccionar "Mostrador"
        const mostrador = sellersResult.data.find(s => s.name.toLowerCase().includes('mostrador'))
        if (mostrador) setSelectedSeller(mostrador.id)
      }
    }
    loadData()
  }, [])
  
  // FILTRO DE BÚSQUEDA
  useEffect(() => {
    if (!searchTerm) {
        setFilteredProds(products)
    } else {
        setFilteredProds(products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())))
    }
  }, [searchTerm, products])

  // LÓGICA DEL CARRITO
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
        setCart([...cart, { ...product, qty: 1 }])
    }
  }

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQty = (id: number, delta: number) => {
    setCart(cart.map(item => {
        if (item.id === id) {
            const newQty = Math.max(1, item.qty + delta)
            return { ...item, qty: newQty }
        }
        return item
    }))
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const change = (parseFloat(amountPaid) || 0) - total

  // 2. MODIFICACIÓN: FUNCIÓN DE IMPRESIÓN PROFESIONAL
  const imprimirTicketReal = (totalVenta: number, cambio: number, items: any[]) => {
    // Abre una ventana en blanco
    const ventanaImpresion = window.open('', 'PRINT', 'height=600,width=400');
    
    if (ventanaImpresion) {
        // Inyecta el HTML del ticket
        ventanaImpresion.document.write(`
            <html>
            <head>
                <title>Ticket ${orgName}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 280px; font-size: 12px; margin: 0; padding: 10px; }
                    .centrado { text-align: center; }
                    .linea { border-bottom: 1px dashed black; margin: 5px 0; }
                    .grande { font-size: 16px; font-weight: bold; }
                    .tabla { width: 100%; }
                    .derecha { text-align: right; }
                    .fecha { font-size: 10px; color: #555; }
                </style>
            </head>
            <body>
                <div class="centrado">
                    <div class="grande">${orgName}</div>
                    <div class="linea"></div>
                    ${ticketHeader ? ticketHeader.replace(/\n/g, '<br/>') : '*** TICKET DE VENTA ***'} <br/>
                    <br/>
                    <span class="fecha">${new Date().toLocaleString()}</span>
                </div>
                <div class="linea"></div>
                <table class="tabla">
                    ${items.map(item => `
                        <tr>
                            <td>${item.qty} x ${item.name}</td>
                            <td class="derecha">$${(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="linea"></div>
                <table class="tabla grande">
                    <tr>
                        <td>TOTAL:</td>
                        <td class="derecha">$${totalVenta.toFixed(2)}</td>
                    </tr>
                </table>
                <br/>
                <table class="tabla">
                    <tr><td>Efectivo:</td><td class="derecha">$${parseFloat(amountPaid).toFixed(2)}</td></tr>
                    <tr><td>Cambio:</td><td class="derecha">$${cambio.toFixed(2)}</td></tr>
                </table>
                <br/>
                <div class="centrado">
                    ${ticketFooter ? ticketFooter.replace(/\n/g, '<br/>') : 'Gracias por su compra'}
                </div>
                <br/><br/>.
            </body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.focus();
        
        // Lanza la impresión nativa del navegador
        // Pequeño timeout para asegurar que carguen los estilos
        setTimeout(() => {
            ventanaImpresion.print();
            ventanaImpresion.close();
        }, 250);
    }
  }

  // --- PROCESAR VENTA ---
  const handleCheckout = async () => {
    if (!orgId) return
    if (!selectedSeller) return alert("Selecciona quién cobra (Vendedor)")
    if (cart.length === 0) return alert("Carrito vacío")

    setLoading(true)

    // Crear los movimientos de salida
    const payload = cart.map(item => ({
        organization_id: orgId,
        seller_id: parseInt(selectedSeller),
        product_id: item.id,
        quantity: item.qty,
        type: 'SALIDA'
    }))

    const { error } = await supabase.from('movements').insert(payload)

    if (error) {
        alert("Error al cobrar: " + error.message)
    } else {
        // Registrar el pago
        await supabase.from('payments').insert({
            organization_id: orgId,
            seller_id: parseInt(selectedSeller),
            amount: total,
            notes: `Venta Mostrador. Ticket #${Math.floor(Math.random() * 9000) + 1000}`
        })

        // 3. MODIFICACIÓN: EN LUGAR DE ALERT, IMPRIMIMOS EL TICKET
        imprimirTicketReal(total, change, cart)
        
        // Limpiar
        setCart([])
        setAmountPaid('')
        setShowModal(false)
    }
    setLoading(false)
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-gray-100 overflow-hidden">
      
      {/* --- COLUMNA IZQUIERDA: PRODUCTOS --- */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        
        {/* Barra de Búsqueda y Vendedor */}
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 flex gap-4">
            <div className="flex-1 flex items-center bg-gray-100 px-4 rounded-xl">
                <Search className="text-gray-400"/>
                <input 
                    className="bg-transparent p-3 outline-none w-full font-bold"
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            <select 
                value={selectedSeller} 
                onChange={e => setSelectedSeller(e.target.value)}
                className="bg-gray-100 p-3 rounded-xl font-bold outline-none text-sm max-w-[150px]"
            >
                <option value="">¿Quién cobra?</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {filteredProds.map(prod => (
                <button 
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-white p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-black transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
                >
                    <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center text-2xl">
                        🥖
                    </div>
                    <span className="font-bold text-gray-800 text-center leading-tight">{prod.name}</span>
                    <span className="text-orange-600 font-black">${prod.price}</span>
                </button>
            ))}
        </div>
      </div>

      {/* --- COLUMNA DERECHA: TICKET / CARRITO --- */}
      <div className="w-full md:w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10">
        
        {/* Encabezado Ticket */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <ShoppingCart size={24}/> Venta Actual
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">{orgName || 'Cargando...'}</p>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="text-center text-gray-300 mt-10">
                    <p>Carrito vacío</p>
                    <p className="text-xs">Agrega productos</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white border-b border-gray-50 pb-2">
                        <div>
                            <p className="font-bold text-sm text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-400">${item.price} x {item.qty}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-100 rounded-lg">
                                <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 text-gray-500 font-bold hover:bg-gray-200 rounded-l-lg">-</button>
                                <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 text-gray-500 font-bold hover:bg-gray-200 rounded-r-lg">+</button>
                            </div>
                            <span className="font-bold text-gray-800 w-12 text-right">${(item.price * item.qty).toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Total y Botón Pagar */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-end mb-4">
                <span className="text-gray-500 font-bold uppercase text-xs">Total a Pagar</span>
                <span className="text-4xl font-black text-gray-900">${total.toFixed(2)}</span>
            </div>
            
            <button 
                onClick={() => setShowModal(true)}
                disabled={cart.length === 0}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2"
            >
                <Banknote /> COBRAR
            </button>
        </div>
      </div>

      {/* --- MODAL DE COBRO (Cambio) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">Finalizar Venta</h3>
                
                <div className="mb-6 text-center">
                    <p className="text-gray-400 text-xs font-bold uppercase">Total a Cobrar</p>
                    <p className="text-5xl font-black text-black">${total.toFixed(2)}</p>
                </div>

                <div className="space-y-4 mb-8">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Dinero Recibido</label>
                    <input 
                        type="number" 
                        autoFocus
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                        // AGREGA ESTO 👇
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Solo cobra si el cambio es positivo y no está cargando
                                if (change >= 0 && !loading) {
                                    handleCheckout()
                                }
                            }
                        }}
                        // FIN DE LO NUEVO 👆
                        className="w-full bg-gray-100 p-4 rounded-xl text-3xl font-black text-center outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="$0.00"
                    />
                    
                    {/* Cálculo de Cambio Visual */}
                    <div className={`p-4 rounded-xl text-center transition-all ${change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-500'}`}>
                        <p className="text-xs font-bold uppercase mb-1">Cambio / Vuelto</p>
                        <p className="text-3xl font-black">${change >= 0 ? change.toFixed(2) : 'FALTA DINERO'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowModal(false)} className="py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                    <button 
                        onClick={handleCheckout} 
                        disabled={loading || change < 0}
                        className="py-3 font-bold bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? '...' : <><Printer size={18}/> Imprimir Ticket</>}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}