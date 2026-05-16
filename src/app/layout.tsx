import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estimador de Copago — Asistente Médico con IA",
  description:
    "Estimador de copago médico impulsado por IA. Describe tus síntomas, ingresa tu número de póliza y obtén estimaciones de copago al instante en múltiples hospitales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
