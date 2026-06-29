# Benesse CRM — Status & Handoff

> Documento vivo e completo do projeto. Ponto de retomada, decisões, arquitetura,
> pendências e pegadinhas. **Leia "Onde paramos" e "Pendências" primeiro.**

_Última atualização: 2026-06-24_

---

## 🌐 Produção
- **App ao vivo:** https://crmbenesse--crm-benesse.us-east4.hosted.app
- **Repo:** https://github.com/drptze-teste/benesse-crm — **deploy automático no push para `main`** (App Hosting)
- **Firebase:** projeto **`crm-benesse`** · Firestore banco **`(default)`** · App Hosting back-end **`crmbenesse`** (região us-east4)
- **Login:** admin `drptze@gmail.com` (já existe, via e-mail/senha e Google). Vendedores ainda não criados.
- **Local:** `npm install` → `npm run dev` (tsx server.ts, porta 3000). `npm run build` = vite (client) + esbuild (server).

## ⏸️ Onde paramos — 2026-06-23 (ponto de retomada p/ nova sessão)
Tudo no ar e commitado. App **instalável (PWA)** + **persistência cross-device** confirmada.
Composição da proposta madura: capa (3 modelos Canva), modelos de escopo (7 reais), puxa o cálculo
do precificador (valor editável), resumo (horas/ISS/total), **grade com aulas do orçamento**, capa +
agradecimento, **baixar Word/PDF**, **enviar WhatsApp/e-mail + registro**, e **proposta EDITÁVEL** depois
de criada ("Editar" reabre o rascunho).

**Como retomar numa nova sessão:** abrir o Claude Code na pasta `benesse-crm` (ou Downloads) e pedir
"continuar o projeto benesse-crm" → ler este STATUS.md inteiro primeiro.

**Próximos sugeridos (em aberto):**
- [ ] Testar o ciclo completo num **condomínio** (precificador → proposta com grade → editar → enviar) e dar retorno.
- [x] **Gráficos do Dashboard zerados (base nova)** — 2026-06-24: Fontes de Prospecção e Segmentos mais Vendidos passam a contar só leads criados a partir de `CHART_RESET_DATE` (25/06/2026), via `chartLeads`. Não-destrutivo; enchem com os leads novos. Outras métricas/StatCards seguem usando todos os leads.
- [x] **IA (Gemini) ATIVA e testada em produção** — 2026-06-25: segredo `GEMINI_API_KEY` setado (chave formato novo `AQ.`) + billing ativo no projeto da chave + modelo **`gemini-2.5-flash`** (o `gemini-2.0-flash` foi descontinuado → 404). Rotas `/api/ai/proposal-text` (escopo/e-mail), `/api/ai/recompra-text` e `/api/ai/whatsapp-lead` confirmadas gerando texto. UI: "Escrever com IA"/"Gerar e-mail" no ProposalModal; botão "IA" no alerta de recompra. **Lição:** chaves novas do AI Studio vêm com prefixo `AQ.` (não `AIza`) e exigem billing; SDK `@google/genai` aceita o formato novo.
- [x] **Possível recompra (sazonalidade)** — 2026-06-24: motor determinístico em `src/recompra.ts` (`detectarRecompras`) analisa contratos `Won` por cliente+item (modalidade do precificador ou título), detecta recorrência em ≥2 anos distintos e prevê a próxima compra; alerta quando está a ≤60 dias. Surfaces: painel no **Dashboard**, **selo "Possível recompra"** no card do cliente (aba Clientes) e **popup ao logar** (1x por sessão via sessionStorage). Confiança alta = sempre no mesmo mês. _Futuro:_ incluir interações como sinal e usar IA (Gemini) p/ redigir o texto quando a `GEMINI_API_KEY` existir.
- [x] **Conferência de custo por serviço** — 2026-06-24: cada card do precificador mostra, abaixo do Custo/hora, uma faixa "Conferência": PJ → "Custo mês" (custo/hora × horas); CLT → "Salário base · Encargos X% · (Vale) · Custo mês" lado a lado. Reaproveita `calcularServico`; só exibição.
- [x] **Vale transporte/combustível (CLT)** — 2026-06-24: campo `valeCusto` editável no card, **só para CLT** (individual, não segue padrão). Somado ao custo do serviço **após** os encargos (vale não sofre encargo): `custoComEncargos = custoTotal×(1+encargo) + vale`. Persistido no snapshot (`NegotiationPricingItem.valeCusto`); reabre na proposta/"usar como base". Entra no custo bruto → reflete no valor final (não é mostrado ao cliente).
- [x] **Diagramação da proposta** — 2026-06-24: Empresas Envolvidas com colunas de rótulo de largura fixa + mais padding (valores deixam de ficar espremidos); Quadro de Horários ganhou campo de "Observações do quadro" (no rascunho `gradeObs`), não quebra a tabela; Investimento é `<section class="invest-block">` com `page-break-inside:avoid`. Quebras só aparecem no PDF/impressão.
- [x] **Paginação fixa da proposta** — 2026-06-24: tabela do Proponente arrumada (`table-layout:fixed`, rótulos 24% que quebram linha — fim do estouro/espaço em branco); páginas explícitas via `<section class="pg">` (`page-break-before:always`): pág.1 Empresas · pág.2 Apresentação+Diferenciais · pág.3 Escopo+Quadro · pág.4 Matriz+Pagamento+Vigência · pág.5 Investimento+Validade+Agradecimento.
- [x] **Orçamento → Proposta direto** — 2026-06-24: cada orçamento precificado (aba Negociações) tem botão "Gerar Proposta" que abre o gerador já baseado nele; o gerador mostra "Baseado no orçamento: …" (nome/valor/data). Botão genérico da aba Documentos usa o mais recente, também rotulado. Antes não havia caminho do orçamento p/ proposta e não se sabia qual orçamento entrava.
- [x] Aulas do precificador também no **Quadro de Horários separado** (ScheduleModal) — 2026-06-24: o modal recebe `pricing` e oferece as modalidades do orçamento como sugestões (datalist) nas células, igual à grade dentro da proposta.
- [ ] (Opcional) **IA** pra redigir escopo/e-mail (precisa do segredo `GEMINI_API_KEY`).
- [ ] Criar **usuários vendedores** e, se for usar a IA/WhatsApp em produção, setar os segredos + número real.

