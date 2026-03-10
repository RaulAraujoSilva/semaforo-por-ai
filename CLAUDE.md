# Semáforo por AI

Simulação visual de trânsito urbano comparando semáforos fixos vs controlados por IA (DQN).
Projeto para palestra sobre otimização de semáforos por inteligência artificial.

## Stack
- React 19 + TypeScript 5.9 + Vite 7.3 + Tailwind CSS 4.2
- Recharts para gráficos
- Canvas puro para renderização
- TensorFlow.js (devDependency apenas para treinamento)

## Deploy
- **URL:** https://semaforo-por-ai.vercel.app
- **Repo:** github.com/RaulAraujoSilva/semaforo-por-ai
- **Branch:** master

## Arquitetura

```
src/simulation/   → Engine de simulação (TS puro, sem React)
src/rendering/    → Renderização Canvas
src/components/   → React UI (controles, dashboard, canvas wrapper)
src/hooks/        → Hooks React (useSimulation)
training/         → Treinamento DQN offline (não vai pro bundle)
public/           → Assets estáticos + dqn-weights.json
```

### Strategy Pattern
```typescript
interface TrafficController {
  name: string
  decide(state: IntersectionState): PhaseDecision
  reset(): void
}
```
Controllers disponíveis: FixedTimingController, RuleBasedAIController, DQNController

### DQN
- Rede: 11 → 64 (ReLU) → 32 (ReLU) → 2 (linear)
- Estado: 11 features (filas N/S/E/W, fase, tempo, luzes, tipo via, pressão)
- Ações: 0=continuar, 1=próxima fase
- Inferência em produção: multiplicação de matrizes pura (sem TF.js)
- Pesos pré-treinados em `public/dqn-weights.json`

## Scripts
- `npm run dev` — dev server
- `npm run build` — build produção
- `npm run train` — treinar DQN (CPU, ~15min)

## Resultados DQN vs Baseline Fixo
- **58% menos tempo parado** (12.9s vs 30.8s)
- **+15% throughput** (45.1/min vs 40.5/min)
