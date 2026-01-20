import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');

  // 1. CARGAMOS LAS VARIABLES
  const phone = process.env.NEXT_PUBLIC_ADMIN_PHONE;
  const apiKey = process.env.NEXT_PUBLIC_ADMIN_APIKEY;

  // 2. IMPRIMIMOS EL DIAGNÓSTICO (Busca esto en tu terminal negra)
  console.log("================ DIAGNÓSTICO WHATSAPP ================");
  console.log("📱 Teléfono detectado:", phone ? `✅ Sí (${phone})` : "❌ NO SE LEYÓ (Es undefined)");
  console.log("🔑 API Key detectada:", apiKey ? "✅ Sí (Oculta)" : "❌ NO SE LEYÓ (Es undefined)");
  console.log("📝 Mensaje:", text);
  console.log("======================================================");

  if (!text || !phone || !apiKey) {
    return NextResponse.json({ error: 'Faltan datos de configuración' }, { status: 400 });
  }

  const externalUrl = `https://api.textmebot.com/send.php?recipient=${phone}&apikey=${apiKey}&text=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(externalUrl);
    const data = await response.text(); 
    
    // 3. IMPRIMIMOS LO QUE DIJO EL BOT
    console.log("🤖 EL BOT RESPONDIÓ:", data);
    console.log("======================================================");

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("❌ ERROR FATAL:", error);
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 });
  }
}