---

## 🗺️ Arquitetura / mapa de arquivos
```
src/App.tsx                         — app inteiro: telas, funil Kanban, formulários, lógica (arquivo grande)
src/firebase.ts                     — init Firebase (banco default; config em firebase-applet-config.json)
src/types.ts                        — modelos (Lead, Negotiation, NegotiationPricing, LeadDocument, etc.)
src/constants.ts                    — APP_USERS (perfis hardcoded por e-mail)
src/components/UI.tsx               — design system (Button, Card, Badge, cn)
src/components/PrecificadorView.tsx — precificador (aba + lógica de salvar proposta / usar como base)
src/components/ProposalModal.tsx    — gerar proposta (documento)
src/components/ScheduleModal.tsx    — gerar quadro de horários
src/pricing/                        — núcleo puro do cálculo: pricingUtils (calcularProposta), constants, types
src/proposal/proposalTemplate.ts    — HTML da proposta (template fixo Benesse + slots)
src/proposal/escopos.ts             — biblioteca de 7 escopos reais (condomínio/empresa/evento)
src/proposal/scheduleTemplate.ts    — HTML do quadro de horários (grade semanal)
server.ts                           — Express: webhook WhatsApp + /api/ai/* + /privacidade + /proposta/:id
scripts/migrate.mjs                 — migração de dados do projeto antigo
firestore.rules / firestore.indexes.json / apphosting.yaml
```

## 🔑 Coleções Firestore
`leads` · `interactions` · `tasks` · `documents` · `negotiations` · `users` · `funnel_configs` · `whatsapp_inbox`.
- Proposta/orçamento = doc em **`negotiations`** com campo `pricing` (snapshot do cálculo).
- Proposta gerada (HTML) e Quadro de horários = docs em **`documents`** com `content` (HTML) e `type` `Proposal`/`Schedule`.
- Regras versionadas em `firestore.rules` (deployadas). Índice composto de `interactions` em `firestore.indexes.json`.

---

## ✅ Pronto (por área)

