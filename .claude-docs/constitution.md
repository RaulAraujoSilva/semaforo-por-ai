# Constituição do Projeto - Semáforo por AI

## Princípios
- Simulação determinística (seeded PRNG) para comparação justa entre controladores
- Strategy Pattern para controladores de semáforo — o engine nunca sabe qual controller usa
- Separação clara: simulation (TS puro) → rendering (Canvas) → components (React UI)
- Deploy estático na Vercel, sem backend

## Padrões de Código
- TypeScript strict mode
- React 19 com hooks funcionais
- Canvas puro para renderização (sem libs de game)
- Tailwind CSS 4.2 para UI
- Commits em português com prefixo convencional (feat/fix/etc)

## Restrições
- TensorFlow.js apenas como devDependency (treinamento offline)
- Inferência DQN em produção usa multiplicação de matrizes pura (sem TF.js no bundle)
- Sem dependências externas para simulação
- Pesos DQN pré-treinados em JSON (não treina no browser)
