import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Settings, RotateCcw, Save, Calculator, AlertTriangle, Check } from 'lucide-react';
import { Card, Button, Badge, cn } from './UI';
import { Atividade, Modalidade, ResultadoProposta } from '../pricing/pricingTypes';
import { NegotiationPricing } from '../types';
import {
  MODALIDADES_DEFAULT, PRICING_TABLE_KEY, TURNOS,
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
  const [showTabela, setShowTabela] = useState(false);

  const resultado = useMemo(
    () => calcularProposta(servicos, markupPct),
    [servicos, markupPct]
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
                      <option value="CLT">CLT (+82,7% encargos)</option>
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
                    <input type="number" min={0} step="0.5" className={inputCls}
                      value={s.horasDia}
                      onChange={e => updateServico(i, { horasDia: parseNum(e.target.value) })} />
                  </Field>
                  <Field label="Custo/hora (R$)">
                    <input type="number" min={0} className={inputCls}
                      value={s.custoHora}
                      onChange={e => updateServico(i, { custoHora: parseNum(e.target.value) })} />
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
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Markup</span><span className="font-bold text-[#003366]">{resultado.markupPct}%</span>
                </div>
                <input type="range" min={30} max={90} value={markupPct}
                  onChange={e => setMarkupPct(parseNum(e.target.value, 65))}
                  className="w-full accent-[#003366]" />
              </div>

              <dl className="space-y-2 text-sm">
                <Row label="Custo bruto (c/ encargos)" value={formatBRL(resultado.custoTotalBruto)} />
                <Row label="Comissão" value={`${(resultado.comissaoRate * 100).toFixed(0)}%`} />
                <Row label="ISS / impostos" value={formatBRL(resultado.iss)} />
                <Row label="Total de horas/mês" value={`${resultado.totalHoras.toLocaleString('pt-BR')} h`} />
              </dl>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Valor final mensal</p>
                <p className="text-2xl font-black text-[#003366]">{formatBRL(resultado.valorFinal)}</p>
                <Badge variant={resultado.margemLucro >= 0.5 ? 'success' : 'warning'} className="mt-1">
                  Margem {(resultado.margemLucro * 100).toFixed(1)}%
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
function TabelaEditor({ tabela, onChange, onClose }: {
  tabela: Modalidade[];
  onChange: (t: Modalidade[]) => void;
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

      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {tabela.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={cn(inputCls, 'flex-1')} value={m.nome}
              onChange={e => onChange(tabela.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))} />
            <input type="number" className={cn(inputCls, 'w-24')} value={m.custoBase}
              onChange={e => onChange(tabela.map((x, idx) => idx === i ? { ...x, custoBase: parseNum(e.target.value) } : x))} />
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
        <input type="number" className={cn(inputCls, 'w-24')} placeholder="R$/h" value={custo}
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