### Base / infra
- Projeto unificado `benesse-crm` criado do zero → Firebase `crm-benesse`, publicado via App Hosting (deploy no push).
- Firestore criado; Auth e-mail/senha + Google ativos; regras + índices deployados.
- **Gemini movido para o backend** (`/api/ai/*`) — chave fora do bundle do browser. Modelo `gemini-2.0-flash` (env `GEMINI_MODEL`).
- Correções de persistência: writes com try/catch + feedback; `source` unificado (lê `leadSource` antigo); `updatedAt` no create; regra de `documents` libera admin/manager; guard de sessão na negociação.
- **Admin com acesso total** ao funil (arrasta cards) pra testar tudo. "Novo Lead" visível pro admin.
- Origens de lead: Indicação, Contato antigo, WhatsApp, E-mail, LinkedIn, Telefone, Evento, Site, Anúncio, Outro (padrão Indicação).

### Precificador (lógica validada pelo usuário ✅)
- Núcleo puro em `src/pricing/pricingUtils.ts` (`calcularProposta`).
- Inputs em moeda BR (R$ 41,55 — vírgula, 2 casas). Markup **10–90%** com meio % (65,5%).
- **Lucro líquido (R$)** e **margem líquida** (descontados comissão e ISS) no resultado.
- **Encargo CLT editável** (padrão 65% — confirmar com contador). Aplica só a serviços CLT; CLT e PJ coexistem no mesmo orçamento.
- **CLT vs PJ corrigido** (PJ não leva encargo), parsing pt-BR, guarda de divisão por zero.

### Propostas anexadas ao cliente (histórico imutável)
- "Salvar como proposta" (aba Precificador OU dentro do cliente) → cria `negotiation` com `pricing`. Nome padrão "Orçamento N".
- **Histórico imutável:** cada save é registro novo com data/hora. **"Usar como base"** clona num rascunho editável (gera NOVA proposta; original intacto).
- "Calcular no Precificador" (na Nova Negociação) **abre a tela cheia** do precificador (o embutido bugado foi removido).

### Proposta de serviços = DOCUMENTO (modelo real Benesse)
- `buildProposalHtml` reproduz o modelo real (partes fixas: proponente, representante legal, apresentação, 6 diferenciais, forma de pagamento, validade 60d) + slots variáveis.
- Botão **"Gerar Proposta"** na aba Documentos → modal: contratante (pré-preenchido), **seletor de Modelo de serviço** (7 escopos reais), escopo/responsabilidades/vigência editáveis (⚠️ alerta de revisão), localidades.
- **Puxa o cálculo do precificador** (negociação mais recente do cliente com `pricing`): tabela de investimento pré-preenchida (serviços + valor/hora sugerido = valor final ÷ horas, editável) + **resumo** (total de horas, subtotal, impostos ISS, valor total). Sem custos/margens internas.
- Campos novos no Lead: cnpj, endereco, cidade, uf, cep, vigencia (capturados e salvos pelo modal).
- Salva como `documents` type `Proposal` (`content`=HTML). Lista em Documentos com **Ver** (link público `/proposta/:id`) + **Enviar WhatsApp/E-mail** → registra interação no histórico.

### Quadro de horários (condomínios)
- Botão **"Quadro de Horários"** na aba Documentos → editor de grade (Seg–Sáb × horários × aulas) → salva como `documents` type `Schedule`. Ver/Enviar igual à proposta. Feito no app (não Canva).
- **Grade dentro da proposta:** no "Gerar Proposta" há a opção **"Incluir quadro de horários"** → a grade entra como seção da proposta (após o Escopo). Render compartilhado (`renderScheduleTable`).

### Capas (3 modelos do Canva)
- 3 capas exportadas do Canva (design `DAGiAVQXrfo` "Proposta Comercial") em `public/capas/capa1-3.png`.
- No "Gerar Proposta": **seletor de capa com miniaturas** (3 + "Sem capa de imagem"). A capa escolhida
  entra como 1ª página da proposta (imagem, URL absoluta `${origin}/capas/capaN.png` p/ funcionar no
  link, blob e Word). Default capa 1.

### Baixar Word + PDF
- Na aba Documentos, propostas e quadros têm **Word** (baixa `.doc` HTML editável, abre no Word) e **PDF**
  (abre o documento e dispara a impressão → salvar como PDF). O HTML gerado tem botão "Imprimir / PDF".

### Proposta editável + aulas na grade (2026-06-23)
- O documento da proposta guarda o **rascunho estruturado** (`data` = ProposalDraft) além do HTML.
  Botão **"Editar"** reabre o modal pré-preenchido → "Salvar alterações" **atualiza o mesmo documento**.
