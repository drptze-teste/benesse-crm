import { Modalidade } from './pricingTypes';

// Encargos e impostos usados no cálculo da proposta.
// ENCARGO_CLT: percentual de encargos trabalhistas sobre o custo direto da mão
// de obra CLT (INSS, FGTS, 13º, férias+1/3, provisões de rescisão, etc).
// Valor varia conforme as premissas contábeis — confirme com o contador.
export const ENCARGO_CLT = 0.65;    // Encargos CLT (~65%)
export const ISS_RATE = 0.0952;     // ISS / Simples Nacional

export const TURNOS = ["Manhã", "Tarde", "Noite", "Manhã/Tarde", "Tarde/Noite", "Manhã/Noite", "Integral"];
export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Chave de persistência local da tabela de custos-base (por dispositivo).
// TODO(fase futura): migrar para uma config global no Firestore (funnel_configs/pricing).
export const PRICING_TABLE_KEY = "benesse_tabela_ref";

export const MODALIDADES_DEFAULT: Modalidade[] = [
  { nome: "Aerofight",               custoBase: 40 },
  { nome: "Afromix",                 custoBase: 40 },
  { nome: "Alongamento",             custoBase: 35 },
  { nome: "Aula de Circo",           custoBase: 70 },
  { nome: "Aula de Fit Dance",       custoBase: 40 },
  { nome: "Ballet Infantil",         custoBase: 40 },
  { nome: "Basquete",                custoBase: 35 },
  { nome: "Beach Tennis",            custoBase: 60 },
  { nome: "Boxe",                    custoBase: 60 },
  { nome: "Capoeira Infantil/Juvenil", custoBase: 40 },
  { nome: "Condicionamento",         custoBase: 40 },
  { nome: "Corrida",                 custoBase: 35 },
  { nome: "Cross Funcional",         custoBase: 40 },
  { nome: "Dança",                   custoBase: 40 },
  { nome: "Escola de Esporte",       custoBase: 35 },
  { nome: "Funcional",               custoBase: 35 },
  { nome: "Futebol",                 custoBase: 35 },
  { nome: "Futsal/Basquete",         custoBase: 35 },
  { nome: "Ginástica Laboral",       custoBase: 30 },
  { nome: "Hapkido",                 custoBase: 40 },
  { nome: "Hidroginástica",          custoBase: 35 },
  { nome: "Jazz",                    custoBase: 40 },
  { nome: "Judô",                    custoBase: 40 },
  { nome: "Jump",                    custoBase: 40 },
  { nome: "Luta (Artes Marciais)",   custoBase: 40 },
  { nome: "Quick Massage",            custoBase: 58 },
  { nome: "Massagista Quick",        custoBase: 58 },
  { nome: "Muay Thai",               custoBase: 60 },
  { nome: "Musculação",              custoBase: 20 },
  { nome: "Natação Adulta",          custoBase: 35 },
  { nome: "Natação Adulto/Infantil", custoBase: 35 },
  { nome: "Natação Infantil",        custoBase: 35 },
  { nome: "Pilates",                 custoBase: 35 },
  { nome: "Recreação",               custoBase: 35 },
  { nome: "Recreação/Brinquedoteca", custoBase: 35 },
  { nome: "Ritmos",                  custoBase: 30 },
  { nome: "Spinning",                custoBase: 40 },
  { nome: "Supervisores",            custoBase: 60 },
  { nome: "Tênis",                   custoBase: 70 },
  { nome: "Volleyball",              custoBase: 35 },
  { nome: "Yoga",                    custoBase: 40 },
  { nome: "Zumba",                   custoBase: 40 },
  { nome: "Zumba Infantil",          custoBase: 35 },
];
