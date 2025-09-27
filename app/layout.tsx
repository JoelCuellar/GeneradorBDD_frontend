import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CASE Frontend Starter",
  description: "Collaborative UML-to-code tool - starter UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

