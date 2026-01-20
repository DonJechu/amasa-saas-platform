import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

export function useOrganization() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>('')
  const [businessType, setBusinessType] = useState<string>('panaderia')
  const [adminPin, setAdminPin] = useState<string>('1234')
  
  // DATOS DEL TICKET
  const [ticketHeader, setTicketHeader] = useState<string>('') 
  const [ticketFooter, setTicketFooter] = useState<string>('')

  // ESTADO DEL TUTORIAL
  const [showTutorial, setShowTutorial] = useState(false) 

  // NUEVOS ESTADOS DE NEGOCIO (PLANES Y PERMISOS) 👇
  const [plan, setPlan] = useState<string>('basic') // 'basic' | 'pro'
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrg() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // PEDIMOS TODO: Datos de Org, Plan, Tutorial y si eres Super Admin
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            organization_id, 
            is_super_admin,
            organizations (
                name, 
                business_type, 
                admin_pin, 
                ticket_header, 
                ticket_footer, 
                show_tutorial, 
                plan
            )
          `)
          .eq('id', user.id)
          .single()

        if (profile) {
          setOrgId(profile.organization_id)
          
          // 1. Guardamos si eres el Super Admin
          setIsSuperAdmin(profile.is_super_admin || false)

          // 2. Guardamos datos de la Organización
          // @ts-ignore
          const org: any = profile.organizations

          if (org) {
            setOrgName(org.name || 'Mi Negocio')
            setBusinessType(org.business_type || 'panaderia')
            setAdminPin(org.admin_pin || '1234')
            
            // Ticket
            setTicketHeader(org.ticket_header || '*** VENTA MOSTRADOR ***')
            setTicketFooter(org.ticket_footer || 'Gracias por su compra')

            // Tutorial
            setShowTutorial(org.show_tutorial || false)

            // 3. Guardamos el Plan Contratado
            setPlan(org.plan || 'basic')
          }
        }
      }
      setLoading(false)
    }
    loadOrg()
  }, [])

  return { 
    orgId, 
    orgName, 
    businessType, 
    adminPin, 
    ticketHeader, 
    ticketFooter, 
    showTutorial, 
    plan,           // <--- Nuevo: Usar esto para ocultar botones en Navbar
    isSuperAdmin,   // <--- Nuevo: Usar esto para proteger rutas
    loading 
  }
}