// utils/whatsapp.ts

export const sendWhatsAppAlert = async (message: string) => {
  // Ahora llamamos a NUESTRA propia API interna (el puente)
  // Nota: Usamos encodeURIComponent para que los emojis y espacios pasen bien
  const url = `/api/whatsapp?text=${encodeURIComponent(message)}`;

  try {
    await fetch(url);
    console.log("📨 Alerta enviada (vía Puente API)");
  } catch (error) {
    console.error("Error enviando alerta:", error);
  }
}