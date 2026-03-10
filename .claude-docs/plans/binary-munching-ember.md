# Plano: Simulador de Semaforos - Fixo vs IA

## Contexto

Criar uma simulacao visual de transito urbano para estudar e demonstrar a otimizacao de semaforos por IA. O projeto sera usado em palestra, com deploy na Vercel. A tela principal mostra duas cidades identicas lado a lado: uma com semaforos fixos (baseline) e outra com semaforos controlados por IA, recebendo o mesmo trafego para comparacao justa.

## Decisoes

- **Layout:** Grid 4x5 (4 linhas x 5 colunas de cruzamentos), 2 avenidas + ruas secundarias
- **Visualizacao:** Duas simulacoes lado a lado, sincronizadas
- **Deploy:** Vercel com CI/CD
- **Stack:** React 19 + TypeScript 5.9 + Vite 7.3 + Tailwind CSS 4.2 + Recharts + Canvas
- **Sem dependencias externas** para simulacao - Canvas puro + TypeScript

---

## Arquitetura

### Separacao de Responsabilidades

```
simulation/ (TS puro, sem React)  -->  rendering/ (Canvas)  -->  components/ (React UI)
```

- **Simulation engine** roda em ticks discretos (desacoplado do frame rate)
- **Rendering** usa requestAnimationFrame, interpola posicoes entre ticks
- **React** e apenas shell de UI (controles, dashboard, canvas wrapper)

### Strategy Pattern para Controladores

```typescript
interface TrafficController {
  name: string
  decide(state: IntersectionState): PhaseDecision
  reset(): void
}
```

- `FixedTimingController` - ciclos fixos (baseline)
- `RuleBasedAIController` - heuristicas baseadas em fila
- Futuro: `QLearningController`, `GeneticController`, `NeuralController`

O engine nunca sabe qual controller esta usando. Basta trocar via factory.

---

## Estrutura de Arquivos

```
src/
├── simulation/
│   ├── core/
│   │   ├── types.ts                # Tipos: Vehicle, Intersection, TrafficLight, etc.
│   │   ├── City.ts                 # Grid da cidade, criacao de intersecoes e roads
│   │   ├── Vehicle.ts              # Carro: posicao, rota, estado, movimento
│   │   ├── Intersection.ts         # Cruzamento com semaforos e filas
│   │   ├── Road.ts                 # Segmento de estrada entre cruzamentos
│   │   └── TrafficLight.ts         # Semaforo: fases, timer, cores
│   ├── engine/
│   │   ├── SimulationEngine.ts     # Loop principal: tick (spawn, move, semaforo, metricas)
│   │   ├── VehicleRouter.ts        # Pathfinding A* no grid
│   │   ├── VehicleSpawner.ts       # Gera veiculos com origem/destino aleatorios
│   │   └── CollisionManager.ts     # Evita sobreposicao de carros
│   ├── controllers/
│   │   ├── TrafficController.ts    # Interface Strategy
│   │   ├── FixedTimingController.ts
│   │   └── RuleBasedAIController.ts
│   ├── metrics/
│   │   ├── MetricsCollector.ts     # Coleta metricas por tick
│   │   └── MetricsStore.ts         # Historico para graficos
│   └── config/
│       ├── defaultCity.ts          # Layout 4x5 com avenidas e ruas
│       └── simulationConfig.ts     # Constantes: velocidades, spawn rates
├── rendering/
│   ├── CityRenderer.ts            # Ruas, calcadas, blocos (offscreen canvas cache)
│   ├── VehicleRenderer.ts         # Carros (retangulos coloridos)
│   ├── TrafficLightRenderer.ts    # Semaforos (circulos R/Y/G)
│   └── RenderLoop.ts             # rAF + speed control (1x-10x)
├── components/
│   ├── SimulationCanvas.tsx       # Canvas wrapper com hook
│   ├── DualSimulation.tsx         # Lado a lado: fixo vs IA
│   ├── SpeedControl.tsx           # 1x, 2x, 5x, 10x
│   ├── PlayPauseControl.tsx       # Play/Pause/Reset
│   ├── MetricsDashboard.tsx       # Cards comparativos + graficos
│   ├── MetricCard.tsx             # Card individual
│   └── ComparisonChart.tsx        # Recharts: metricas ao longo do tempo
├── hooks/
│   ├── useSimulation.ts           # Gerencia engine + render loop
│   └── useMetrics.ts              # Subscribe nas metricas
├── App.tsx
├── main.tsx
└── index.css                      # Tailwind + tema escuro
```

---

## Modelo de Dados Principais

### Cidade (Grid 4x5)
- 20 cruzamentos (4 linhas x 5 colunas)
- Colunas 1 e 3 = avenidas (verde mais longo: 45s)
- Linhas 1 e 3 = avenidas horizontais (verde mais longo: 45s)
- Demais = ruas secundarias (verde: 30s)
- 4 cruzamentos com travessia de pedestre (nos cruzamentos de avenidas)

