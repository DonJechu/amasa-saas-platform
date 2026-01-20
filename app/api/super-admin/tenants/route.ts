import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Usamos la Service Role Key para saltarnos las reglas RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    // Traemos todas las organizaciones ordenadas por fecha
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json()
    
    // Actualizamos lo que nos manden (status, show_tutorial, etc.)
    const { error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}