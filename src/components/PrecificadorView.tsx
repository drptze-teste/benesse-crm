import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Settings, RotateCcw, Save, Calculator, AlertTriangle, Check } from 'lucide-react';
import { Card, Button, Badge, cn } from './UI';
import { Atividade, Modalidade, ResultadoProposta } from '../pricing/pricingTypes';
import { NegotiationPricing } from '../types';
import {
  MODALIDADES_DEFAULT, PRICING_TABLE_KEY, PRICING_ENCARGO_KEY, ENCARGO_CLT, TURNOS,
} from '../pricing/pricingConstants';
import {
  calcularProposta, matchCusto, parseNum, formatBRL,
} from '../pricing/pricingUtils';

// --- Persistência local da tabela de custos-base ------------------------
function loadTabela(): Modalidade[] {
  try {
    const raw = localStorage.getItem(PRICING_TABLE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignora JSON inválido */ }
  return MODALIDADES_DEFAULT;
}

function saveTabela(t: Modalidade[]) {
  try { localStorage.setItem(PRICING_TABLE_KEY, JSON.stringify(t)); } catch { /* quota */ }
}

const ENCARGO_DEFAULT = Math.round(ENCARGO_CLT * 1000) / 10; // ex.: 65

function loadEncargo(): number {
  try {
    const raw = localStorage.getItem(PRICING_ENCARGO_KEY);
    if (raw != null && raw !== '') { const n = parseNum(raw, ENCARGO_DEFAULT); if (n >= 0) return n; }
  } catch { /* ignora */ }
  return ENCARGO_DEFAULT;
}

function saveEncargo(v: number) {
  try { localStorage.setItem(PRICING_ENCARGO_KEY, String(v)); } catch { /* quota */ }
}

const novoServico = (tabela: Modalidade[]): Atividade => {
  const modalidade = tabela[0]?.nome ?? 'Ginástica Laboral';
  const custoHora = matchCusto(modalidade, tabela).custo;
  return {
    modalidade, turno: 'Manhã', horario: '', diasSemana: [],
    diasMes: 12, horasDia: 1, custoHora, regime: 'PJ',
    tipoServico: 'Recorrente', quantidadeEventos: 1,
  };
};

// Converte o resultado do cálculo no detalhamento gravável numa negotiation.
function toNegotiationPricing(res: ResultadoProposta): NegotiationPricing {
  return {
    markupPct: res.markupPct,
    custoTotalBruto: res.custoTotalBruto,
    valorFinal: res.valorFinal,
    margemLucro: res.margemLucro,
    lucroLiquido: res.lucroLiquido,
    margemLiquida: res.margemLiquida,
    totalHoras: res.totalHoras,
    servicos: res.servicosCalculados.map(s => ({
      modalidade: s.modalidade,
      tipoServico: s.tipoServico,
      diasMes: s.diasMes,
      horasDia: s.horasDia,
      custoHora: s.custoHora,
      regime: s.regime,
      horasMes: s.horasMes,
    })),
  };
}

interface PrecificadorViewProps {
  // Quando fornecido, exibe um botão para aplicar o valor calculado (ex.: numa negociação).
  onApply?: (valorFinal: number, pricing: NegotiationPricing) => void;
  embedded?: boolean;
}

export function PrecificadorView({ onApply, embedded }: PrecificadorViewProps = {}) {
  const [tabela, setTabela] = useState<Modalidade[]>(loadTabela);
  const [servicos, setServicos] = useState<Atividade[]>(() => [novoServico(loadTabela())]);
  const [markupPct, setMarkupPct] = useState(65);
  const [encargoCltPct, setEncargoCltPct] = useState<number>(loadEncargo);
  const [showTabela, setShowTabela] = useState(false);

  const resultado = useMemo(
    () => calcularProposta(servicos, markupPct, encargoCltPct),
    [servicos, markupPct, encargoCltPct]
  );

  const updateServico = (i: number, patch: Partial<Atividade>) => {
    setServicos(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const onModalidadeChange = (i: number, nome: string) => {
    const { custo } = matchCusto(nome, tabela);
    updateServico(i, { modalidade: nome, custoHora: custo });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-10">
        {/* Coluna de entrada */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-black text-xl text-[#003366] flex items-center gap-2">
                <Calculator size={22} /> Precificador
              </h3>
              <p className="text-xs text-gray-500">
                Monte os serviços e ajuste o markup para chegar ao valor da proposta.
              </p>
            </div>
            <Button variant="outline" size="sm" icon={<Settings size={16} />}
              onClick={() => setShowTabela(v => !v)}>
              Tabela de custos
            </Button>
          </div>

          {showTabela && (
            <TabelaEditor
              tabela={tabela}
              onChange={(t) => { setTabela(t); saveTabela(t); }}
              encargoCltPct={encargoCltPct}
              onEncargoChange={(v) => { setEncargoCltPct(v); saveEncargo(v); }}
              onClose={() => setShowTabela(false)}
            />
          )}

          {servicos.map((s, i) => {
            const matched = matchCusto(s.modalidade, tabela).matched;
            return (
              <Card key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Serviço {i + 1}</span>
                  <button
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                    onClick={() => setServicos(prev => prev.filter((_, idx) => idx !== i))}
                    disabled={servicos.length === 1}
                    aria-label="Remover serviço"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Modalidade" className="col-span-2 md:col-span-1">
                    <input
                      list="modalidades-list"
                      className={inputCls}
                      value={s.modalidade}
                      onChange={e => onModalidadeChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="Turno">
                    <select className={inputCls} value={s.turno}
                      onChange={e => updateServico(i, { turno: e.target.value })}>
                      {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Regime">
                    <select className={inputCls} value={s.regime}
                      onChange={e => updateServico(i, { regime: e.target.value as 'CLT' | 'PJ' })}>
                      <option value="PJ">PJ</option>
                      <option value="CLT">CLT (+{formatPct(encargoCltPct, 1)}% encargos)</option>
                    </select>
                  </Field>
                  <Field label="Tipo">
                    <select className={inputCls} value={s.tipoServico}
                      onChange={e => updateServico(i, { tipoServico: e.target.value as 'Recorrente' | 'Pontual' })}>
                      <option value="Recorrente">Recorrente (mensal)</option>
                      <option value="Pontual">Evento pontual</option>
                    </select>
                  </Field>
                  {s.tipoServico === 'Pontual' ? (
                    <Field label="Qtd. eventos">
                      <input type="number" min={1} className={inputCls}
                        value={s.quantidadeEventos ?? 1}
                        onChange={e => updateServico(i, { quantidadeEventos: parseNum(e.target.value, 1) })} />
                    </Field>
                  ) : (
                    <Field label="Dias/mês">
                      <input type="number" min={0} className={inputCls}
                        value={s.diasMes}
                        onChange={e => updateServico(i, { diasMes: parseNum(e.target.value) })} />
                    </Field>
                  )}
                  <Field label="Horas/dia">
                    <DecimalInput value={s.horasDia} maxDecimals={2}
                      onChange={n => updateServico(i, { horasDia: n })} />
                  </Field>
                  <Field label="Custo/hora">
                    <DecimalInput value={s.custoHora} prefix="R$" minDecimals={2} maxDecimals={2}
                      onChange={n => updateServico(i, { custoHora: n })} />
                  </Field>
                </div>

                {!matched && (
                  <p className="flex items-center gap-1.5 text-[11px] text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1">
                    <AlertTriangle size={13} /> Modalidade não está na tabela — custo/hora padrão (R$ 35) aplicado. Ajuste manualmente se necessário.
                  </p>
                )}
              </Card>
            );
          })}

          <datalist id="modalidades-list">
            {tabela.map(m => <option key={m.nome} value={m.nome} />)}
          </datalist>

          <Button variant="outline" icon={<Plus size={16} />}
            onClick={() => setServicos(prev => [...prev, novoServico(tabela)])}>
            Adicionar serviço
          </Button>
        </div>

        {/* Coluna de resultado */}
        <div className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            <Card className="space-y-4">
              <h4 className="font-bold text-gray-900">Resultado</h4>

              <div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Markup</span>
                  <div className="flex items-center gap-1">
                    <DecimalInput value={markupPct} maxDecimals={1}
                      onChange={n => setMarkupPct(n)}
                      className="w-16 py-1 text-right font-bold text-[#003366]" />
                    <span className="font-bold text-[#003366]">%</span>
                  </div>
                </div>
                <input type="range" min={10} max={90} step={0.5} value={markupPct}
                  onChange={e => setMarkupPct(parseNum(e.target.value, 65))}
                  className="w-full accent-[#003366]" />
              </div>

              <dl className="space-y-2 text-sm">
                <Row label="Custo bruto (c/ encargos)" value={formatBRL(resultado.custoTotalBruto)} />
                <Row label="Comissão" value={`${formatPct(resultado.comissaoRate * 100, 1)}%`} />
                <Row label="ISS / impostos" value={formatBRL(resultado.iss)} />
                <Row label="Lucro líquido" value={formatBRL(resultado.lucroLiquido)} />
                <Row label="Total de horas/mês" value={`${formatPct(resultado.totalHoras, 2)} h`} />
              </dl>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Valor final mensal</p>
                <p className="text-2xl font-black text-[#003366]">{formatBRL(resultado.valorFinal)}</p>
                <Badge variant={resultado.margemLiquida >= 0.25 ? 'success' : 'warning'} className="mt-1">
                  Margem líquida {formatPct(resultado.margemLiquida * 100, 1)}%
                </Badge>
              </div>

              {onApply && (
                <Button variant="secondary" className="w-full" icon={<Check size={16} />}
                  onClick={() => onApply(resultado.valorFinal, toNegotiationPricing(resultado))}>
                  Usar este valor na negociação
                </Button>
              )}
            </Card>

            {!embedded && (
              <p className="text-[11px] text-gray-400 px-1">
                Dica: ao criar uma negociação para um cliente, você pode calcular o valor por aqui e aplicá-lo direto.
              </p>
            )}
          </div>
        </div>
      </div>
  );
}

// --- Editor da tabela de custos -----------------------------------------
function TabelaEditor({ tabela, onChange, encargoCltPct, onEncargoChange, onClose }: {
  tabela: Modalidade[];
  onChange: (t: Modalidade[]) => void;
  encargoCltPct: number;
  onEncargoChange: (v: number) => void;
  onClose: () => void;
}) {
  const [nome, setNome] = useState('');
  const [custo, setCusto] = useState('');

  return (
    <Card className="space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-gray-900">Tabela de custos-base (R$/hora)</h4>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />}
            onClick={() => onChange(MODALIDADES_DEFAULT)}>Resetar</Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200">
        <div>
          <span className="block text-xs font-bold text-gray-700">Encargos CLT (%)</span>
          <span className="block text-[10px] text-gray-400">Aplicado só a serviços marcados como CLT</span>
        </div>
        <div className="flex items-center gap-1">
          <DecimalInput value={encargoCltPct} maxDecimals={1}
            onChange={n => onEncargoChange(n)} className="w-20 text-right" />
          <span className="text-sm font-bold text-gray-600">%</span>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {tabela.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={cn(inputCls, 'flex-1')} value={m.nome}
              onChange={e => onChange(tabela.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))} />
            <DecimalInput value={m.custoBase} prefix="R$" minDecimals={2} maxDecimals={2} className="w-28"
              onChange={n => onChange(tabela.map((x, idx) => idx === i ? { ...x, custoBase: n } : x))} />
            <button className="text-gray-300 hover:text-red-500" aria-label="Remover"
              onClick={() => onChange(tabela.filter((_, idx) => idx !== i))}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <input className={cn(inputCls, 'flex-1')} placeholder="Nova modalidade" value={nome}
          onChange={e => setNome(e.target.value)} />
        <input type="text" inputMode="decimal" className={cn(inputCls, 'w-24')} placeholder="R$/h" value={custo}
          onChange={e => setCusto(e.target.value)} />
        <Button variant="secondary" size="sm" icon={<Save size={14} />}
          onClick={() => {
            if (!nome.trim()) return;
            onChange([...tabela, { nome: nome.trim(), custoBase: parseNum(custo) }]);
            setNome(''); setCusto('');
          }}>Add</Button>
      </div>
    </Card>
  );
}

// --- Helpers de UI -------------------------------------------------------
const inputCls = "w-full px-3 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-900";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-[11px] font-bold text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

// Formata porcentagem no padrão BR (vírgula). Ex.: 65.5 -> "65,5"
function formatPct(v: number, decimals = 1): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0, maximumFractionDigits: decimals,
  });
}

/**
 * Input numérico em formato pt-BR (vírgula decimal). Mantém um texto local
 * enquanto edita e devolve o número via onChange (parse tolerante a vírgula).
 * Usado para valores em R$ (prefixo "R$", 2 casas) e para horas/markup.
 */
function DecimalInput({
  value, onChange, prefix, minDecimals = 0, maxDecimals = 2, className,
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  minDecimals?: number;
  maxDecimals?: number;
  className?: string;
}) {
  const format = (v: number) =>
    v ? v.toLocaleString('pt-BR', { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals }) : '';

  const [text, setText] = useState(() => format(value));

  // Ressincroniza quando o valor muda por fora (ex.: trocar a modalidade
  // redefine o custo/hora), sem atropelar o que o usuário está digitando.
  useEffect(() => {
    if (parseNum(text) !== value) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        className={cn(inputCls, prefix ? 'pl-9' : '', className)}
        value={text}
        onChange={e => { setText(e.target.value); onChange(parseNum(e.target.value)); }}
        onBlur={() => setText(format(value))}
      />
    </div>
  );
}
