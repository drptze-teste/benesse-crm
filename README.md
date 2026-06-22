# Benesse CRM

CRM dual-vertical da Benesse (**Gestão Esportiva** B2B + **Studio de Pilates** B2C) com
**Precificador** integrado para criação de propostas de condomínio e ginástica laboral.

Projeto unificado: junta o antigo CRM-BENESSE e o Precificador-Condominio-e-Laboral
num único app, apontando para um projeto Firebase próprio (`crm-benesse`).

## Stack
- React 19 + TypeScript + Vite 6 + Tailwind v4
- Backend Express (`server.ts`) — webhook do WhatsApp Business + rotas de IA (`/api/ai/*`)
- Firebase: Auth (e-mail/senha), Firestore (banco padrão), App Hosting
- IA: Google Gemini (chamado **só no backend**; a chave nunca vai ao bundle do browser)

## Projeto Firebase
- **Projeto:** `crm-benesse`
- **Banco Firestore:** padrão `(default)`
- ⚠️ O app **antigo** vivia no projeto `gen-lang-client-0070086689` (rotulado "RH-Benesse"),
  num database customizado do AI Studio. Migração de dados → ver `scripts/` (a definir).

## Rodar local
```bash
npm install
# .env (não commitar):
#   GEMINI_API_KEY=...        (usada só no server)
#   GEMINI_MODEL=gemini-2.0-flash
#   WHATSAPP_VERIFY_TOKEN=benesse_crm_token
npm run dev        # tsx server.ts → http://localhost:3000
```

## Build
```bash
npm run build      # vite build (client) + esbuild server.ts → dist/server.cjs
npm start          # node dist/server.cjs (produção)
```

## Deploy
- **App (backend + front):** Firebase **App Hosting**, conectado ao repo GitHub
  `drptze-teste/benesse-crm` (deploy automático no push para `main`). Config em `apphosting.yaml`.
- **Regras Firestore:** `firebase deploy --only firestore:rules`
- **Índices Firestore:** `firebase deploy --only firestore:indexes`
- **Segredo do Gemini:** `firebase apphosting:secrets:set GEMINI_API_KEY`

## Estrutura
```
src/App.tsx                       — app inteiro (telas, formulários, lógica)
src/firebase.ts                   — init Firebase (config inline em firebase-applet-config.json)
src/components/UI.tsx             — design system (Button, Card, Badge…)
src/components/PrecificadorView.tsx — precificador (aba isolada + embutido na negociação)
src/pricing/                      — núcleo puro de cálculo (calcularProposta) + constantes/tipos
src/types.ts                      — modelos (Lead, Negotiation, NegotiationPricing…)
server.ts                         — Express: webhook WhatsApp + /api/ai/whatsapp-lead
firestore.rules / firestore.indexes.json
apphosting.yaml                   — runtime do App Hosting
```

## Módulos
- Funil Kanban de leads (drag-and-drop), clientes, tarefas, interações, negociações
- WhatsApp inbox (webhook Meta) + enriquecimento de lead por IA
- **Precificador**: aba própria + botão "Calcular com precificador" dentro da Nova Negociação,
  que preenche o valor e grava o detalhamento (`pricing`) na negociação
