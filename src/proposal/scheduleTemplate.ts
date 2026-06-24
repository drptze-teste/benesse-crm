// Quadro de horários (grade semanal de aulas) — para condomínios e empresas
// com vários profissionais. Função pura: gera um HTML com a marca Benesse.

export interface ScheduleInput {
  titulo: string;       // "Quadro de Horários — Condomínio X"
  subtitulo?: string;   // ex.: "Vigência 2026 · 4 profissionais"
  dias: string[];       // ['Seg','Ter','Qua','Qui','Sex','Sáb']
  slots: { label: string; cells: string[] }[]; // cells alinhadas a `dias`
}

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Renderiza só a TABELA da grade (reaproveitada dentro da proposta).
export function renderScheduleTable(dias: string[], slots: { label: string; cells: string[] }[]): string {
  const head = `<th class="hora">Horário</th>` + dias.map(d => `<th>${esc(d)}</th>`).join('');
  const rows = slots.map(s => `
    <tr>
      <td class="hora">${esc(s.label)}</td>
      ${dias.map((_, i) => {
        const v = (s.cells[i] || '').trim();
        return `<td>${v ? `<span class="aula">${esc(v)}</span>` : ''}</td>`;
      }).join('')}
    </tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildScheduleHtml(input: ScheduleInput): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(input.titulo)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:1000px;margin:0 auto;padding:28px 20px 56px;}
  .brand{color:#003366;font-weight:900;font-size:1.05rem;letter-spacing:.5px;}
  .brand span{color:#FF9900;}
  h1{color:#003366;font-size:1.4rem;margin:6px 0 2px;}
  .sub{color:#6c757d;font-size:.92rem;margin-bottom:18px;}
  table{border-collapse:collapse;width:100%;}
  th,td{border:1px solid #d9d9d9;padding:8px;text-align:center;vertical-align:middle;font-size:.92rem;}
  thead th{background:#003366;color:#fff;}
  th.hora,td.hora{background:#f3f6fa;color:#003366;font-weight:bold;white-space:nowrap;}
  .aula{display:inline-block;background:#FFF3E0;color:#8a5200;border:1px solid #FFD9A8;border-radius:8px;padding:3px 8px;font-weight:600;}
  tbody tr:nth-child(even) td:not(.hora){background:#fafafa;}
  .foot{margin-top:16px;color:#6c757d;font-size:.8rem;}
  .noprint{position:fixed;top:12px;right:12px;background:#003366;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-weight:bold;cursor:pointer;}
  @media print{.noprint{display:none;}}
</style></head><body>
  <button class="noprint" onclick="window.print()">Imprimir / PDF</button>
  <div class="brand">BENESSE <span>GESTÃO ESPORTIVA</span></div>
  <h1>${esc(input.titulo)}</h1>
  ${input.subtitulo ? `<div class="sub">${esc(input.subtitulo)}</div>` : ''}
  ${renderScheduleTable(input.dias, input.slots)}
  <p class="foot">Quadro sujeito a ajustes conforme adesão dos participantes e disponibilidade dos profissionais.</p>
</body></html>`;
}
