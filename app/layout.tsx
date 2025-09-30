import "../styles/globals.css"
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "Generador BDD",
    template: "%s | Generador BDD",
  },
  description: "Aplicación para gestión de proyectos, invitaciones y modelado colaborativo.",
};

export const viewport: Viewport = {
  themeColor: "#111827",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
