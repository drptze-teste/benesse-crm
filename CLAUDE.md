# Benesse CRM — Contexto do Projeto

> App unificado: CRM dual-vertical + Precificador embutido. Projeto Firebase próprio `crm-benesse`.
> **Esta pasta (`benesse-crm/`) é um projeto independente** dentro de Downloads (que mistura vários).
> Sempre confira pasta + remote + `--project` antes de build/deploy. Nunca misture com os outros.

## Identidade
- **Pasta:** `benesse-crm/`
- **Remote:** github.com/drptze-teste/benesse-crm
- **Firebase:** projeto `crm-benesse` · banco Firestore padrão `(default)` · App Hosting
- **Origem:** fusão de `CRM-BENESSE` + `Precificador-Condominio-e-Laboral`
- ⚠️ Dados antigos estão no projeto `gen-lang-client-0070086689` ("RH-Benesse"), database
  customizado do AI Studio. Migração pendente (decisão adiada pelo usuário).

## Stack
- React 19 + TS + Vite 6 + Tailwind v4
- Express (`server.ts`): webhook WhatsApp + rotas de IA `/api/ai/*`
- Firebase Auth (e-mail/senha) + Firestore + App Hosting
- Gemini chamado **só no backend** (chave nunca no bundle do client)

## Deploy
- App: **App Hosting** ligado ao repo `benesse-crm` → deploy automático no push para `main` (`apphosting.yaml`)
- Regras: `firebase deploy --only firestore:rules`
- Índices: `firebase deploy --only firestore:indexes`
- Segredo Gemini: `firebase apphosting:secrets:set GEMINI_API_KEY`

## Convenções / lições
- **Gemini só no servidor** — nunca reintroduzir `GoogleGenAI` no client nem injetar a chave via Vite `define`
- Config Firebase web fica em `firebase-applet-config.json` (pública; pode commitar). Service account JSON **nunca** (está no .gitignore)
- `db = getFirestore(app)` usa o banco **padrão** — o app antigo usava database customizado do AI Studio (não replicar)
- Origem do lead = campo `source` (docs antigos usavam `leadSource`; leitura normaliza ambos)
- `currentStage` inicial deve ser um estágio válido (`Novo Contato`), nunca 'Prospecção'/'Novo Lead'
- Todo write crítico precisa de try/catch + feedback — regras do Firestore rejeitam em silêncio
- Negociação grava `pricing` (detalhamento do precificador) como campo extra — as rules aceitam sem alteração
- Query de `interactions` (where createdByUserId + orderBy dateTime) exige índice composto → versionado em `firestore.indexes.json`

## Estrutura
```
src/App.tsx                         — telas, formulários, lógica (arquivo grande)
src/components/PrecificadorView.tsx — precificador (aba + embutido na negociação via prop onApply)
src/pricing/                        — núcleo puro: pricingUtils (calcularProposta), constants, types
src/firebase.ts                     — init (banco padrão)
server.ts                           — Express: webhook WhatsApp + /api/ai/whatsapp-lead
firestore.rules / firestore.indexes.json / apphosting.yaml
```

## Próximos passos
- Migrar dados de "RH-Benesse" (gen-lang-client) → crm-benesse (script com 2 service-account keys)
- Habilitar Auth (e-mail/senha) + Firestore no console do crm-benesse e recriar os usuários
- Conectar App Hosting ao repo e configurar o segredo GEMINI_API_KEY
