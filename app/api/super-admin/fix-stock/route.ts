import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Usamos SERVICE_ROLE para poder editar datos de CUALQUIER cliente (Super Admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { orgId, ingredientName, newStock } = await req.json()

    // 1. Buscamos el ingrediente por nombre exacto dentro de esa Org
    // (Usamos ilike para que no importe mayúsculas/minúsculas)
    const { data: ingredients, error: searchError } = await supabaseAdmin
      .from('ingredients')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', ingredientName) // ilike = insensitivo a mayúsculas

    if (searchError || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingrediente no encontrado' }, { status: 404 })
    }

    // 2. Si hay varios con el mismo nombre (raro, pero posible), actualizamos todos
    const idsToUpdate = ingredients.map(i => i.id)

    const { error: updateError } = await supabaseAdmin
      .from('ingredients')
      .update({ current_stock: newStock })
      .in('id', idsToUpdate)

    if (updateError) throw updateError

    // 3. Dejamos rastro en el log (Audit)
    await supabaseAdmin.from('audit_logs').insert({
        organization_id: orgId,
        action: 'Ajuste SuperAdmin',
        details: `Stock de ${ingredientName} forzado a ${newStock} por Soporte.`
    })

    return NextResponse.json({ success: true, rows: idsToUpdate.length })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}