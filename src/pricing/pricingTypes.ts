// Tipos do Precificador, portados do app Precificador-Condominio-e-Laboral.
// Núcleo puro (sem React) reaproveitado dentro do CRM.

export interface Modalidade {
  nome: string;
  custoBase: number;
}

export interface Atividade {
  modalidade: string;
  turno: string;
  horario: string;
  diasSemana: string[];
  diasMes: number;
  horasDia: number;
  custoHora: number;
  regime: 'CLT' | 'PJ';
  fromGrade?: boolean;
  // Específico de empresa / evento corporativo
  tipoServico?: 'Recorrente' | 'Pontual';
  quantidadeEventos?: number;
}

export interface Cliente {
  tipo: 'Condomínio' | 'Empresa';
  nomeCondominio: string; // também usado como razão social
  endereco: string;
  sindico: string; // também usado como contato/RH
  unidades: string; // para empresas: nº de colaboradores
  vigencia: string;
  prazoInicio: string;
  obs: string;
  cnpj?: string;
  setor?: string;
}

export interface ResultadoProposta {
  servicosCalculados: (Atividade & { horasMes: number; custoTotal: number; custoComEncargos: number })[];
  custoTotalBruto: number;
  markup: number;
  markupPct: number;
  comissaoRate: number;
  valorSemImpostos: number;
  valorComComissao: number;
  iss: number;
  valorFinal: number;
  margemLucro: number;
  totalHoras: number;
}
