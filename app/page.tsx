import DiagramCanvas from "@/components/DiagramCanvas";

export default function Page() {
  return (
    <main className="container py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modelador de Clases (MVP)</h1>
        <div className="text-sm text-gray-500">Next.js + React Flow + Zustand</div>
      </header>
      <section className="grid grid-cols-1 gap-6">
        <DiagramCanvas />
        <div className="text-sm text-gray-600">
          Próximos pasos: validar con Zod, panel de hallazgos, exportar a JSON y conectar Yjs para coedición.
        </div>
      </section>
    </main>
  );
}
