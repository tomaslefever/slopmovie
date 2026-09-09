import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kinetic Cinema // Cine Interactivo IA en Vivo (100 Pasos)",
  description: "Plataforma de streaming de cine interactivo impulsada por IA. Clips de 15 segundos, votaciones de 10 segundos con DeepSeek y fal.ai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050608] text-white select-none">
        {children}
      </body>
    </html>
  );
}
