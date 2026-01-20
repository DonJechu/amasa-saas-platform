import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Llave maestra
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// --- 1. AQUÍ DEFINIMOS LAS PLANTILLAS ---
const BUSINESS_TEMPLATES: any = {
  panaderia: {
    products: [
      { name: 'Bolillo', price: 2.50 },
      { name: 'Concha', price: 8.00 },
      { name: 'Dona', price: 12.00 }
    ],
    ingredients: [
      { name: 'Harina', unit: 'gramos', current_stock: 50000 },
      { name: 'Azúcar', unit: 'gramos', current_stock: 10000 },
      { name: 'Huevo', unit: 'pzas', current_stock: 360 }
    ],
    sellers: [
      { name: 'Mostrador', route_name: 'Local' },
      { name: 'Ruta Centro', route_name: 'Calle' }
    ]
  },
  tortilleria: {
    products: [
      { name: 'Tortilla Caliente (Kg)', price: 26.00 },
      { name: 'Masa (Kg)', price: 22.00 },
      { name: 'Totopos (Bolsa)', price: 15.00 }
    ],
    ingredients: [
      { name: 'Masa / Nixtamal', unit: 'gramos', current_stock: 100000 },
      { name: 'Papel Grado A.', unit: 'pzas', current_stock: 500 },
      { name: 'Gas LP', unit: 'ml', current_stock: 50000 } // litros * 1000
    ],
    sellers: [
      { name: 'Mostrador', route_name: 'Local' },
      { name: 'Moto Reparto 1', route_name: 'Colonias' }
    ]
  },
  pizzeria: { // Ejemplo extra
    products: [
      { name: 'Pizza Pepperoni', price: 120.00 },
      { name: 'Pizza Hawaiana', price: 135.00 }
    ],
    ingredients: [
      { name: 'Queso Mozzarella', unit: 'gramos', current_stock: 5000 },
      { name: 'Salsa Tomate', unit: 'ml', current_stock: 4000 }
    ],
    sellers: [
      { name: 'Barra', route_name: 'Local' },
      { name: 'Repartidor Didi/Uber', route_name: 'Apps' }
    ]
  }
}

export async function POST(request: Request) {
  try {
    // 1. RECIBIMOS EL NUEVO CAMPO 'adminPin'
    const { businessName, email, password, ownerName, type, adminPin } = await request.json()

    // 2. LO GUARDAMOS EN LA TABLA ORGANIZATIONS
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ 
          name: businessName, 
          business_type: type,
          admin_pin: adminPin, // <--- AQUÍ SE GUARDA
          plan: 'basic',
      }) 
      .select()
      .single()

    if (orgError) throw new Error('Error org: ' + orgError.message)

    // 2. Crear Usuario Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email, password: password, email_confirm: true
    })
    if (authError) throw new Error('Error auth: ' + authError.message)

    // 3. Vincular Perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        organization_id: org.id,
        full_name: ownerName,
        role: 'admin'
      })
    if (profileError) throw new Error('Error perfil: ' + profileError.message)

    // --- 4. PRE-LLENADO AUTOMÁTICO (SEEDING) ---
    // Seleccionamos la plantilla (o usamos panadería por defecto)
    const template = BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES['panaderia']

    // A) Insertar Ingredientes Base
    if (template.ingredients.length > 0) {
      const ingPayload = template.ingredients.map((i: any) => ({ ...i, organization_id: org.id }))
      await supabaseAdmin.from('ingredients').insert(ingPayload)
    }

    // B) Insertar Productos Base
    if (template.products.length > 0) {
      const prodPayload = template.products.map((p: any) => ({ ...p, id: undefined, organization_id: org.id }))
      // Nota: id: undefined para que la DB genere el ID serial automático
      await supabaseAdmin.from('products').insert(prodPayload)
    }

    // C) Insertar Vendedores Base
    if (template.sellers.length > 0) {
        const sellPayload = template.sellers.map((s: any) => ({ ...s, organization_id: org.id }))
        await supabaseAdmin.from('sellers').insert(sellPayload)
    }

    return NextResponse.json({ success: true, message: '¡Negocio Configurado!' })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}