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

## 📲 WhatsApp Business (captação de mensagens)
Abordagem: **WhatsApp Cloud API oficial da Meta** (o webhook do app já recebe nesse formato).
- [x] Webhook pronto e testado no app: `GET/POST /api/webhook/whatsapp` salva em `whatsapp_inbox`
  - Callback URL: `https://crmbenesse--crm-benesse.us-east4.hosted.app/api/webhook/whatsapp`
  - Token de verificação: `benesse_crm_token` (env `WHATSAPP_VERIFY_TOKEN`)
- [x] Validação de assinatura `X-Hub-Signature-256` (opcional até setar `WHATSAPP_APP_SECRET`)
- [x] **Meta configurada e TESTADA** (app 1657620641584932, empresa verificada): webhook conectado
      (Callback URL + token), campo `messages` **assinado**. Teste do painel chegou no `whatsapp_inbox`. ✅
      Número de teste da Meta: **+1 555 667 3785** (válido 90 dias).
- [x] **App publicado na Meta (Ao vivo)** — política de privacidade servida pelo CRM em `/privacidade`,
      categoria preenchida, requisitos OK. Webhooks de produção habilitados.
- [ ] **Adicionar um número REAL** à conta WhatsApp Business (o número de teste só fala com destinatários
      de teste). Só com número real é que clientes quaisquer conseguem mandar mensagem e cair no CRM.
- [ ] Setar `WHATSAPP_APP_SECRET` (segredo) e mapear números reais → unidade de negócio
- [x] **Triagem manual da caixa de entrada**: cada mensagem tem **"Criar lead"** (manual, você revisa
      e confirma), **"IA"** (opcional, pré-preenche via Gemini) e **"Ignorar"**. Nada vira lead sozinho —
      você decide. Status vira "Virou lead" ou "Ignorado". Origem "WhatsApp" adicionada.
- [ ] (Opcional) Setar `GEMINI_API_KEY` para o botão "IA" pré-preencher o lead automaticamente
- [ ] ⚠️ Decisão do número real: migrar para a Cloud API **desativa o app do WhatsApp** nele (a linha/SIM
      para ligações e SMS continua) — avaliar número dedicado. Escopo atual: **só receber**

## 📄 Proposta de serviços (documento) — planejado
Objetivo: ao criar a proposta no precificador, gerar um **documento de proposta** na aba Documentos do
lead, enviável por WhatsApp/e-mail (vendedor decide), com **registro no histórico** de como foi enviado.
- **Modelo encontrado:** o precificador antigo já tem `gerarProposta` (em `precificador/src/services/
  geminiService.ts`) que gera **proposta HTML completa** (marca Benesse, 8 seções) **+ e-mail** de
  encaminhamento, a partir do resultado do cálculo + dados do cliente. Reaproveitar isso.
- **Plano:** portar `gerarProposta` para o backend do CRM (`/api/ai/generate-proposal`) → botão "Gerar
  proposta" → salva como `documents` (HTML em texto, sem precisar de Storage) → botões "Enviar por
  WhatsApp" (wa.me) e "Enviar por e-mail" (mailto) → registra `interaction` tipo 'Proposal' com o canal.
- **Dependências:** precisa do `GEMINI_API_KEY` (geração por IA). Formato pode ser refinado em cima do
  modelo existente. Falta confirmar com o usuário.

### ✅ v1 construída (sem IA) — 2026-06-23
Modelo real do usuário (orçamentos no Drive) reproduzido como **template fixo** + campos variáveis:
- `src/proposal/proposalTemplate.ts` — `buildProposalHtml()` com as partes fixas da Benesse
  (proponente, representante legal, apresentação, 6 diferenciais, forma de pagamento, validade 60d) e
  slots variáveis (contratante, escopo, vigência, localidades, tabela de investimento).
- `src/components/ProposalModal.tsx` — botão **"Gerar Proposta"** na aba Documentos do lead → modal com
  contratante (pré-preenchido), **escopo editável + alerta "revise antes de enviar"**, vigência,
  localidades e tabela de investimento (vendedor digita **valor/hora**). Gera o HTML, salva como
  `documents` (type 'Proposal', `content`=HTML) e grava CNPJ/endereço/cidade/UF/CEP/vigência no lead.
- Documentos lista as propostas (ícone teal "Proposta") com **"Ver"** (abre o HTML).
- Campos novos no tipo Lead: cnpj, endereco, cidade, uf, cep, vigencia (capturados/persistidos pelo modal).
- **Biblioteca de modelos** (`src/proposal/escopos.ts`): 7 escopos REAIS extraídos dos orçamentos do
  Drive — Condomínio (Assessoria Esportiva 12m), Empresa (Laboral, Riscos Psicossociais, Saúde no
  Trabalho), Evento (Quick Massage, Yoga, Laboral+Blitz) + "Em branco". O modal tem um seletor
  "Modelo de serviço" que carrega escopo + responsabilidades + vigência (todos editáveis).
### ✅ Fase 2 — envio + registro (2026-06-23)
- Backend serve cada proposta por **link público**: `GET /proposta/:id` (id não-adivinhável do Firestore).
- Na aba Documentos, cada proposta tem **WhatsApp** (abre wa.me do cliente com o link) e **E-mail**
  (abre o e-mail com assunto/corpo + link). Ao enviar, registra uma **interação** "Proposta enviada
  por WhatsApp/E-mail" no histórico do lead. "Ver" abre o link público.
- **Pendente:** exportar PDF com 1 clique; (opcional) IA p/ redigir o texto.

### ✅ Quadro de horários (condomínios) — construído no app
Grade semanal editável (Seg–Sáb × horários × aulas) — `src/proposal/scheduleTemplate.ts` +
`src/components/ScheduleModal.tsx`. Botão **"Quadro de Horários"** na aba Documentos → editor de grade
(adiciona horários, preenche a aula por dia) → salva como `documents` type 'Schedule' (HTML).
Aparece em Documentos (ícone indigo) com Ver (link público) e Enviar (WhatsApp/e-mail) + registro.
Feito no app (não Canva) por ser editável, linkável e integrado. Dias fixos Seg–Sáb (Dom dá pra add depois).

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
- [x] Botão "Novo Lead" estava escondido para admin → liberado (admin também cadastra lead manual)
- [x] Origens incluem "Indicação" (já tinha) + "Contato antigo" e "E-mail"; padrão do form = Indicação
- [x] Precificador embutido na negociação estava bugado (não abria) → trocado: botão **"Calcular no
      Precificador"** leva à tela cheia; lá você monta o orçamento e **escolhe o cliente** em "Salvar
      como proposta" (já vem pré-selecionado o cliente da negociação, mas dá pra trocar)
- _(adicione itens conforme for testando o app)_

## 🔎 Referência rápida
- Núcleo de cálculo do precificador: `src/pricing/pricingUtils.ts` (`calcularProposta`, puro)
- Tela do precificador: `src/components/PrecificadorView.tsx`
- App principal (telas/forms/lógica): `src/App.tsx`
- Backend (webhook WhatsApp + IA): `server.ts`
