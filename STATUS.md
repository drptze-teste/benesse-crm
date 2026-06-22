# Benesse CRM — Status & Ajustes

> Documento vivo de acompanhamento do app. Use como base para registrar pendências,
> decisões e detalhes a acertar. Atualizado conforme o trabalho avança.

_Última atualização: 2026-06-22_

## 🌐 Produção
- **App ao vivo:** https://crmbenesse--crm-benesse.us-east4.hosted.app
- **Repo:** https://github.com/drptze-teste/benesse-crm (deploy automático no push para `main`)
- **Firebase:** projeto `crm-benesse` · Firestore banco `(default)` · App Hosting back-end `crmbenesse` (us-east4)

## ✅ Pronto
- Projeto unificado (CRM + Precificador) apontando para o Firebase próprio `crm-benesse`
- Firestore criado; Auth e-mail/senha + Google ativos; regras + índices deployados
- App Hosting publicando do repo `benesse-crm/main` (build verificado, login renderiza sem erros)
- Precificador como aba isolada + embutido na criação de negociação (grava `pricing`)
- Correções de persistência (writes com tratamento de erro, `source` unificado, `updatedAt` no create, regra de `documents` p/ admin/manager)
- Gemini movido para o backend (`/api/ai/*`), chave fora do bundle

## 🔧 Ajustes em andamento
- [x] Precificador: inputs de valor em moeda BR (R$ 41,55 — vírgula, 2 casas)
- [x] Precificador: markup aceita meio por cento (ex.: 65,5%)
- [x] Precificador: markup começa em 10% (era 30%)
- [x] Precificador: resultado mostra **lucro líquido** (R$) e **margem líquida** (já descontados comissão e ISS)
- [x] Precificador: encargo CLT ajustado de 82,7% → **65%** (confirmar valor exato com o contador)

## 📋 Pendências
- [ ] **Usuários de login**: criar no console (Authentication → Users) os vendedores
      `vendedor1@benesse.com.br` / `vendedor2@benesse.com.br` (admin `drptze@gmail.com` já existe)
- [ ] **IA do WhatsApp**: criar segredo `firebase apphosting:secrets:set GEMINI_API_KEY --project crm-benesse`,
      descomentar o bloco em `apphosting.yaml` e dar novo push
- [ ] **Migração de dados** do projeto antigo `gen-lang-client-0070086689` ("RH-Benesse") → `crm-benesse`
      (script Node com 2 service-account keys — decisão adiada)

## 📝 Detalhes a acertar (anote aqui)
- _(adicione itens conforme for testando o app)_

## 🔎 Referência rápida
- Núcleo de cálculo do precificador: `src/pricing/pricingUtils.ts` (`calcularProposta`, puro)
- Tela do precificador: `src/components/PrecificadorView.tsx`
- App principal (telas/forms/lógica): `src/App.tsx`
- Backend (webhook WhatsApp + IA): `server.ts`
