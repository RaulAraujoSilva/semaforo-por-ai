import { DualSimulation } from './components/DualSimulation'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          Semáforo por IA
        </h1>
        <p className="text-white/50 mt-2">
          Simulação comparativa: Temporização Fixa vs Controle Inteligente
        </p>
      </header>

      <main className="max-w-[1600px] mx-auto">
        <DualSimulation />
      </main>
    </div>
  )
}
