import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, Badge, cn } from './UI';
import { Lead, NegotiationPricing } from '../types';
import { buildProposalHtml, PropostaItem } from '../proposal/proposalTemplate';
import { ESCOPO_PRESETS } from '../proposal/escopos';
import { ISS_RATE } from '../pricing/pricingConstants';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const ESCOPO_PADRAO =
  'O serviço contempla a realização das atividades com foco na promoção da saúde, bem-estar e qualidade de vida dos colaboradores. As atividades serão conduzidas por profissional qualificado, com exercícios específicos voltados ao ambiente corporativo. Cada atendimento terá duração conforme a dinâmica da empresa, podendo contemplar sessões coletivas e divisão em turmas quando necessário.';

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm';
const DIAS_GRADE = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type GradeSlot = { label: string; cells: string[] };
const novoGradeSlot = (): GradeSlot => ({ label: '', cells: DIAS_GRADE.map(() => '') });

const novaLinha = (): PropostaItem & { horasDecimal: number } => ({
  item: '', data: format(new Date(), 'dd/MM/yyyy'), profissionais: 1,
  dias: 1, horasDia: '01:00', horasDecimal: 1, valorHora: 0, valorTotal: 0,
});

// Pré-preenche as linhas a partir do cálculo do precificador.
function linhasFromPricing(p: NegotiationPricing): (PropostaItem & { horasDecimal: number })[] {
  const valorHoraSugerido = p.totalHoras > 0 ? Math.round(p.valorFinal / p.totalHoras) : 0;
  const hoje = format(new Date(), 'dd/MM/yyyy');
  return (p.servicos || []).map(s => {
    const dias = s.tipoServico === 'Pontual' ? (s.quantidadeEventos || 1) : s.diasMes;
    return {
      item: s.modalidade, data: hoje, profissionais: 1,
      dias, horasDia: `${s.horasDia}h`, horasDecimal: s.horasDia,
      valorHora: valorHoraSugerido, valorTotal: 0,
    };
  });
}

