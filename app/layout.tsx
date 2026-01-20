import type { Metadata, Viewport } from "next"; // <--- Agregamos Viewport
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. IMPORTAR LA NAVBAR AQUÍ 👇
import Navbar from "@/components/Navbar"; 
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. CONFIGURACIÓN MÓVIL (Color de barra y zoom)
export const viewport: Viewport = {
  themeColor: "#000000", // Color de la barra de estado en Android
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita que hagan zoom y rompan el diseño de App
};

// 3. METADATOS + MANIFIESTO
export const metadata: Metadata = {
  title: "AMASA System",
  description: "Sistema de control de pan",
  manifest: "/manifest.json", // <--- ESTO CONECTA TU APP
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AMASA System",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 2. AGREGAR EL COMPONENTE AQUÍ 👇 */}
        <Navbar />
        
        {/* Esto renderiza el resto de tus páginas (children) */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}