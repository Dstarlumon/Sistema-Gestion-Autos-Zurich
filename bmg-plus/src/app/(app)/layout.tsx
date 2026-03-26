export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar placeholder */}
      <aside className="w-[260px] bg-[#0f172a] text-white flex-shrink-0 p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">B+</span>
          </div>
          <div>
            <div className="font-bold text-sm">BMG+</div>
            <div className="text-[10px] text-slate-500">ZURICH BPO</div>
          </div>
        </div>
        <nav className="space-y-1 text-sm text-slate-400">
          <a href="/dashboard" className="block px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">Dashboard</a>
          <a href="/gestion" className="block px-3 py-2 rounded-lg hover:bg-white/5">Gestión</a>
          <a href="/ventas" className="block px-3 py-2 rounded-lg hover:bg-white/5">Ventas</a>
          <a href="/calidad" className="block px-3 py-2 rounded-lg hover:bg-white/5">Calidad</a>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header placeholder */}
        <header className="h-14 border-b border-slate-100 bg-white flex items-center px-6">
          <span className="text-sm text-slate-500">Header — Phase 3</span>
        </header>
        <main className="flex-1 p-5 bg-[#faf8ff] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