export function ProposalModal({ lead, onClose, onSaved, pricing }: {
  lead: Lead;
  onClose: () => void;
  onSaved?: () => void;
  pricing?: NegotiationPricing | null;
}) {
  const [contratante, setContratante] = useState({
    nome: lead.companyName || lead.name || '',
    cnpj: lead.cnpj || '',
    endereco: lead.endereco || '',
    cidade: lead.cidade || '',
    uf: lead.uf || '',
    cep: lead.cep || '',
  });
  const [presetId, setPresetId] = useState('');
  const [escopo, setEscopo] = useState(ESCOPO_PADRAO);
  const [responsabilidades, setResponsabilidades] = useState('');
  const [vigencia, setVigencia] = useState(lead.vigencia || 'O presente contrato terá vigência correspondente à data de execução do serviço (ação pontual).');
  const [localidades, setLocalidades] = useState('');
  const [agradecimento, setAgradecimento] = useState('Agradecemos a oportunidade de apresentar esta proposta e reforçamos nosso compromisso com a saúde, o bem-estar e a qualidade de vida das pessoas atendidas. Colocamo-nos à disposição para esclarecer qualquer dúvida e seguir juntos nesta parceria.');

  const aplicarPreset = (id: string) => {
    setPresetId(id);
    const p = ESCOPO_PRESETS.find(x => x.id === id);
    if (p) { setEscopo(p.escopo); setResponsabilidades(p.responsabilidades); if (p.vigencia) setVigencia(p.vigencia); }
  };
  const [itens, setItens] = useState<(PropostaItem & { horasDecimal: number })[]>(
    () => pricing?.servicos?.length ? linhasFromPricing(pricing) : [novaLinha()]);
  const [incluirGrade, setIncluirGrade] = useState(false);
  const [gradeSlots, setGradeSlots] = useState<GradeSlot[]>([novoGradeSlot(), novoGradeSlot()]);
  const [saving, setSaving] = useState(false);

  const setGradeLabel = (i: number, v: string) => setGradeSlots(p => p.map((s, idx) => idx === i ? { ...s, label: v } : s));
  const setGradeCell = (i: number, d: number, v: string) =>
    setGradeSlots(p => p.map((s, idx) => idx === i ? { ...s, cells: s.cells.map((c, di) => di === d ? v : c) } : s));

  // Resumo financeiro puxado do precificador (sem custos/margens internas).
  const resumo = pricing ? (() => {
    const total = pricing.valorFinal || 0;
    const impostos = total * ISS_RATE / (1 + ISS_RATE);
    return { totalHoras: pricing.totalHoras || 0, subtotal: total - impostos, impostos, total };
  })() : undefined;

  const itensCalc: PropostaItem[] = useMemo(() => itens.map(i => ({
    item: i.item, data: i.data, profissionais: i.profissionais, dias: i.dias,
    horasDia: i.horasDia,
    valorHora: i.valorHora,
    valorTotal: i.valorHora * i.dias * i.horasDecimal * i.profissionais,
  })), [itens]);

  const valorTotalGeral = itensCalc.reduce((a, i) => a + i.valorTotal, 0);

  const upd = (idx: number, patch: Partial<PropostaItem & { horasDecimal: number }>) =>
    setItens(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const handleGenerate = async () => {
    const email = auth.currentUser?.email;
    if (!email) { alert('Sua sessão expirou. Faça login novamente.'); return; }
    if (!contratante.nome.trim()) { alert('Informe o nome do contratante.'); return; }
    setSaving(true);
    try {
      const html = buildProposalHtml({
        dataExtenso: 'São Paulo, ' + format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        contratante,
        escopo,
        responsabilidadesContratada: responsabilidades.trim() || undefined,
        agradecimento: agradecimento.trim() || undefined,
        vigencia,
        localidades: localidades.trim() || undefined,
        grade: incluirGrade
          ? { dias: DIAS_GRADE, slots: gradeSlots.filter(s => s.label.trim() || s.cells.some(c => c.trim())) }
          : undefined,
        itens: itensCalc,
        valorTotalGeral,
        resumo,
      });

      // Salva a proposta como documento do lead
      await addDoc(collection(db, 'documents'), {
        leadId: lead.id,
        title: `Proposta — ${contratante.nome}`,
        type: 'Proposal',
        fileUrl: '',
        content: html,
        uploadedByUserId: email,
        uploadedAt: new Date().toISOString(),
      });

      // Guarda os dados do contratante no lead para reutilizar
      await updateDoc(doc(db, 'leads', lead.id), {
        cnpj: contratante.cnpj,
        endereco: contratante.endereco,
        cidade: contratante.cidade,
        uf: contratante.uf,
        cep: contratante.cep,
        vigencia,
        updatedAt: serverTimestamp(),
      }).catch(() => { /* não bloqueia a geração se o update falhar */ });

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Erro ao gerar proposta:', err);
      alert('Não foi possível gerar a proposta. Verifique suas permissões e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2 text-[#003366]">
            <FileText size={20} /> Gerar Proposta
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contratante */}
          <section className="space-y-3">
            <h4 className="font-bold text-sm text-gray-900">Contratante</h4>
            <div className="grid grid-cols-2 gap-2">
              <input className={cn(inputCls, 'col-span-2')} placeholder="Nome / Razão social"
                value={contratante.nome} onChange={e => setContratante({ ...contratante, nome: e.target.value })} />
              <input className={inputCls} placeholder="CNPJ"
                value={contratante.cnpj} onChange={e => setContratante({ ...contratante, cnpj: e.target.value })} />
              <input className={inputCls} placeholder="CEP"
                value={contratante.cep} onChange={e => setContratante({ ...contratante, cep: e.target.value })} />
              <input className={cn(inputCls, 'col-span-2')} placeholder="Endereço"
                value={contratante.endereco} onChange={e => setContratante({ ...contratante, endereco: e.target.value })} />
              <input className={inputCls} placeholder="Cidade"
                value={contratante.cidade} onChange={e => setContratante({ ...contratante, cidade: e.target.value })} />
              <input className={inputCls} placeholder="UF" maxLength={2}
                value={contratante.uf} onChange={e => setContratante({ ...contratante, uf: e.target.value.toUpperCase() })} />
            </div>
          </section>

          {/* Modelo / serviço */}
          <section className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900">Modelo de serviço</h4>
            <select className={inputCls} value={presetId} onChange={e => aplicarPreset(e.target.value)}>
              <option value="">— escolher um modelo pronto —</option>
              {(['Condomínio', 'Empresa', 'Evento'] as const).map(cat => (
                <optgroup key={cat} label={cat}>
                  {ESCOPO_PRESETS.filter(p => p.categoria === cat).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[10px] text-gray-400">Carrega escopo, responsabilidades e vigência do serviço — todos editáveis abaixo.</p>
          </section>

          {/* Escopo */}
          <section className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900">Escopo do serviço</h4>
            <p className="flex items-center gap-1.5 text-[11px] text-yellow-800 bg-yellow-50 rounded-lg px-2 py-1">
              <AlertTriangle size={13} /> Revise o escopo, as responsabilidades e a vigência antes de enviar.
            </p>
            <textarea className={cn(inputCls, 'h-28')} value={escopo} onChange={e => setEscopo(e.target.value)} />
          </section>

          {/* Responsabilidades da Contratada */}
          <section className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900">Responsabilidades da Contratada</h4>
            <textarea className={cn(inputCls, 'h-24')} placeholder="Uma responsabilidade por linha (deixe em branco para usar o texto padrão)"
              value={responsabilidades} onChange={e => setResponsabilidades(e.target.value)} />
          </section>

          {/* Vigência + localidades */}
          <section className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900">Vigência</h4>
            <textarea className={cn(inputCls, 'h-16')} value={vigencia} onChange={e => setVigencia(e.target.value)} />
            <h4 className="font-bold text-sm text-gray-900 pt-1">Localidades de atendimento (opcional)</h4>
            <textarea className={cn(inputCls, 'h-16')} placeholder="Endereços das unidades, se houver mais de uma"
              value={localidades} onChange={e => setLocalidades(e.target.value)} />
            <h4 className="font-bold text-sm text-gray-900 pt-1">Texto de agradecimento (final)</h4>
            <textarea className={cn(inputCls, 'h-20')} value={agradecimento} onChange={e => setAgradecimento(e.target.value)} />
          </section>

          {/* Quadro de horários (opcional, incluído na proposta) */}
          <section className="space-y-2">
            <label className="flex items-center gap-2 font-bold text-sm text-gray-900 cursor-pointer">
              <input type="checkbox" checked={incluirGrade} onChange={e => setIncluirGrade(e.target.checked)} />
              Incluir quadro de horários (aulas) na proposta
            </label>
            {incluirGrade && (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="border-collapse w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 bg-[#003366] text-white text-xs p-1.5 w-24">Horário</th>
                        {DIAS_GRADE.map(d => <th key={d} className="border border-gray-200 bg-[#003366] text-white text-xs p-1.5">{d}</th>)}
                        <th className="w-7"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeSlots.map((s, i) => (
                        <tr key={i}>
                          <td className="border border-gray-200 p-1">
                            <input className={cn(inputCls, 'bg-gray-100 text-center font-semibold px-1 py-1')} placeholder="08:00"
                              value={s.label} onChange={e => setGradeLabel(i, e.target.value)} />
                          </td>
                          {DIAS_GRADE.map((_, d) => (
                            <td key={d} className="border border-gray-200 p-1">
                              <input className={cn(inputCls, 'px-1 py-1')} placeholder="—"
                                value={s.cells[d]} onChange={e => setGradeCell(i, d, e.target.value)} />
                            </td>
                          ))}
                          <td className="text-center">
                            <button className="text-gray-300 hover:text-red-500" aria-label="Remover"
                              onClick={() => setGradeSlots(p => p.filter((_, idx) => idx !== i))} disabled={gradeSlots.length === 1}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setGradeSlots(p => [...p, novoGradeSlot()])}>
                  Adicionar horário
                </Button>
              </div>
            )}
          </section>

          {/* Investimento */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-gray-900">Investimento</h4>
              <Button variant="outline" size="sm" icon={<Plus size={14} />}
                onClick={() => setItens(prev => [...prev, novaLinha()])}>Linha</Button>
            </div>
            {pricing && (
              <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2 py-1">
                Serviços e valor/hora pré-preenchidos pelo precificador (valor sugerido = valor final ÷ horas). Ajuste se quiser.
              </p>
            )}
            <div className="space-y-2">
              {itens.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <input className={cn(inputCls, 'col-span-3 px-2')} placeholder="Item/Unidade"
                    value={l.item} onChange={e => upd(i, { item: e.target.value })} />
                  <input className={cn(inputCls, 'col-span-2 px-2')} placeholder="Data"
                    value={l.data} onChange={e => upd(i, { data: e.target.value })} />
                  <input type="number" min={1} className={cn(inputCls, 'col-span-1 px-1 text-center')} title="Profissionais"
                    value={l.profissionais} onChange={e => upd(i, { profissionais: Number(e.target.value) || 1 })} />
                  <input type="number" min={1} className={cn(inputCls, 'col-span-1 px-1 text-center')} title="Dias"
                    value={l.dias} onChange={e => upd(i, { dias: Number(e.target.value) || 1 })} />
                  <input type="number" min={0} step="0.5" className={cn(inputCls, 'col-span-1 px-1 text-center')} title="Horas/dia"
                    value={l.horasDecimal} onChange={e => upd(i, { horasDecimal: Number(e.target.value) || 0, horasDia: `${e.target.value}h` })} />
                  <input type="number" min={0} className={cn(inputCls, 'col-span-2 px-1 text-right')} placeholder="R$/h" title="Valor hora"
                    value={l.valorHora} onChange={e => upd(i, { valorHora: Number(e.target.value) || 0 })} />
                  <button className="col-span-1 text-gray-300 hover:text-red-500 flex justify-center" aria-label="Remover"
                    onClick={() => setItens(prev => prev.filter((_, idx) => idx !== i))} disabled={itens.length === 1}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            {resumo ? (
              <div className="ml-auto w-full sm:w-72 text-sm border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Total de horas/mês</span><span className="font-semibold">{resumo.totalHoras.toLocaleString('pt-BR')} h</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{resumo.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Impostos (ISS)</span><span className="font-semibold">{resumo.impostos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between pt-1 border-t border-gray-200"><span className="font-bold text-[#003366]">Valor Total</span><span className="font-black text-[#003366]">{resumo.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              </div>
            ) : (
              <div className="text-right text-sm font-bold text-[#003366]">
                Valor Total: {valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
            <p className="text-[10px] text-gray-400">Total por linha = valor/hora × dias × horas × profissionais. O resumo (horas, impostos, total) vem do precificador.</p>
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <Badge variant="warning">Revise antes de enviar</Badge>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" loading={saving} icon={<FileText size={16} />} onClick={handleGenerate}>
              Gerar e salvar em Documentos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
