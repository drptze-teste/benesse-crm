import { Atividade, ResultadoProposta } from './pricingTypes';
import { ENCARGO_CLT, ISS_RATE } from './pricingConstants';

/**
 * Converte entrada numérica tolerando o formato pt-BR (vírgula decimal,
 * separador de milhar com ponto) e strings vazias. Sempre retorna número
 * finito — nunca NaN — para não propagar lixo pela cadeia de cálculo.
 */
export function parseNum(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (cleaned === '') return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export function calcComissao(v: number): number {
  if (v <= 8000)  return 0.03;
  if (v <= 20000) return 0.04;
  return 0.05;
}

export function markupSugerido(custoTotalBruto: number): number {
  const est = custoTotalBruto / (1 - 0.65);
  if (est < 15000)  return 70;
  if (est <= 30000) return 65;
  return 60;
}

export function calcularServico(s: Atividade, encargoCltFrac: number = ENCARGO_CLT) {
  const dias = s.tipoServico === 'Pontual' ? (s.quantidadeEventos || 1) : s.diasMes;
  const horasMes         = parseNum(dias) * parseNum(s.horasDia);
  const custoTotal       = parseNum(s.custoHora) * horasMes;
  // PJ não incide encargos CLT; só CLT recebe o multiplicador de encargos.
  const encargo          = s.regime === 'PJ' ? 1 : (1 + encargoCltFrac);
  const custoComEncargos = custoTotal * encargo;
  return { horasMes, custoTotal, custoComEncargos };
}

/**
 * @param encargoCltPct percentual de encargos CLT (ex.: 65). Se omitido, usa ENCARGO_CLT.
 */
export function calcularProposta(servicos: Atividade[], markupPct?: number, encargoCltPct?: number): ResultadoProposta {
  const encargoCltFrac = encargoCltPct !== undefined ? Math.max(0, parseNum(encargoCltPct, 65)) / 100 : ENCARGO_CLT;
  let custoTotalBruto = 0;
  const servicosCalculados = servicos.map(s => {
    const c = calcularServico(s, encargoCltFrac);
    custoTotalBruto += c.custoComEncargos;
    return { ...s, ...c };
  });

  const mPctRaw = markupPct !== undefined ? markupPct : markupSugerido(custoTotalBruto);
  // Clamp defensivo: markup >= 100 causaria divisão por zero / valor negativo.
  const mPct = Math.min(99, Math.max(1, parseNum(mPctRaw, 65)));
  const markup = mPct / 100;
  const valorSemImpostos     = custoTotalBruto / (1 - markup);
  const comissaoRate         = calcComissao(valorSemImpostos);
  const valorComComissao     = valorSemImpostos / (1 - comissaoRate);
  const iss                  = valorComComissao * ISS_RATE;
  const valorFinal           = valorComComissao + iss;
  const margemLucro          = valorFinal > 0 ? (valorFinal - custoTotalBruto) / valorFinal : 0;
  // Lucro líquido: o que sobra após custo, comissão e imposto. Como comissão e
  // ISS são embutidos "por cima", em valor absoluto o lucro equivale ao markup.
  const lucroLiquido         = valorSemImpostos - custoTotalBruto;
  const margemLiquida        = valorFinal > 0 ? lucroLiquido / valorFinal : 0;
  const totalHoras           = servicosCalculados.reduce((a, s) => a + s.horasMes, 0);

  return {
    servicosCalculados, custoTotalBruto, markup, markupPct: mPct,
    comissaoRate, valorSemImpostos, valorComComissao,
    iss, valorFinal, margemLucro, lucroLiquido, margemLiquida, totalHoras
  };
}

/**
 * Resolve o custo/hora de uma modalidade contra a tabela de referência.
 * Retorna também `matched` para a UI poder avisar quando caiu no fallback,
 * em vez de aplicar 35 silenciosamente.
 */
export function matchCusto(
  nome: string,
  tabela: { nome: string; custoBase: number }[]
): { custo: number; matched: boolean } {
  const n = nome.toLowerCase().trim();
  if (!n) return { custo: 35, matched: false };
  // 1) match exato tem prioridade (evita "Natação Adulta" casar com "Natação Infantil")
  const exact = tabela.find(m => m.nome.toLowerCase() === n);
  if (exact) return { custo: exact.custoBase, matched: true };
  // 2) heurística por inclusão
  const found = tabela.find(m =>
    n.includes(m.nome.toLowerCase()) ||
    m.nome.toLowerCase().includes(n.split(" ")[0])
  );
  return found ? { custo: found.custoBase, matched: true } : { custo: 35, matched: false };
}

/** Formata número como moeda BRL. */
export function formatBRL(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}
