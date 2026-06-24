import React, { useState } from 'react';
import { X, Plus, Trash2, CalendarDays } from 'lucide-react';
import { Button, cn } from './UI';
import { Lead, NegotiationPricing } from '../types';
import { buildScheduleHtml } from '../proposal/scheduleTemplate';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const inputCls = 'w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm';

type Slot = { label: string; cells: string[] };
const novoSlot = (): Slot => ({ label: '', cells: DIAS.map(() => '') });

export function ScheduleModal({ lead, onClose, pricing }: { lead: Lead; onClose: () => void; pricing?: NegotiationPricing | null }) {
  const [titulo, setTitulo] = useState(`Quadro de Horários — ${lead.companyName || lead.name}`);
  const [subtitulo, setSubtitulo] = useState('');
  const [slots, setSlots] = useState<Slot[]>([novoSlot(), novoSlot(), novoSlot()]);
  const [saving, setSaving] = useState(false);

  // Modalidades do orçamento (precificador) usadas como sugestão nas células.
  const modalidades = Array.from(new Set((pricing?.servicos || []).map(s => s.modalidade.trim()).filter(Boolean)));

  const setLabel = (i: number, v: string) => setSlots(p => p.map((s, idx) => idx === i ? { ...s, label: v } : s));
  const setCell = (i: number, d: number, v: string) =>
    setSlots(p => p.map((s, idx) => idx === i ? { ...s, cells: s.cells.map((c, di) => di === d ? v : c) } : s));

  const handleSave = async () => {
    const email = auth.currentUser?.email;
    if (!email) { alert('Sua sessão expirou. Faça login novamente.'); return; }
    const slotsValidos = slots.filter(s => s.label.trim() || s.cells.some(c => c.trim()));
    if (!slotsValidos.length) { alert('Adicione ao menos um horário com aulas.'); return; }
    setSaving(true);
    try {
      const html = buildScheduleHtml({ titulo, subtitulo: subtitulo.trim() || undefined, dias: DIAS, slots: slotsValidos });
      await addDoc(collection(db, 'documents'), {
        leadId: lead.id,
        title: titulo,
        type: 'Schedule',
        fileUrl: '',
        content: html,
        uploadedByUserId: email,
        uploadedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar quadro:', err);
      alert('Não foi possível salvar o quadro. Verifique suas permissões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2 text-[#003366]">
            <CalendarDays size={20} /> Quadro de Horários
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />
            <input className={inputCls} placeholder="Subtítulo (ex.: 4 profissionais · 2026)" value={subtitulo} onChange={e => setSubtitulo(e.target.value)} />
          </div>

          <datalist id="aulas-precificador-quadro">
            {modalidades.map(m => <option key={m} value={m} />)}
          </datalist>
          {modalidades.length > 0 && (
            <p className="text-[11px] text-gray-400">Dica: ao clicar numa célula, aparecem as aulas do orçamento ({modalidades.join(', ')}).</p>
          )}

          <div className="overflow-x-auto">
            <table className="border-collapse w-full min-w-[680px]">
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-[#003366] text-white text-xs p-2 w-28">Horário</th>
                  {DIAS.map(d => <th key={d} className="border border-gray-200 bg-[#003366] text-white text-xs p-2">{d}</th>)}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={i}>
                    <td className="border border-gray-200 p-1">
                      <input className={cn(inputCls, 'bg-gray-100 text-center font-semibold')} placeholder="08:00"
                        value={s.label} onChange={e => setLabel(i, e.target.value)} />
                    </td>
                    {DIAS.map((_, d) => (
                      <td key={d} className="border border-gray-200 p-1">
                        <input className={inputCls} placeholder="—" list="aulas-precificador-quadro"
                          value={s.cells[d]} onChange={e => setCell(i, d, e.target.value)} />
                      </td>
                    ))}
                    <td className="text-center">
                      <button className="text-gray-300 hover:text-red-500" aria-label="Remover horário"
                        onClick={() => setSlots(p => p.filter((_, idx) => idx !== i))} disabled={slots.length === 1}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setSlots(p => [...p, novoSlot()])}>
            Adicionar horário
          </Button>
          <p className="text-[11px] text-gray-400">Preencha a modalidade/aula em cada dia e horário. Deixe vazio onde não houver aula.</p>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} icon={<CalendarDays size={16} />} onClick={handleSave}>
            Gerar e salvar em Documentos
          </Button>
        </div>
      </div>
    </div>
  );
}