- No quadro de horários da proposta, as **modalidades do orçamento** viram sugestões (datalist) nas células.

### WhatsApp Business (Cloud API oficial da Meta)
- Webhook `GET/POST /api/webhook/whatsapp` salva em `whatsapp_inbox`. Validação de assinatura `X-Hub-Signature-256` (ativa quando `WHATSAPP_APP_SECRET` setado).
- **Meta configurada, app PUBLICADO (Ao vivo)**, webhook conectado + campo `messages` assinado, teste do painel chegou no CRM. ✅
- **Triagem manual:** cada mensagem na aba WhatsApp tem "Criar lead" (manual), "IA" (opcional) e "Ignorar". Nada vira lead sozinho.

### Migração de dados ✅
- **119 docs** migrados do projeto antigo → `crm-benesse` (IDs preservados). Script `scripts/migrate.mjs`.

### PWA + persistência cross-device ✅ (2026-06-23)
- **App instalável** (igual ao financeiro): `public/manifest.json` + `public/sw.js` (network-first) +
  `public/icons/icon-192.svg` (navy) + registro do SW no `index.html`. No Chrome/Edge: ícone "Instalar"
  na barra de endereço → vira app no notebook.
- **Persistência testada:** todos os dados (leads, negociações, propostas/quadros gerados, interações)
  ficam no Firestore → **cross-device automático** (real-time). Logar em outra máquina mostra tudo.
- **Config do precificador** (tabela de custos + encargo CLT) movida do localStorage → Firestore
  (`funnel_configs/pricing`), pra sincronizar entre máquinas. localStorage vira só cache. (O doc é
  criado na 1ª edição da tabela/encargo após o deploy.)
- **Firebase p/ uso interno:** nada crítico a mudar. Pendente opcional: criar usuários vendedores; segredos.

---

## 🔍 Deep review (2026-06-25) — multi-agente, 29 achados confirmados (8 alta / 11 média / 7 baixa)

**Corrigido e publicado nesta rodada (correções seguras):**
- [x] #7 Reabrir proposta injetava resumo financeiro de OUTRO orçamento (`null ?? pricing`) → em modo edição usa só o resumo salvo. **(impacto financeiro no cliente)**
- [x] #6 StatCards mostravam trends percentuais falsos (hardcoded) → removidos.
- [x] #5 Gráficos do Dashboard vazios sem aviso → empty state ("contam a partir de 25/06/2026").
- [x] #4 Import de planilha: datas BR (dd/mm/aaaa) quebravam/trocavam o mês (afetava recompra) → parser robusto + `cellDates`.
- [x] #15 Chamadas de IA sem timeout → `AbortSignal.timeout(30s)` nos 3 fetches.
- [x] #16/#25 Rotas de IA: `JSON.parse` isolado (502) + validação de entrada (400) + coerção de enums.
- [x] #19 Markup acima de 99% mostrava valor não-aplicado → clamp 1..99 no input.
- [x] #17/#26a Acessibilidade: popup de recompra (role/aria/ESC/Fechar) + aria-label na textarea da IA.
- [x] #18 "Atividade Recente" sem estado vazio → mensagem.

**Pendente — precisa de DECISÃO/AÇÃO sua (não apliquei p/ não arriscar em produção):**
- [x] #1 **Segurança ALTA — RESOLVIDO (2026-06-25):** rotas `/api/ai/*` agora exigem **ID token Firebase** (`Authorization: Bearer`); sem token → 401. Helper `isAuthed()` no server.ts (`admin.auth().verifyIdToken`), limite de corpo `256kb`, e os 3 clients enviam `getIdToken()`. (Rate-limit por IP fica como melhoria futura — a auth já bloqueia abuso externo.)
- [ ] #2 **Webhook WhatsApp** sem validar assinatura (App Secret vazio = aceita tudo). Setar `WHATSAPP_APP_SECRET` + tornar fail-closed em produção (não aplicar antes do segredo, senão derruba o webhook).
- [ ] #3 **Upload de arquivo não sobe ao Storage** (`fileUrl:'#'`, perda silenciosa). Precisa configurar Firebase Storage + regras.
- [ ] #8 Tabela "Investimento" da proposta: soma das linhas ≠ resumo (arredondamento). Decidir: distribuir resíduo na última linha OU ocultar coluna por linha quando houver resumo.
- [ ] #13/#14/#22/#23 **Regras do Firestore** (uid vs e-mail no ownership; `isValidTask` sem `businessUnit`; ordem do `isAdmin`; `WHATSAPP_VERIFY_TOKEN` previsível) — mudanças sensíveis, testar com cuidado.
- [ ] #10 Recompra usa negociações filtradas por vendor → pode perder recorrência / nome "Cliente". Decidir escopo (admin vê tudo).
- [ ] #9 `createdAt` inconsistente (Timestamp vs ISO) — padronizar em `serverTimestamp()`.
- [ ] #24 Deletar lead deixa negociações/interações órfãs → batch/soft-delete.
- [ ] #11 Erros de `onSnapshot` só no console → exibir banner.
> Relatório completo do review (todos os 29 com arquivo:linha) salvo no run do workflow `wf_59a70ae4-2bf`.

