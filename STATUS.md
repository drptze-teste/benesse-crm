# Benesse CRM — Status & Ajustes

> Documento vivo de acompanhamento do app. Use como base para registrar pendências,
> decisões e detalhes a acertar. Atualizado conforme o trabalho avança.

_Última atualização: 2026-06-22_

## 🌐 Produção
- **App ao vivo:** https://crmbenesse--crm-benesse.us-east4.hosted.app
- **Repo:** https://github.com/drptze-teste/benesse-crm (deploy automático no push para `main`)
- **Firebase:** projeto `crm-benesse` · Firestore banco `(default)` · App Hosting back-end `crmbenesse` (us-east4)

## ⏸️ Onde paramos — sessão 2026-06-22
Construído nesta sessão (tudo no ar, último commit `d7e1170`):
1. Projeto unificado `benesse-crm` criado do zero (GitHub + Firebase `crm-benesse`), publicado via App Hosting.
2. Correções de persistência do CRM + Gemini movido pro backend.
3. Precificador embutido no CRM (aba + dentro da negociação).
4. Precificador: moeda BR (R$ 41,55), markup 10–90% com meio %, lucro/margem líquida, encargo CLT editável (65%).
5. Propostas anexadas ao cliente como histórico imutável + "Usar como base" (clona em rascunho novo).

**Retomar amanhã por aqui:**
- [ ] **Testar o fluxo de propostas** com um cliente real (converter um lead em Cliente → Precificador → "Salvar como proposta" → "Usar como base"). Validar na tela.
- [ ] Depois, decidir entre: criar usuários vendedores · ativar IA do WhatsApp · migração de dados (ver Pendências).

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
- [x] Precificador: encargo CLT **editável** no painel da Tabela de custos (salvo no dispositivo); aplica só a serviços CLT (CLT e PJ podem coexistir no mesmo orçamento)

## 🧭 Propostas/orçamentos anexados ao cliente
Abordagem: propostas = collection `negotiations` do Firestore (doc minúsculo, sem arquivos/Storage).
- [x] Snapshot COMPLETO no `pricing` (serviços + markup + encargo) para reabrir igual
- [x] Aba Precificador: botão **"Salvar como proposta"** → escolhe cliente + nome (padrão "Orçamento N")
- [x] Dentro do cliente: "Nova Negociação" com precificador embutido (já existia)
- [x] Propostas são **histórico imutável**: cada save é um registro novo com data/hora (createdAt)
- [x] Botão **"Usar como base"** na proposta → clona num rascunho editável no precificador; salvar gera uma NOVA proposta (o original não é alterado)
- [x] Data + hora exibidas em cada proposta na ficha do cliente

## 📋 Pendências
- [ ] **Usuários de login**: criar no console (Authentication → Users) os vendedores
      `vendedor1@benesse.com.br` / `vendedor2@benesse.com.br` (admin `drptze@gmail.com` já existe)
- [ ] **IA do WhatsApp**: criar segredo `firebase apphosting:secrets:set GEMINI_API_KEY --project crm-benesse`,
      descomentar o bloco em `apphosting.yaml` e dar novo push
- [x] **Migração de dados** do antigo `gen-lang-client-0070086689` (banco `ai-studio-55ed0d53-...`) →
      `crm-benesse` (default): **119 docs migrados** (35 leads, 35 interações, 12 tarefas, 5 docs,
      28 negociações, 3 users, 1 funil), IDs preservados. Script: `scripts/migrate.mjs`.
      ⚠️ Revogar as 2 service-account keys no console depois (IAM > contas de serviço).

## 📝 Detalhes a acertar (anote aqui)
- _(adicione itens conforme for testando o app)_

## 🔎 Referência rápida
- Núcleo de cálculo do precificador: `src/pricing/pricingUtils.ts` (`calcularProposta`, puro)
- Tela do precificador: `src/components/PrecificadorView.tsx`
- App principal (telas/forms/lógica): `src/App.tsx`
- Backend (webhook WhatsApp + IA): `server.ts`
