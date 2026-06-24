// Template da proposta comercial da Benesse Gestão Esportiva.
// Reproduz o modelo real (orçamentos do Drive): partes fixas da Benesse +
// campos variáveis por cliente/serviço. Função pura, sem IA.

export interface PropostaItem {
  item: string;        // Unidade ou nome do serviço (ex.: "Curitiba", "Quick Massage")
  data: string;        // data de execução (ex.: "28/04/2026")
  profissionais: number;
  dias: number;
  horasDia: string;    // "01:00"
  valorHora: number;   // preço/hora que o vendedor define
  valorTotal: number;  // valorHora * horas (linha)
}

export interface PropostaInput {
  dataExtenso: string;     // "São Paulo, 24 de abril de 2026"
  contratante: {
    nome: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  escopo: string;          // texto editável (escopo do serviço)
  responsabilidadesContratada?: string; // opcional, texto editável
  vigencia: string;        // "ação pontual" / "12 meses" etc.
  localidades?: string;    // endereços das unidades (opcional)
  itens: PropostaItem[];
  valorTotalGeral: number;
}

// ---- Dados FIXOS da Benesse (iguais em todo orçamento) ------------------
const PROPONENTE = {
  razaoSocial: 'Do Right Physical Trainers ltda - ME',
  cnpj: '20.358.096/0001-71',
  nomeComercial: 'Benesse Gestão Esportiva',
  inscricaoMunicipal: 'Isento',
  endereco: 'Rua Domingos Antonio Ciccone, 83 - Vila São Francisco',
  cidade: 'São Paulo', uf: 'SP', cep: '04710-220',
  telefone: '(11) 9 4329-4020',
  email: 'comercial@benessegestaoesportiva.com.br',
};
const REPRESENTANTE = 'José Luiz Gomes (Diretor Geral). RG: 24.888.131-0. CPF: 142.944.598-08.';

const DIFERENCIAIS = [
  'Realizamos todos os serviços com foco na melhoria da qualidade de vida dos colaboradores, promovendo melhor desempenho no trabalho e prevenindo lesões relacionadas a tracionamentos, postura inadequada, içamento de pesos, entre outros.',
  'Avaliamos trimestralmente todos os professores envolvidos na prestação do serviço, utilizando a metodologia NPS (Net Promoter Score), com elaboração e implementação de plano de ação sempre que a nota atribuída for inferior a 7.',
  'Todos os nossos professores e instrutores são graduados e registrados no CREF, ou certificados nas modalidades que ministram.',
  'Incluímos no escopo do projeto, sem custo adicional, palestras e oficinas com especialistas nas áreas de nutrição, motivação e mecânica do movimento.',
  'Oferecemos, mediante aprovação da administração e pagamento direto pelos interessados, atendimento presencial por nutricionista, médico do esporte, fisioterapeuta, massoterapeuta e coach de performance.',
  'Mantemos um “Programa de Capacitação Contínua” para nossos profissionais, por meio de cursos e palestras no nosso centro de treinamento.',
];

const RESP_CONTRATANTE_PADRAO = [
  'Disponibilizar espaço físico adequado para a realização das sessões;',
  'Autorizar o acesso do profissional às dependências do local nos dias e horários definidos;',
  'Apoiar na comunicação interna para divulgação das atividades aos colaboradores;',
  'Auxiliar na organização das agendas quando necessário;',
  'Acompanhar o cronograma de execução.',
];
const RESP_CONTRATADA_PADRAO =
  'Disponibilizar profissional devidamente qualificado; planejar e conduzir as atividades; ' +
  'realizar as aulas conforme cronograma; garantir organização, pontualidade e qualidade; ' +
  'respeitar normas de conduta, segurança e sigilo da empresa contratante.';

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const brl = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

export function buildProposalHtml(input: PropostaInput): string {
  const c = input.contratante;
  const cidadeUf = [c.cidade, c.uf].filter(Boolean).join(' - ');

  const itensRows = input.itens.map(i => `
    <tr>
      <td>${esc(i.item)}</td><td>${esc(i.data)}</td><td>${i.profissionais}</td>
      <td>${i.dias}</td><td>${esc(i.horasDia)}</td><td>${brl(i.valorHora)}</td><td>${brl(i.valorTotal)}</td>
    </tr>`).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Proposta — ${esc(c.nome)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.55;max-width:820px;margin:0 auto;padding:32px 28px 64px;}
  h1{color:#003366;font-size:1.3rem;border-bottom:3px solid #FF9900;padding-bottom:6px;margin-top:30px;}
  h2{color:#003366;font-size:1.05rem;margin-top:24px;}
  table{border-collapse:collapse;width:100%;margin:10px 0;font-size:.92rem;}
  td,th{border:1px solid #d9d9d9;padding:6px 8px;}
  .k{background:#f3f6fa;font-weight:bold;color:#003366;white-space:nowrap;}
  .invest th{background:#003366;color:#fff;text-align:center;}
  .invest td{text-align:center;}
  .total{font-size:1.15rem;font-weight:bold;color:#003366;}
  ul{margin:8px 0;padding-left:20px;} li{margin:4px 0;}
  .head{color:#6c757d;font-size:.9rem;}
</style></head><body>
  <p class="head">${esc(input.dataExtenso)}</p>
  <p>Ao<br/><strong>${esc(c.nome)}</strong></p>
  <p>É com satisfação que apresentamos esta proposta, elaborada com foco em promover saúde, bem-estar e qualidade de vida aos colaboradores de sua empresa. Permanecemos à disposição para esclarecer dúvidas ou fornecer informações adicionais sempre que necessário.</p>

  <h1>Empresas Envolvidas</h1>
  <h2>Contratante</h2>
  <table>
    <tr><td class="k">Nome</td><td colspan="3">${esc(c.nome)}</td></tr>
    ${c.cnpj ? `<tr><td class="k">CNPJ</td><td colspan="3">${esc(c.cnpj)}</td></tr>` : ''}
    ${c.endereco ? `<tr><td class="k">Endereço</td><td colspan="3">${esc(c.endereco)}</td></tr>` : ''}
    <tr><td class="k">Cidade</td><td>${esc(cidadeUf)}</td><td class="k">CEP</td><td>${esc(c.cep || '')}</td></tr>
  </table>
  <h2>Proponente</h2>
  <table>
    <tr><td class="k">Razão Social</td><td>${PROPONENTE.razaoSocial}</td><td class="k">CNPJ</td><td>${PROPONENTE.cnpj}</td></tr>
    <tr><td class="k">Nome Comercial</td><td>${PROPONENTE.nomeComercial}</td><td class="k">Inscrição Municipal</td><td>${PROPONENTE.inscricaoMunicipal}</td></tr>
    <tr><td class="k">Endereço</td><td colspan="3">${PROPONENTE.endereco} — ${PROPONENTE.cidade}/${PROPONENTE.uf}, CEP ${PROPONENTE.cep}</td></tr>
    <tr><td class="k">Telefone</td><td>${PROPONENTE.telefone}</td><td class="k">E-mail</td><td>${PROPONENTE.email}</td></tr>
  </table>
  <p><strong>Representante Legal:</strong> ${REPRESENTANTE}</p>
  <p><strong>Sindicato:</strong> Conselho Regional de Educação Física CREF/SP.</p>

  <h1>Apresentação</h1>
  <p>Na Benesse Gestão Esportiva, acreditamos que um ambiente de trabalho saudável e dinâmico é essencial para o bem-estar e a produtividade dos colaboradores. Com 10 anos de experiência, nossa assessoria especializada oferece soluções personalizadas de ginástica laboral e atividades físicas para empresas que buscam promover a saúde dos funcionários e melhorar o clima organizacional.</p>
  <p>Já desenvolvemos projetos com empresas como Centauro, Luggo, Plano&amp;Plano, entre outros. Sempre com foco em resultados reais e bem-estar coletivo.</p>

  <h1>Principais Diferenciais</h1>
  <ul>${DIFERENCIAIS.map(d => `<li>${esc(d)}</li>`).join('')}</ul>

  <h1>Escopo</h1>
  <p>${nl2br(input.escopo)}</p>

  <h1>Matriz de Responsabilidades</h1>
  <h2>Responsabilidades da Contratante</h2>
  <ul>${RESP_CONTRATANTE_PADRAO.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
  <h2>Responsabilidades da Contratada</h2>
  <p>${nl2br(input.responsabilidadesContratada || RESP_CONTRATADA_PADRAO)}</p>

  ${input.localidades ? `<h1>Localidades de Atendimento</h1><p>${nl2br(input.localidades)}</p>` : ''}

  <h1>Forma de Pagamento</h1>
  <p>O pagamento será realizado mediante emissão de nota fiscal, com vencimento em até 10 (dez) dias corridos após sua emissão, por meio de: Pix, Transferência Bancária ou Boleto.</p>

  <h1>Vigência do Contrato</h1>
  <p>${esc(input.vigencia)}</p>

  <h1>Investimento</h1>
  <table class="invest">
    <tr><th>Item</th><th>Data</th><th>Profissionais</th><th>Dias</th><th>Horas/dia</th><th>Valor hora</th><th>Valor Total</th></tr>
    ${itensRows}
    <tr><td colspan="6" style="text-align:right" class="total">Valor Total</td><td class="total">${brl(input.valorTotalGeral)}</td></tr>
  </table>

  <h1>Validade da Proposta</h1>
  <p>As condições comerciais apresentadas nesta proposta são válidas por 60 (sessenta) dias a contar desta data.</p>
</body></html>`;
}