## 📋 Pendências (abertas)
- [ ] **Número REAL do WhatsApp:** o número de teste (+1 555 667 3785) só fala com destinatários cadastrados. Pra captar de clientes quaisquer, adicionar um número real à WABA. ⚠️ Colocar na Cloud API **desativa o app do WhatsApp** nele (ligações/SMS da linha seguem). Avaliar **número dedicado**. Escopo atual: só receber.
- [x] **`GEMINI_API_KEY`** (segredo): setado (v2) + bloco habilitado no `apphosting.yaml`. IA ativa em proposta, recompra e WhatsApp→lead.
- [ ] **`WHATSAPP_APP_SECRET`** (segredo, em Configurações Básicas do app Meta → "Chave Secreta"): ativa a validação de assinatura. Mesmo padrão de secret.
- [ ] **Usuários vendedores:** criar `vendedor1@/vendedor2@benesse.com.br` no console (Authentication → Users).
- [ ] **Revogar as 2 service-account keys** usadas na migração (console IAM → contas de serviço) — segurança.
- [ ] **Exportar PDF da proposta/quadro com 1 clique** (hoje é via imprimir do navegador).
- [ ] (Opcional) **IA pra redigir escopo/e-mail** da proposta (precisa da chave Gemini).

## 🧠 Decisões & pegadinhas (não esquecer)
- **Projeto antigo:** `gen-lang-client-0070086689` (rótulo **"RH-Benesse"**), banco `ai-studio-55ed0d53-...`. É de onde os dados foram migrados; **não é mais usado**. Repos/apps antigos (`crm-benesse/`, `precificador/` em Downloads) são legado.
- **Meta WhatsApp:** App ID `1657620641584932` · número de teste `+1 555 667 3785` · Phone Number ID `1159279957269383` · WABA ID `4589712571356514` · Callback `.../api/webhook/whatsapp` · Verify token `benesse_crm_token`.
- **Modelo de proposta:** veio dos orçamentos reais no Drive (pasta `1P9TMoIyBQeSeM6crPx1nflw88aHCbJSe`). 7 escopos em `src/proposal/escopos.ts`. Regra: **nunca mostrar custos/encargos/margens** ao cliente.
- **Valor/hora da proposta:** sugerido = valor final ÷ total de horas (editável). ISS no resumo é derivado do valor final (ISS_RATE 9,52%).
- **Encargo CLT 65%** é premissa — confirmar com o contador.
- **Gemini só no backend** — nunca reintroduzir `GoogleGenAI` no client nem injetar a chave via Vite `define`.
- **Banco default** — `getFirestore(app)` sem database id (o app antigo usava database customizado do AI Studio).

## 🔎 Referência rápida
- Cálculo: `src/pricing/pricingUtils.ts` · Precificador (tela): `src/components/PrecificadorView.tsx`
- Proposta: `src/components/ProposalModal.tsx` + `src/proposal/proposalTemplate.ts` + `src/proposal/escopos.ts`
- Quadro: `src/components/ScheduleModal.tsx` + `src/proposal/scheduleTemplate.ts`
- App/telas: `src/App.tsx` · Backend: `server.ts` (rotas `/api/webhook/whatsapp`, `/api/ai/whatsapp-lead`, `/privacidade`, `/proposta/:id`)
