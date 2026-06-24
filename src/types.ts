export type UserRole = 'admin' | 'manager' | 'vendor';
export type BusinessUnit = 'Gestão Esportiva' | 'Studio de Pilates';
export type LeadType = 'lead' | 'opportunity' | 'customer' | 'inactive' | 'lost' | 'churned';
export type LeadPriority = 'Low' | 'Medium' | 'High';
export type LeadTemperature = 'Cold' | 'Warm' | 'Hot';
export type InteractionType = 'Call' | 'Email' | 'WhatsApp' | 'Meeting' | 'Trial Class' | 'Note' | 'Status Change' | 'Proposal';
export type TaskStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  businessUnit: BusinessUnit;
  active?: boolean;
}

export interface B2BProfile {
  segment: string;
  contactRole: string;
  estimatedContractValue: number;
  estimatedRecurringRevenue: number;
  bidRelated: boolean;
  tenderRef?: string;
  stakeholders?: string;
}

export interface B2CProfile {
  ageRange: string;
  wellnessGoal: string;
  painPoint: string;
  preferredSchedule: string;
  trialClassDate?: string;
  planOfInterest?: string;
}

export interface Lead {
  id: string;
  name: string;
  businessUnit: BusinessUnit;
  ownerUserId: string;
  currentStage: string;
  type: LeadType;
  priority: LeadPriority;
  temperature: LeadTemperature;
  source: string;
  phone?: string;
  email?: string;
  companyName?: string;
  estimatedValue?: number;
  createdAt: string;
  updatedAt: string;
  lastInteractionDate?: string;
  nextActionDate?: string;
  tags?: string[];
  b2bProfile?: B2BProfile;
  b2cProfile?: B2CProfile;
  lossReason?: string;
  lossCategory?: string;
  // Dados do contratante para a proposta/contrato
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  vigencia?: string;
}

export interface Interaction {
  id: string;
  leadId: string;
  type: InteractionType;
  summary: string;
  dateTime: string;
  outcome?: string;
  nextStep?: string;
  createdByUserId: string;
}

export interface Task {
  id: string;
  leadId: string;
  title: string;
  dueDate: string;
  priority: LeadPriority;
  status: TaskStatus;
  assignedToUserId: string;
}

export interface LeadDocument {
  id: string;
  leadId: string;
  title: string;
  type: 'PDF' | 'Drive Link' | 'Contract' | 'Proposal';
  fileUrl: string;
  content?: string;        // HTML da proposta gerada (quando type === 'Proposal')
  versionNote?: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface NegotiationPricingItem {
  modalidade: string;
  turno?: string;
  tipoServico?: 'Recorrente' | 'Pontual';
  diasMes: number;
  horasDia: number;
  custoHora: number;
  regime: 'CLT' | 'PJ';
  quantidadeEventos?: number;
  horasMes: number;
}

export interface NegotiationPricing {
  markupPct: number;
  encargoCltPct?: number;   // encargo CLT usado, para reabrir a proposta igual
  custoTotalBruto: number;
  valorFinal: number;
  margemLucro: number;
  lucroLiquido?: number;
  margemLiquida?: number;
  totalHoras: number;
  servicos: NegotiationPricingItem[];
}

export interface Negotiation {
  id: string;
  customerId: string;
  title: string;
  description: string;
  value: number;
  date: string;
  status: 'Won' | 'Lost' | 'Ongoing';
  documents?: string[];
  createdAt: string;
  createdByUserId: string;
  pricing?: NegotiationPricing; // detalhamento do precificador, quando usado
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  businessPhoneNumber: string;
  name: string;
  text: string;
  timestamp: any;
  status: 'new' | 'processed' | 'ignored';
  raw: any;
}
