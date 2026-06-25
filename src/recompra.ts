// Motor (determinístico) de "Possível recompra".
// Analisa os contratos FECHADOS (negociações 'Won') e detecta itens que o
// cliente costuma contratar numa certa época do ano. Quando a próxima
// ocorrência prevista está a até `leadDays` dias (padrão 60), gera um alerta.
// Função pura — recebe `now` para ser testável. A IA (quando a GEMINI_API_KEY
// existir) pode, no futuro, redigir o texto a partir destes dados.

import { Negotiation, Lead } from './types';

export interface RecompraAlert {
  customerId: string;
  customerName: string;
  item: string;            // modalidade do orçamento ou título do contrato
  expectedDate: string;    // ISO — 1º dia do mês previsto
  daysUntil: number;
  occurrences: number;     // nº de vezes que o item foi fechado
  years: number[];         // anos distintos em que recorreu
  basis: string;           // ex.: "fechou em dez/2023, dez/2024"
  lastValue: number;       // valor da última vez (referência)
  confidence: 'alta' | 'média';
}

const MES_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Extrai uma data válida da negociação (campo `date`, com fallback p/ `createdAt`).
function toDate(n: Negotiation): Date | null {
  const tryParse = (v: unknown): Date | null => {
    if (!v) return null;
    if (typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
      const d = (v as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
  };
  return tryParse(n.date) ?? tryParse((n as { createdAt?: unknown }).createdAt);
}

// Itens vendáveis da negociação: modalidades do precificador, ou o título.
function itemKeys(n: Negotiation): string[] {
  const mods = n.pricing?.servicos?.map(s => (s.modalidade || '').trim()).filter(Boolean) ?? [];
  if (mods.length) return Array.from(new Set(mods));
  const t = (n.title || '').trim();
  return t ? [t] : [];
}

export function detectarRecompras(
  negotiations: Negotiation[],
  leads: Lead[],
  now: Date = new Date(),
  leadDays = 60,
): RecompraAlert[] {
  const nameById = new Map(leads.map(l => [l.id, l.companyName || l.name || 'Cliente']));
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  type Occ = { date: Date; value: number };
  const groups = new Map<string, { customerId: string; item: string; occs: Occ[] }>();

  for (const n of negotiations) {
    if (n.status !== 'Won') continue;
    const d = toDate(n);
    if (!d) continue;
    for (const item of itemKeys(n)) {
      const key = n.customerId + '||' + item.toLowerCase();
      let g = groups.get(key);
      if (!g) { g = { customerId: n.customerId, item, occs: [] }; groups.set(key, g); }
      g.occs.push({ date: d, value: n.value || 0 });
    }
  }

  const alerts: RecompraAlert[] = [];
  for (const g of groups.values()) {
    const years = Array.from(new Set(g.occs.map(o => o.date.getFullYear()))).sort();
    if (years.length < 2) continue; // precisa recorrer em ≥2 anos distintos

    const sorted = [...g.occs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = sorted[sorted.length - 1];
    const targetMonth = last.date.getMonth();

    // Próxima ocorrência do mês-alvo, sempre no futuro e após a última compra.
    let year = startToday.getFullYear();
    let next = new Date(year, targetMonth, 1);
    while (next < startToday ||
      (next.getFullYear() === last.date.getFullYear() && next.getMonth() === last.date.getMonth())) {
      year++;
      next = new Date(year, targetMonth, 1);
    }

    const daysUntil = Math.round((next.getTime() - startToday.getTime()) / 86400000);
    if (daysUntil < 0 || daysUntil > leadDays) continue;

    const months = new Set(g.occs.map(o => o.date.getMonth()));
    const confidence: 'alta' | 'média' = months.size === 1 ? 'alta' : 'média';
    const basis = 'fechou em ' + sorted.slice(-3)
      .map(o => `${MES_ABBR[o.date.getMonth()]}/${o.date.getFullYear()}`).join(', ');

    alerts.push({
      customerId: g.customerId,
      customerName: nameById.get(g.customerId) || 'Cliente',
      item: g.item,
      expectedDate: next.toISOString(),
      daysUntil,
      occurrences: g.occs.length,
      years,
      basis,
      lastValue: last.value,
      confidence,
    });
  }

  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}