### Semaforo (Fases)
- Fase 1: NS verde (avenida: 45s / rua: 30s)
- Fase 2: NS amarelo (5s)
- Fase 3: EW verde (avenida: 45s / rua: 30s)
- Fase 4: EW amarelo (5s)
- Fase 5 (opcional): Pedestre (15s, a cada 2 ciclos)

### Veiculo
- Spawn nas bordas do grid, destino aleatorio na borda oposta
- Velocidade max: ~60px/s (simula ~50km/h)
- Para no vermelho, mantem distancia do carro a frente
- Registra: tempo parado total, distancia percorrida, tempo de viagem

### Metricas
- Velocidade media (distancia / tempo de viagem)
- Tempo medio parado por veiculo
- Throughput (veiculos completados / minuto)
- Comprimento de fila por cruzamento

---

## AI Controller - Evolucao Iterativa

### Iteracao 1: RuleBasedAIController (neste projeto)
Regras heuristicas simples:
- Se fila_verde < 2 E fila_vermelha > 5: avancar para proxima fase
- Se fila_verde > 8: estender verde em 10s (max 60s)
- Fase pedestre encurta se pouco trafego de pedestres
- Coordenacao "onda verde" entre cruzamentos da mesma avenida

### Iteracao 2 (futuro): Q-Learning
- Estado discretizado: (fila_ns: low/med/high, fila_ew: low/med/high, fase: 0-4)
- Acoes: estender_5s, estender_10s, proxima_fase
- Recompensa: -1 * total_carros_parados
- Treina online durante a simulacao

### Iteracao 3 (futuro): Algoritmo Genetico
- Genoma = vetor de duracoes de fase por cruzamento
- Populacao de 20, fitness = throughput em 5min
- Roda em Web Worker

### Iteracao 4 (futuro): Rede Neural (TensorFlow.js)
- Input: estado de todos cruzamentos
- Output: decisao por cruzamento
- Treinado offline, modelo carregado

A interface `TrafficController` nunca muda - cada iteracao e um novo arquivo.

---

## Sincronizacao entre Simulacoes

Para comparacao justa:
- Ambas usam o **mesmo seed** de random (gerador pseudo-aleatorio com seed)
- Mesmo **schedule de spawn** (mesmos carros, mesmos horarios, mesmos destinos)
- Controles de velocidade e play/pause sincronizados
- Metricas coletadas nos mesmos ticks

---

## Fases de Implementacao

### Fase 1 - Scaffold + Cidade Estatica
- [ ] Scaffold Vite + React + Tailwind + TS
- [ ] `types.ts` com todos os tipos do dominio
- [ ] `defaultCity.ts` com layout 4x5
- [ ] `CityRenderer.ts` desenhando grid estatico no canvas
- [ ] `SimulationCanvas.tsx` mostrando a cidade

### Fase 2 - Semaforos Fixos
- [ ] `TrafficLight.ts` com ciclo de fases
- [ ] `FixedTimingController.ts`
- [ ] `TrafficLightRenderer.ts` (circulos R/Y/G)
- [ ] Semaforos mudando de cor no canvas

### Fase 3 - Veiculos
- [ ] `VehicleRouter.ts` (A* no grid)
- [ ] `VehicleSpawner.ts` (spawn nas bordas com seed)
- [ ] Logica de movimento: seguir rota, parar no vermelho
- [ ] `CollisionManager.ts` (distancia entre carros)
- [ ] `VehicleRenderer.ts`
- [ ] `SimulationEngine.ts` orquestrando tudo

### Fase 4 - Metricas + Dashboard
- [ ] `MetricsCollector.ts` + `MetricsStore.ts`
- [ ] `MetricsDashboard.tsx` com cards comparativos
- [ ] `ComparisonChart.tsx` com Recharts

### Fase 5 - AI Controller
- [ ] `RuleBasedAIController.ts` com heuristicas
- [ ] Teste comparativo fixo vs IA

### Fase 6 - Dual View + Polimento
- [ ] `DualSimulation.tsx` lado a lado
- [ ] Sincronizacao de seed, spawn, controles
- [ ] Controles de velocidade (1x, 2x, 5x, 10x)
- [ ] Play/Pause/Reset
- [ ] Travessia de pedestres

### Fase 7 - Deploy
- [ ] GitHub repo + CI/CD Vercel
- [ ] Responsividade para projecao em palestra
- [ ] Tema escuro profissional

---

## Verificacao

1. **Visual:** Cidade renderiza corretamente com ruas, cruzamentos e semaforos
2. **Semaforos:** Ciclos fixos funcionam com timing correto (avenida vs rua)
3. **Veiculos:** Carros seguem rotas, param no vermelho, nao se sobrepoe
4. **Metricas:** Velocidade media, tempo parado e throughput calculados corretamente
5. **Comparacao:** Ambas simulacoes recebem exatamente o mesmo trafego
6. **IA:** Controller IA mostra melhoria mensuravel vs fixo (menor tempo parado)
7. **Deploy:** Acesso via URL Vercel, funciona em tela de projecao
