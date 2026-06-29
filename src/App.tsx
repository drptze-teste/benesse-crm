import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  CheckSquare, 
  MessageSquare, 
  HelpCircle, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MoreVertical, 
  ChevronRight,
  LogOut,
  Menu,
  X,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  TrendingUp,
  Filter,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Info,
  DollarSign,
  Activity,
  Target,
  User,
  Check,
  Edit,
  Settings,
  Trash2,
  ArrowUp,
  ArrowDown,
  Link,
  FileUp,
  Calculator,
  Sparkles,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrecificadorView } from './components/PrecificadorView';
import { ProposalModal } from './components/ProposalModal';
import { ScheduleModal } from './components/ScheduleModal';
import { detectarRecompras, RecompraAlert } from './recompra';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { format, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { auth, db, signInWithEmailAndPassword, sendPasswordResetEmail } from './firebase';
import { Button, Card, Tooltip, Badge, cn } from './components/UI';
import { APP_USERS, getProfileByEmail } from './constants';
import { 
  Lead, 
  Interaction, 
  Task, 
  UserProfile, 
  BusinessUnit, 
  LeadPriority, 
  LeadTemperature,
  InteractionType,
  TaskStatus,
  LeadDocument,
  WhatsAppMessage,
  Negotiation,
  NegotiationPricing
} from './types';

// --- Constants & Mock Data ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  alert(`Erro no Banco de Dados (${operationType}): ${errInfo.error}`);
}

const BUSINESS_UNITS: BusinessUnit[] = ['Gestão Esportiva', 'Studio de Pilates'];
const B2B_STAGES = ['Novo Contato', 'Qualificação', 'Proposta Enviada', 'Negociação', 'Fechado', 'Perdido'];
const B2C_STAGES = ['Novo Contato', 'Qualificação', 'Proposta Enviada', 'Negociação', 'Fechado', 'Perdido'];
const SOURCES = ['Indicação', 'Contato antigo', 'WhatsApp', 'E-mail', 'LinkedIn', 'Telefone', 'Evento', 'Site', 'Anúncio Rede Social', 'Outro'];
const LOSS_REASONS = ['Preço', 'Concorrente', 'Timing', 'Sem Resposta', 'Não Qualificado'];

const WHATSAPP_FUNNEL_MAPPING: Record<string, BusinessUnit> = {
  "5511999999999": "Gestão Esportiva",
  "5511888888888": "Studio de Pilates",
  "unknown": "Gestão Esportiva" // Default
};

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  info
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  info?: string;
}) => (
  <div className="relative group/sidebar">
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
        active 
          ? "bg-[#003366] text-white shadow-lg shadow-blue-900/20" 
          : "text-gray-500 hover:bg-gray-100 hover:text-[#003366]"
      )}
    >
      <Icon size={20} />
      <span>{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
    </button>
    {info && (
      <div className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity">
        <Tooltip content={info} className={active ? "text-blue-200" : "text-gray-400"} />
      </div>
    )}
  </div>
);

const getDate = (date: any) => {
  if (!date) return new Date();
  if (typeof date.toDate === 'function') return date.toDate();
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date() : d;
};

const safeFormat = (date: any, formatStr: string, options?: any) => {
  try {
    const d = getDate(date);
    return format(d, formatStr, { locale: ptBR, ...options });
  } catch (err) {
    return 'Data inválida';
  }
};

const LeadCard = ({ lead, profile, user, onClick, onAction }: { lead: Lead; profile: UserProfile | null; user: FirebaseUser | null; onClick: () => void; onAction: (type: string) => void; key?: React.Key }) => {
  const updatedAt = getDate(lead.updatedAt);
  const daysInStage = Math.floor((new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const isStagnant = daysInStage >= 2;

  return (
    <Card 
      className={cn(
        "cursor-pointer group hover:border-[#00A896]/30 transition-all p-4",
        isStagnant && "border-l-4 border-l-orange-500"
      )} 
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="overflow-hidden">
          <div className="flex items-center gap-1">
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#003366] transition-colors truncate">{lead.name}</h3>
            <Tooltip content="Clique para ver detalhes e histórico" className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {lead.companyName && <p className="text-[10px] text-gray-500 truncate">{lead.companyName}</p>}
        </div>
        <Badge variant={lead.priority === 'High' ? 'danger' : lead.priority === 'Medium' ? 'warning' : 'neutral'} className="text-[10px] px-1.5 py-0">
          {lead.priority}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">R$ {lead.estimatedValue?.toLocaleString()}</p>
        <span className="text-gray-300">•</span>
        <p className={cn("text-[10px] font-medium", isStagnant ? "text-orange-600" : "text-gray-400")}>
          {daysInStage} dias nesta etapa
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex gap-1">
          <button className="p-1.5 hover:bg-blue-50 rounded-lg text-[#003366] transition-colors" onClick={(e) => { e.stopPropagation(); onAction('call'); }}>
            <Phone size={14} />
          </button>
          <button className="p-1.5 hover:bg-teal-50 rounded-lg text-[#00A896] transition-colors" onClick={(e) => { e.stopPropagation(); onAction('whatsapp'); }}>
            <MessageSquare size={14} />
          </button>
          {(profile?.role === 'admin' || profile?.role === 'manager' || lead.ownerUserId === user?.email) && (
            <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onAction('delete'); }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#003366] transition-colors" />
      </div>
    </Card>
  );
};



interface SortableLeadCardProps {
  lead: Lead;
  profile: UserProfile | null;
  user: FirebaseUser | null;
  onClick: () => void;
  onAction: (type: string) => void;
  disabled?: boolean;
}

const SortableLeadCard: React.FC<SortableLeadCardProps> = ({ lead, profile, user, onClick, onAction, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} profile={profile} user={user} onClick={onClick} onAction={onAction} />
    </div>
  );
};

interface KanbanColumnProps {
  stage: string;
  leads: Lead[];
  profile: UserProfile | null;
  user: FirebaseUser | null;
  onLeadClick: (l: Lead) => void;
  onAction: (l: Lead, type: string) => void;
  disabled?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, leads, profile, user, onLeadClick, onAction, disabled }) => {
  const { setNodeRef } = useDroppable({
    id: stage,
    disabled
  });

  return (
    <div ref={setNodeRef} className="flex flex-col w-72 shrink-0 bg-gray-100/50 rounded-3xl p-4 h-full">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-gray-700">{stage}</h3>
          <Tooltip content={`Leads na etapa de ${stage}`} className="text-gray-300" />
        </div>
        <Badge variant="neutral" className="text-[10px]">{leads.length}</Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableLeadCard 
              key={lead.id} 
              lead={lead} 
              profile={profile}
              user={user}
              onClick={() => onLeadClick(lead)} 
              onAction={(type) => onAction(lead, type)} 
              disabled={disabled}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="h-24 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center">
            <p className="text-[10px] text-gray-400 font-medium">Arraste aqui</p>
          </div>
        )}
      </div>
    </div>
  );
};
const StatCard = ({ title, value, icon: Icon, trend, color = "blue", info }: { title: string; value: string | number; icon: any; trend?: string; color?: "blue" | "teal" | "orange"; info?: string }) => (
  <Card className="flex flex-col gap-2 p-5">
    <div className="flex justify-between items-start">
      <div className={cn(
        "p-2 rounded-xl",
        color === "blue" ? "bg-blue-50 text-[#003366]" : color === "teal" ? "bg-teal-50 text-[#00A896]" : "bg-orange-50 text-orange-600"
      )}>
        <Icon size={20} />
      </div>
      {info && (
        <Tooltip content={info} className="text-gray-300 cursor-help" />
      )}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
      {trend && (
        <p className="text-xs mt-1 text-green-600 font-medium flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </p>
      )}
    </div>
  </Card>
);

const WhatsAppInbox = ({ messages, onProcess, onCreateLead, onIgnore }: { messages: WhatsAppMessage[], onProcess: (msg: WhatsAppMessage) => void, onCreateLead: (msg: WhatsAppMessage) => void, onIgnore: (msg: WhatsAppMessage) => void }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Mensagens WhatsApp</h3>
          <p className="text-sm text-gray-500">Mensagens recebidas via integração direta.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Info size={14} />
          <span>As mensagens são coletadas automaticamente da Meta API</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {messages.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Phone size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nenhuma mensagem recebida ainda.</p>
          </div>
        ) : (
          messages.map(msg => {
            const funnel = WHATSAPP_FUNNEL_MAPPING[msg.businessPhoneNumber] || "Gestão Esportiva";
            return (
              <Card key={msg.id} className={cn("p-4 hover:shadow-md transition-all", msg.status === 'new' ? "border-l-4 border-l-[#FF6321]" : "")}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{msg.name}</h4>
                        <span className="text-xs text-gray-400">{msg.from}</span>
                        {msg.status === 'new' && <Badge variant="warning">Nova</Badge>}
                        <Badge variant="neutral" className="bg-blue-50 text-blue-700 border-blue-100">
                          Funil: {funnel}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded-xl italic">"{msg.text}"</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-[10px] text-gray-400">
                          {safeFormat(msg.timestamp, "dd/MM/yyyy HH:mm")}
                        </p>
                        <span className="text-[10px] text-gray-300">•</span>
                        <p className="text-[10px] text-gray-400">Recebido em: {msg.businessPhoneNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {msg.status === 'new' ? (
                      <>
                        <Button size="sm" icon={<Plus size={16} />} onClick={() => onCreateLead(msg)}>
                          Criar lead
                        </Button>
                        <Button size="sm" variant="outline" icon={<Activity size={16} />}
                          onClick={() => onProcess(msg)}>
                          IA
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onIgnore(msg)}>
                          Ignorar
                        </Button>
                      </>
                    ) : (
                      <Badge variant={msg.status === 'processed' ? 'success' : 'neutral'}>
                        {msg.status === 'processed' ? 'Virou lead' : 'Ignorado'}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- Main App ---

// Data de corte dos gráficos do Dashboard: contam só leads criados a partir
// daqui (base "limpa" do novo CRM). Não apaga nada — apenas filtra a visão.
const CHART_RESET_DATE = new Date('2026-06-25T00:00:00');
function leadCreatedAtDate(l: Lead): Date | null {
  const v = (l as { createdAt?: unknown }).createdAt;
  if (!v) return null;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    const d = (v as { toDate: () => Date }).toDate(); return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v as string); return isNaN(d.getTime()) ? null : d;
}

// Parser tolerante de datas de import (planilha): aceita Date, serial do Excel,
// 'dd/mm/aaaa' (BR), 'dd-mm-aaaa' e ISO. Retorna ISO ou null (nunca lança).
function parseDataImport(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000)); // serial do Excel
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const ano = br[3].length === 2 ? Number('20' + br[3]) : Number(br[3]);
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// "Possível recompra" — formata quando a próxima recompra é esperada.
function recompraQuando(a: RecompraAlert): string {
  const mesAno = new Date(a.expectedDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (a.daysUntil <= 0) return `prevista para ${mesAno}`;
  return `em ~${a.daysUntil} dia${a.daysUntil === 1 ? '' : 's'} · ${mesAno}`;
}

const RecompraRow: React.FC<{ alert: RecompraAlert; onOpen: () => void }> = ({ alert, onOpen }) => {
  const [msgIA, setMsgIA] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);

  // IA (backend): redige a mensagem de abordagem. 503 enquanto a chave não existe.
  const gerarMsg = async () => {
    setLoadingIA(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/ai/recompra-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          customerName: alert.customerName, item: alert.item,
          quando: recompraQuando(alert), basis: alert.basis,
        }),
      });
      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: '' }));
        window.alert(error || 'IA indisponível. Verifique se a chave foi configurada no servidor.');
        return;
      }
      const { texto } = await resp.json();
      if (texto) setMsgIA(texto); else window.alert('A IA não retornou texto.');
    } catch {
      window.alert('Falha ao chamar a IA.');
    } finally {
      setLoadingIA(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-amber-100 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {alert.customerName} <span className="font-normal text-gray-300">·</span> {alert.item}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{recompraQuando(alert)} — {alert.basis}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={alert.confidence === 'alta' ? 'success' : 'neutral'}>{alert.confidence}</Badge>
          <Button variant="ghost" size="sm" icon={<Sparkles size={13} />} loading={loadingIA} onClick={gerarMsg}>IA</Button>
          <Button variant="outline" size="sm" onClick={onOpen}>Ver</Button>
        </div>
      </div>
      {msgIA && (
        <div className="mt-2 space-y-1">
          <textarea className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 h-20"
            aria-label="Mensagem de abordagem gerada pela IA"
            value={msgIA} onChange={e => setMsgIA(e.target.value)} />
          <Button variant="ghost" size="sm" icon={<Copy size={13} />}
            onClick={() => navigator.clipboard?.writeText(msgIA)}>Copiar</Button>
        </div>
      )}
    </div>
  );
};

const RecompraPopup: React.FC<{
  alerts: RecompraAlert[]; onClose: () => void; onOpenCustomer: (id: string) => void;
}> = ({ alerts, onClose, onOpenCustomer }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
        role="dialog" aria-modal="true" aria-label="Possível recompra" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2 text-[#003366]">
            <Clock size={20} className="text-amber-500" /> Possível recompra ({alerts.length})
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-2">Clientes que costumam recontratar nos próximos 60 dias, com base nos contratos fechados. Boa hora para um contato proativo.</p>
          {alerts.map((a, i) => <RecompraRow key={i} alert={a} onOpen={() => onOpenCustomer(a.customerId)} />)}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <Button variant="primary" onClick={onClose}>Entendi</Button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  // Rascunho carregado no precificador ao "usar como base" uma proposta salva.
  const [pricingDraft, setPricingDraft] = useState<NegotiationPricing | null>(null);
  // Cliente pré-selecionado ao abrir o precificador a partir de uma negociação.
  const [pricingPreferredCustomerId, setPricingPreferredCustomerId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  // Erro de leitura (onSnapshot) — mostra banner em vez de falhar em silêncio.
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Workflows
  const [showAddLead, setShowAddLead] = useState(false);
  const [showEditLead, setShowEditLead] = useState<Lead | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLogInteraction, setShowLogInteraction] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [adminSelectedVendor, setAdminSelectedVendor] = useState<string>('all');
  const [preFilledLeadData, setPreFilledLeadData] = useState<any>(null);
  const [funnelConfigs, setFunnelConfigs] = useState<Record<string, string[]>>({
    'Gestão Esportiva': B2B_STAGES,
    'Studio de Pilates': B2C_STAGES
  });
  const [showManageFunnel, setShowManageFunnel] = useState(false);

  // "Possível recompra": alertas de sazonalidade (até 60 dias) a partir dos contratos fechados.
  const recompraAlerts = useMemo(() => detectarRecompras(negotiations, leads, new Date()), [negotiations, leads]);
  const recompraCustomerIds = useMemo(() => new Set(recompraAlerts.map(a => a.customerId)), [recompraAlerts]);
  const [showRecompraPopup, setShowRecompraPopup] = useState(false);
  const recompraShownRef = useRef(false);
  useEffect(() => {
    if (recompraShownRef.current || recompraAlerts.length === 0) return;
    recompraShownRef.current = true;
    if (sessionStorage.getItem('benesse_recompra_popup') === 'dismissed') return;
    setShowRecompraPopup(true);
  }, [recompraAlerts.length]);

  const filteredLeads = leads.filter(l => {
    const name = l.name || '';
    const companyName = l.companyName || '';
    const email = l.email || '';
    const search = searchTerm.toLowerCase();

    const matchesSearch = name.toLowerCase().includes(search) ||
      companyName.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search);
    
    if (profile?.role === 'admin' && adminSelectedVendor !== 'all') {
      return matchesSearch && l.ownerUserId === adminSelectedVendor;
    }
    return matchesSearch;
  });

  // Gráficos do Dashboard: só leads do novo CRM (criados a partir da data de corte).
  const chartLeads = filteredLeads.filter(l => { const d = leadCreatedAtDate(l); return d ? d >= CHART_RESET_DATE : false; });

  const filteredTasks = tasks.filter(t => {
    const title = t.title || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const profileData = getProfileByEmail(u.email);
        const finalProfile = profileData ? { ...profileData, uid: u.uid } : {
          uid: u.uid,
          email: u.email || '',
          displayName: u.email?.split('@')[0] || 'Usuário',
          role: 'vendor' as const,
          businessUnit: 'Gestão Esportiva'
        };
        
        // Sync profile to Firestore for security rules
        const userDocRef = doc(db, 'users', u.uid);
        setDoc(userDocRef, {
          email: finalProfile.email,
          displayName: finalProfile.displayName,
          role: finalProfile.role,
          businessUnit: finalProfile.businessUnit,
          updatedAt: serverTimestamp()
        }, { merge: true })
          .then(() => {
            setProfile(finalProfile);
          })
          .catch(err => {
            console.error("Error syncing profile:", err);
            // Still set profile so app can function, even if rules might fail temporarily
            setProfile(finalProfile);
          });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Funnel Config Sync
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'funnel_configs'), (snap) => {
      const configs: Record<string, string[]> = {
        'Gestão Esportiva': B2B_STAGES,
        'Studio de Pilates': B2C_STAGES
      };
      snap.forEach(doc => {
        configs[doc.id] = doc.data().stages;
      });
      setFunnelConfigs(configs);
    });
    return unsub;
  }, [user]);

  // Real-time Data
  useEffect(() => {
    if (!user || !profile) return;

    // Data Segregation Logic
    let qLeads = query(collection(db, 'leads'));
    let qTasks = query(collection(db, 'tasks'));
    let qInteractions = query(collection(db, 'interactions'));
    let qDocuments = query(collection(db, 'documents'));
    let qNegotiations = query(collection(db, 'negotiations'));

    if (profile.role !== 'admin') {
      // Non-admins only see their business unit
      qLeads = query(collection(db, 'leads'), where('businessUnit', '==', profile.businessUnit));
      
      if (profile.role === 'vendor') {
        // Vendors only see their own leads
        qLeads = query(collection(db, 'leads'), where('ownerUserId', '==', user.email));
        qTasks = query(collection(db, 'tasks'), where('assignedToUserId', '==', user.email));
        qInteractions = query(collection(db, 'interactions'), where('createdByUserId', '==', user.email));
        qDocuments = query(collection(db, 'documents'), where('uploadedByUserId', '==', user.email));
        qNegotiations = query(collection(db, 'negotiations'), where('createdByUserId', '==', user.email));
      } else if (profile.role === 'manager') {
        // Managers see all leads in their business unit
        qTasks = query(collection(db, 'tasks'), where('businessUnit', '==', profile.businessUnit));
      }
    }

    const unsubLeads = onSnapshot(qLeads, (snap) => {
      setLeads(snap.docs.map(d => {
        const data = d.data() as any;
        // Compatibilidade: docs antigos gravaram a origem como `leadSource`;
        // normalizamos para o campo canônico `source` (definido no tipo Lead).
        return { id: d.id, ...data, source: data.source ?? data.leadSource ?? '' } as Lead;
      }));
    }, (error) => {
      console.error("Error fetching leads:", error);
      setDataError('Não foi possível carregar os leads — verifique sua conexão ou permissões.');
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setDataError('Não foi possível carregar as tarefas — verifique sua conexão ou permissões.');
    });

    const unsubInteractions = onSnapshot(query(qInteractions, orderBy('dateTime', 'desc'), limit(50)), (snap) => {
      setInteractions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Interaction)));
    }, (error: any) => {
      console.error("Error fetching interactions:", error);
      // A query de vendor (where createdByUserId + orderBy dateTime) exige índice
      // composto no Firestore. Sem ele a timeline fica vazia silenciosamente — o
      // próprio erro traz a URL para criar o índice com 1 clique.
      if (error?.code === 'failed-precondition') {
        console.warn('[Firestore] Índice composto ausente para "interactions". Crie pelo link no erro acima.');
        setDataError('Histórico de interações indisponível — falta um índice no Firestore (veja o console).');
      } else {
        setDataError('Não foi possível carregar as interações — verifique sua conexão ou permissões.');
      }
    });

    const unsubDocuments = onSnapshot(qDocuments, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeadDocument)));
    }, (error) => {
      console.error("Error fetching documents:", error);
      setDataError('Não foi possível carregar os documentos — verifique sua conexão ou permissões.');
    });

    const unsubNegotiations = onSnapshot(qNegotiations, (snap) => {
      setNegotiations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Negotiation)));
    }, (error) => {
      console.error("Error fetching negotiations:", error);
      setDataError('Não foi possível carregar as negociações — verifique sua conexão ou permissões.');
    });

    let unsubWhatsApp = () => {};
    if (profile.role === 'admin') {
      const qWhatsApp = query(collection(db, 'whatsapp_inbox'), orderBy('timestamp', 'desc'));
      unsubWhatsApp = onSnapshot(qWhatsApp, (snap) => {
        setWhatsappMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as WhatsAppMessage)));
      });
    }

    return () => {
      unsubLeads();
      unsubTasks();
      unsubInteractions();
      unsubDocuments();
      unsubNegotiations();
      unsubWhatsApp();
    };
  }, [user, profile]);

  useEffect(() => {
    console.log(`Current leads in state: ${leads.length}`);
  }, [leads]);

  // Dashboard Stats Calculation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentStages = useMemo(() => {
    if (!profile?.businessUnit) return B2B_STAGES;
    return funnelConfigs[profile.businessUnit] || (profile.businessUnit === 'Gestão Esportiva' ? B2B_STAGES : B2C_STAGES);
  }, [profile?.businessUnit, funnelConfigs]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id;
    let newStage = over.id;

    // If dropped over another lead, get that lead's stage
    const overLead = leads.find(l => l.id === over.id);
    if (overLead) {
      newStage = overLead.currentStage;
    }

    const lead = leads.find(l => l.id === leadId);
    const isValidStage = currentStages.includes(newStage);

    if (lead && isValidStage && lead.currentStage !== newStage) {
      try {
        await updateDoc(doc(db, 'leads', leadId), {
          currentStage: newStage,
          updatedAt: serverTimestamp()
        });
        
        // Log automatic interaction
        if (user) {
          await addDoc(collection(db, 'interactions'), {
            leadId,
            type: 'Note',
            summary: `Estágio alterado automaticamente para: ${newStage}`,
            outcome: 'Neutral',
            dateTime: new Date().toISOString(),
            createdByUserId: user.email
          });
        }
      } catch (err) {
        console.error("Error updating stage:", err);
      }
    }
  };

  const processWhatsAppWithIA = async (msg: WhatsAppMessage) => {
    try {
      const suggestedBusinessUnit = WHATSAPP_FUNNEL_MAPPING[msg.businessPhoneNumber] || "Gestão Esportiva";

      // A chamada ao Gemini agora roda no backend (a chave fica só no servidor).
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/ai/whatsapp-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          text: msg.text,
          name: msg.name,
          from: msg.from,
          businessUnit: suggestedBusinessUnit,
        }),
      });

      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: '' }));
        throw new Error(error || `HTTP ${resp.status}`);
      }

      const extractedData = await resp.json();

      setPreFilledLeadData({
        ...extractedData,
        phone: msg.from,
        whatsappMsgId: msg.id
      });
      setShowAddLead(true);

    } catch (err) {
      console.error("Erro ao processar com IA:", err);
      alert("Não foi possível processar a mensagem com IA no momento.");
    }
  };

  // Criar lead manualmente a partir de uma mensagem (sem IA): pré-preenche o
  // formulário com o que já temos; você revisa e confirma.
  const handleCreateLeadFromWhatsApp = (msg: WhatsAppMessage) => {
    setPreFilledLeadData({
      name: msg.name && msg.name !== 'Desconhecido' ? msg.name : '',
      phone: msg.from,
      businessUnit: WHATSAPP_FUNNEL_MAPPING[msg.businessPhoneNumber] || 'Gestão Esportiva',
      leadSource: 'WhatsApp',
      whatsappMsgId: msg.id,
    });
    setShowAddLead(true);
  };

  // Descartar uma mensagem que não vira lead.
  const handleIgnoreWhatsApp = async (msg: WhatsAppMessage) => {
    try {
      await updateDoc(doc(db, 'whatsapp_inbox', msg.id), { status: 'ignored' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `whatsapp_inbox/${msg.id}`);
    }
  };

  const stats = {
    totalLeads: leads.length,
    pipelineValue: leads.filter(l => l.currentStage !== 'Perdido').reduce((acc, lead) => acc + (Number(lead.estimatedValue) || 0), 0),
    pendingTasks: tasks.filter(t => t.status === 'Pending').length,
    conversionRate: leads.length > 0 
      ? Math.round((leads.filter(l => l.currentStage === 'Fechado' || l.currentStage === 'Matriculado').length / leads.length) * 100) 
      : 0
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={() => {}} />;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <h1 className="font-black text-xl tracking-tighter text-[#003366]">
            BENESSE <span className="text-[#00A896]">CRM</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} info="Visão geral de performance e KPIs" />
          <SidebarItem icon={Users} label="Leads" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} info="Gestão de contatos e funil de vendas" />
          <SidebarItem icon={Target} label="Clientes" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} info="Cadastro de clientes e histórico de negociações" />
          <SidebarItem icon={Calculator} label="Precificador" active={activeTab === 'pricing'} onClick={() => { setPricingDraft(null); setPricingPreferredCustomerId(null); setActiveTab('pricing'); }} info="Calcular valor de propostas (condomínio e laboral)" />
          <SidebarItem icon={CheckSquare} label="Tarefas" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} info="Lembretes e ações pendentes" />
          <SidebarItem icon={MessageSquare} label="Interações" active={activeTab === 'interactions'} onClick={() => setActiveTab('interactions')} info="Histórico completo de contatos" />
          {profile?.role === 'admin' && (
            <>
              <SidebarItem icon={Phone} label="WhatsApp" active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')} info="Mensagens recebidas via WhatsApp Business" />
              <SidebarItem icon={Users} label="Usuários" active={activeTab === 'users'} onClick={() => setActiveTab('users')} info="Controle de acesso e equipe" />
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#003366] font-bold border border-blue-100">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate text-gray-900">{profile?.displayName}</p>
              <p className="text-[10px] font-bold text-[#00A896] uppercase">{profile?.businessUnit}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout} icon={<LogOut size={18} />}>
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-gray-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {activeTab === 'dashboard' && 'Dashboard Executivo'}
              {activeTab === 'leads' && 'Gestão de Leads'}
              {activeTab === 'customers' && 'Cadastro de Clientes'}
              {activeTab === 'pricing' && 'Precificador'}
              {activeTab === 'tasks' && 'Minhas Tarefas'}
              {activeTab === 'interactions' && 'Interações Recentes'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-900 w-48 lg:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {dataError && (
            <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-2 text-sm">
              <span className="flex items-center gap-2"><AlertCircle size={16} /> {dataError}</span>
              <button onClick={() => setDataError(null)} className="text-red-400 hover:text-red-600" aria-label="Dispensar">
                <X size={16} />
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 pb-10"
              >
                {profile?.role === 'admin' && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                      <h3 className="font-bold text-gray-900">Visão Estratégica</h3>
                      <p className="text-xs text-gray-500">Analise o desempenho por vendedor e fontes de prospecção.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter size={16} className="text-gray-400" />
                      <select 
                        className="flex-1 sm:w-64 p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-900 outline-none"
                        value={adminSelectedVendor}
                        onChange={(e) => setAdminSelectedVendor(e.target.value)}
                      >
                        <option value="all">Todos os Vendedores</option>
                        {APP_USERS.filter(u => u.role === 'vendor').map(v => (
                          <option key={v.email} value={v.email}>{v.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Total de Leads" 
                    value={filteredLeads.length}
                    icon={Target}
                    color="blue"
                    info="Número total de leads ativos no funil (filtrado)"
                  />
                  <StatCard 
                    title="Valor em Pipeline" 
                    value={`R$ ${filteredLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0).toLocaleString()}`} 
                    icon={DollarSign}
                    color="teal"
                    info="Soma do valor estimado de todos os leads qualificados (filtrado)"
                  />
                  <StatCard 
                    title="Tarefas Pendentes" 
                    value={tasks.filter(t => t.status === 'Pending' && (adminSelectedVendor === 'all' ? true : t.assignedToUserId === adminSelectedVendor)).length} 
                    icon={Activity} 
                    color="orange"
                    info="Ações que precisam de atenção imediata"
                  />
                  <StatCard 
                    title="Taxa de Conversão" 
                    value={`${leads.length > 0 ? Math.round((leads.filter(l => l.currentStage === 'Fechado' || l.currentStage === 'Matriculado').length / leads.length) * 100) : 0}%`} 
                    icon={TrendingUp}
                    color="blue"
                    info="Percentual de leads que se tornam clientes"
                  />
                </div>

                {recompraAlerts.length > 0 && (
                  <Card className="p-6 border border-amber-200 bg-amber-50/40">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-[#003366]">
                        <Clock size={20} className="text-amber-500" /> Possível recompra
                        <Badge variant="warning">{recompraAlerts.length}</Badge>
                      </h3>
                      <Tooltip content="Clientes que costumam recontratar nesta época (com base nos contratos fechados). Aviso com até 60 dias de antecedência." className="text-gray-300" />
                    </div>
                    <div className="space-y-2">
                      {recompraAlerts.slice(0, 6).map((a, i) => (
                        <RecompraRow key={i} alert={a}
                          onOpen={() => { const l = leads.find(x => x.id === a.customerId); if (l) setSelectedLead(l); }} />
                      ))}
                    </div>
                    {recompraAlerts.length > 6 && (
                      <p className="text-[11px] text-gray-400 mt-2">+{recompraAlerts.length - 6} outros — veja os selos na aba Clientes.</p>
                    )}
                  </Card>
                )}

                {profile?.role === 'admin' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <TrendingUp size={20} className="text-[#003366]" /> Fontes de Prospecção
                        </h3>
                        <Tooltip content="Principais canais de entrada de novos clientes" className="text-gray-300" />
                      </div>
                      <div className="h-64">
                        {chartLeads.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-sm px-4">
                            <p className="font-medium">Sem dados ainda</p>
                            <p className="text-xs mt-1">Os gráficos contam leads cadastrados a partir de 25/06/2026.</p>
                          </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            SOURCES.map(source => ({
                              name: source,
                              value: chartLeads.filter(l => l.source === source).length
                            })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)
                          }>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#003366" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        )}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Users size={20} className="text-[#00A896]" /> Segmentos mais Vendidos
                        </h3>
                        <Tooltip content="Distribuição por tipo de cliente (B2B/B2C)" className="text-gray-300" />
                      </div>
                      <div className="h-64">
                        {chartLeads.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-sm px-4">
                            <p className="font-medium">Sem dados ainda</p>
                            <p className="text-xs mt-1">Os segmentos aparecem conforme novos leads forem cadastrados.</p>
                          </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Condomínio', value: chartLeads.filter(l => l.b2bProfile?.segment === 'Condomínio').length },
                                { name: 'Empresa', value: chartLeads.filter(l => l.b2bProfile?.segment === 'Empresa').length },
                                { name: 'Clube', value: chartLeads.filter(l => l.b2bProfile?.segment === 'Clube').length },
                                { name: 'Público', value: chartLeads.filter(l => l.b2bProfile?.segment === 'Público').length },
                                { name: 'Pilates (B2C)', value: chartLeads.filter(l => l.businessUnit === 'Studio de Pilates').length },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {['#003366', '#00A896', '#F59E0B', '#EF4444', '#8B5CF6'].map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Activity size={20} className="text-[#00A896]" /> Atividade Recente
                      </h3>
                      <div className="flex items-center gap-2">
                        <Tooltip content="Últimas interações registradas no sistema" className="text-gray-300" />
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab('interactions')}>Ver tudo</Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {interactions.filter(i => adminSelectedVendor === 'all' ? true : i.createdByUserId === adminSelectedVendor).length === 0 && (
                        <p className="text-sm text-gray-400 py-6 text-center">Nenhuma interação registrada ainda.</p>
                      )}
                      {interactions
                        .filter(i => adminSelectedVendor === 'all' ? true : i.createdByUserId === adminSelectedVendor)
                        .slice(0, 5).map(interaction => (
                        <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#003366] shrink-0">
                            {interaction.type === 'Call' && <Phone size={14} />}
                            {interaction.type === 'WhatsApp' && <MessageSquare size={14} />}
                            {interaction.type === 'Email' && <Mail size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{leads.find(l => l.id === interaction.leadId)?.name || 'Lead'}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{interaction.summary}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-gray-400">{safeFormat(interaction.dateTime, "dd/MM HH:mm")}</p>
                              <span className="text-[10px] text-gray-300">•</span>
                              <p className="text-[10px] font-bold text-blue-900">{APP_USERS.find(u => u.email === interaction.createdByUserId)?.displayName}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Target size={20} className="text-[#003366]" /> Leads por Estágio
                      </h3>
                      <Tooltip content="Distribuição dos leads nas etapas do funil" className="text-gray-300" />
                    </div>
                    <div className="space-y-4">
                      {currentStages.map(stage => {
                        const count = filteredLeads.filter(l => l.currentStage === stage).length;
                        const percentage = filteredLeads.length > 0 ? (count / filteredLeads.length) * 100 : 0;
                        return (count > 0 || profile?.role !== 'admin') && (
                          <div key={stage} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{stage}</span>
                              <span className="text-gray-500">{count} leads</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className="h-full bg-[#003366]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Minhas Tarefas</h3>
                    <p className="text-sm text-gray-500">Acompanhe seus follow-ups e compromissos.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCompletedTasks(!showCompletedTasks)}>
                      {showCompletedTasks ? 'Ocultar Concluídas' : 'Ver Concluídas'}
                    </Button>
                    <Button icon={<Plus size={20} />} onClick={() => setShowAddTask(true)}>Nova Tarefa</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredTasks.filter(t => showCompletedTasks ? true : t.status === 'Pending').length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                      <CheckSquare size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-500">Tudo em dia! Nenhuma tarefa pendente.</p>
                    </div>
                  ) : (
                    filteredTasks.filter(t => showCompletedTasks ? true : t.status === 'Pending').map(task => (
                      <Card key={task.id} className="p-4 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'tasks', task.id), { status: task.status === 'Completed' ? 'Pending' : 'Completed' });
                              } catch (err) {
                                console.error('Erro ao concluir tarefa:', err);
                                alert('Não foi possível atualizar a tarefa. Verifique suas permissões e tente novamente.');
                              }
                            }}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              task.status === 'Completed' ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-transparent hover:border-green-500"
                            )}
                          >
                            <Check size={14} />
                          </button>
                          <div className="flex-1">
                            <h4 className={cn("font-bold text-gray-900", task.status === 'Completed' && "line-through text-gray-400")}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar size={12} /> {safeFormat(task.dueDate, "dd 'de' MMMM")}
                              </span>
                              <Badge variant={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'neutral'}>
                                {task.priority}
                              </Badge>
                              {task.leadId && (
                                <span className="text-xs text-[#003366] font-medium">
                                  Lead: {leads.find(l => l.id === task.leadId)?.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" icon={<MoreVertical size={16} />} />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div 
                key="leads"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                  <div className="flex items-center gap-2">
                    {profile?.role === 'admin' ? (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <Users size={16} className="text-gray-400" />
                        <select 
                          className="bg-transparent border-none text-sm font-bold text-[#003366] outline-none cursor-pointer"
                          value={adminSelectedVendor}
                          onChange={(e) => setAdminSelectedVendor(e.target.value)}
                        >
                          <option value="all">Todos os Pipelines</option>
                          {APP_USERS.filter(u => u.role === 'vendor').map(v => (
                            <option key={v.email} value={v.email}>Pipeline: {v.displayName}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" icon={<Filter size={16} />}>Filtros</Button>
                    )}
                    <Tooltip content="Arraste os cards para mudar o estágio">
                      <span className="text-xs text-gray-400">
                        Dica: Arraste os cards para mudar o estágio
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    {(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'vendor') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={<Settings size={16} />} 
                        onClick={() => setShowManageFunnel(true)}
                      >
                        Configurar Funil
                      </Button>
                    )}
                    <Button icon={<Plus size={20} />} onClick={() => setShowAddLead(true)}>Novo Lead</Button>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex gap-6 h-full min-w-max">
                      {currentStages.map(stage => (
                        <KanbanColumn 
                          key={stage}
                          stage={stage}
                          leads={filteredLeads.filter(l => {
                            if (stage === currentStages[0]) {
                              return l.currentStage === stage || !currentStages.includes(l.currentStage);
                            }
                            return l.currentStage === stage;
                          })}
                          profile={profile}
                          user={user}
                          onLeadClick={setSelectedLead}
                          onAction={async (l, type) => {
                            if (type === 'delete') {
                              if (confirm('Tem certeza que deseja excluir este lead?')) {
                                try {
                                  await deleteDoc(doc(db, 'leads', l.id));
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.DELETE, `leads/${l.id}`);
                                }
                              }
                              return;
                            }
                            setSelectedLead(l);
                            if (type === 'whatsapp') {
                              const phone = l.phone?.replace(/\D/g, '');
                              window.open(`https://wa.me/55${phone}`, '_blank');
                            } else if (type === 'call') {
                              setShowLogInteraction(l);
                            }
                          }}
                          disabled={false}
                        />
                      ))}
                    </div>
                  </DndContext>
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CustomersView
                  leads={leads}
                  negotiations={negotiations}
                  onCustomerClick={setSelectedLead}
                  user={user}
                  recompraCustomerIds={recompraCustomerIds}
                />
              </motion.div>
            )}

            {activeTab === 'pricing' && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PrecificadorView
                  initialPricing={pricingDraft}
                  preferredCustomerId={pricingPreferredCustomerId}
                  customers={leads.filter(l => l.type === 'customer').map(l => ({ id: l.id, name: l.name }))}
                  suggestTitle={(customerId) => `Orçamento ${negotiations.filter(n => n.customerId === customerId).length + 1}`}
                  onSaveProposal={async (customerId, title, value, pricing) => {
                    const email = auth.currentUser?.email;
                    if (!email) { alert('Sua sessão expirou. Faça login novamente.'); return; }
                    try {
                      await addDoc(collection(db, 'negotiations'), {
                        customerId,
                        title,
                        value: Number(value),
                        date: new Date().toISOString(),
                        status: 'Ongoing',
                        description: '',
                        createdAt: serverTimestamp(),
                        createdByUserId: email,
                        pricing,
                      });
                      alert('Proposta salva no cliente com sucesso.');
                    } catch (err) {
                      handleFirestoreError(err, OperationType.CREATE, 'negotiations');
                      alert('Não foi possível salvar a proposta. Verifique suas permissões.');
                    }
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'interactions' && (
              <motion.div 
                key="interactions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {interactions.map((interaction, idx) => {
                  const lead = leads.find(l => l.id === interaction.leadId);
                  return (
                    <div key={interaction.id} className="relative pl-8 pb-8 last:pb-0">
                      {idx !== interactions.length - 1 && <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200" />}
                      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-white">
                        {interaction.type === 'Call' && <Phone size={12} />}
                        {interaction.type === 'WhatsApp' && <MessageSquare size={12} />}
                        {interaction.type === 'Email' && <Mail size={12} />}
                        {interaction.type === 'Meeting' && <Calendar size={12} />}
                        {interaction.type === 'Note' && <FileText size={12} />}
                      </div>
                      <Card>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">{interaction.type}</span>
                            <h4 className="font-bold text-gray-900">{lead?.name || 'Lead Desconhecido'}</h4>
                          </div>
                          <span className="text-xs text-gray-400">{safeFormat(interaction.dateTime, "dd/MM HH:mm")}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{interaction.summary}</p>
                        <div className="flex justify-between items-center">
                          <Badge variant={interaction.outcome === 'Positive' ? 'success' : interaction.outcome === 'Negative' ? 'danger' : 'neutral'}>
                            {interaction.outcome}
                          </Badge>
                          {interaction.nextStep && (
                            <span className="text-xs text-gray-500 italic">Próximo passo: {interaction.nextStep}</span>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'users' && profile?.role === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <h3 className="text-xl font-bold mb-4">Gerenciamento de Usuários</h3>
                <UserManagementList />
              </motion.div>
            )}

            {activeTab === 'whatsapp' && profile?.role === 'admin' && (
              <motion.div 
                key="whatsapp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <WhatsAppInbox
                  messages={whatsappMessages}
                  onProcess={processWhatsAppWithIA}
                  onCreateLead={handleCreateLeadFromWhatsApp}
                  onIgnore={handleIgnoreWhatsApp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Manage Funnel Modal */}
      <AnimatePresence>
        {showManageFunnel && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowManageFunnel(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <ManageFunnelModal 
                businessUnit={profile?.businessUnit || 'Gestão Esportiva'}
                currentStages={currentStages}
                onSave={async (stages) => {
                  try {
                    await setDoc(doc(db, 'funnel_configs', profile?.businessUnit || 'Gestão Esportiva'), {
                      stages,
                      updatedAt: serverTimestamp(),
                      updatedBy: user?.email
                    });
                    setShowManageFunnel(false);
                  } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, 'funnel_configs');
                  }
                }}
                onCancel={() => setShowManageFunnel(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showRecompraPopup && recompraAlerts.length > 0 && (
        <RecompraPopup
          alerts={recompraAlerts}
          onClose={() => { setShowRecompraPopup(false); sessionStorage.setItem('benesse_recompra_popup', 'dismissed'); }}
          onOpenCustomer={(id) => {
            const l = leads.find(x => x.id === id);
            setShowRecompraPopup(false);
            sessionStorage.setItem('benesse_recompra_popup', 'dismissed');
            if (l) setSelectedLead(l);
          }}
        />
      )}

      {/* Lead Details Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedLead(null)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="relative bg-white shadow-2xl w-full max-w-2xl h-full overflow-hidden flex flex-col"
            >
              <LeadDetailsView 
                lead={selectedLead} 
                interactions={interactions.filter(i => i.leadId === selectedLead.id)}
                documents={documents}
                negotiations={negotiations}
                user={user}
                profile={profile}
                onClose={() => setSelectedLead(null)} 
                onLogInteraction={() => setShowLogInteraction(selectedLead)}
                onEdit={() => {
                  setShowEditLead(selectedLead);
                  setSelectedLead(null);
                }}
                onUseAsBase={(pricing) => {
                  setPricingDraft(pricing);
                  setSelectedLead(null);
                  setActiveTab('pricing');
                }}
                onOpenPricer={(customerId) => {
                  setPricingDraft(null);
                  setPricingPreferredCustomerId(customerId);
                  setSelectedLead(null);
                  setActiveTab('pricing');
                }}
                funnelConfigs={funnelConfigs}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddLead && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddLead(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <AddLeadForm 
                onCancel={() => { setShowAddLead(false); setPreFilledLeadData(null); }} 
                onSuccess={() => { setShowAddLead(false); setPreFilledLeadData(null); }} 
                userId={user?.email || ''} 
                businessUnit={profile?.businessUnit || 'Gestão Esportiva'} 
                initialData={preFilledLeadData}
                funnelConfigs={funnelConfigs}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Interaction Workflow Modal */}
      <AnimatePresence>
        {showLogInteraction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowLogInteraction(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <LogInteractionForm 
                lead={showLogInteraction} 
                onCancel={() => setShowLogInteraction(null)} 
                onSuccess={() => setShowLogInteraction(null)} 
                userId={user.email || ''} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Workflow Modal */}
      <AnimatePresence>
        {showAddTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddTask(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <AddTaskForm 
                onCancel={() => setShowAddTask(false)} 
                onSuccess={() => setShowAddTask(false)} 
                userId={user.email || ''} 
                businessUnit={profile?.businessUnit || 'Gestão Esportiva'}
                leads={leads}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Lead Workflow Modal */}
      <AnimatePresence>
        {showEditLead && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowEditLead(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <EditLeadForm 
                lead={showEditLead}
                onCancel={() => setShowEditLead(null)} 
                onSuccess={() => setShowEditLead(null)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-[80] p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    B
                  </div>
                  <h1 className="font-black text-xl tracking-tighter text-[#003366]">
                    BENESSE <span className="text-[#00A896]">CRM</span>
                  </h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2"><X size={24} /></button>
              </div>
              <nav className="flex-1 space-y-2">
                <SidebarItem icon={Users} label="Meus Leads" active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={Calculator} label="Precificador" active={activeTab === 'pricing'} onClick={() => { setPricingDraft(null); setPricingPreferredCustomerId(null); setActiveTab('pricing'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={CheckSquare} label="Minhas Tarefas" active={activeTab === 'tasks'} onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={MessageSquare} label="Interações" active={activeTab === 'interactions'} onClick={() => { setActiveTab('interactions'); setIsSidebarOpen(false); }} />
              </nav>
              <div className="pt-6 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="w-full justify-start text-red-500" onClick={handleLogout} icon={<LogOut size={18} />}>Sair</Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Workflow Forms ---

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center text-white shadow-xl mx-auto mb-4">
              <TrendingUp size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Benesse CRM Hub</h1>
            <p className="text-sm text-gray-500">Entre com seu e-mail e senha</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-bold text-gray-700">E-mail</label>
                <Tooltip content="Use o e-mail corporativo fornecido pelo administrador" className="text-gray-300" />
              </div>
              <input 
                type="email" 
                required
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#003366] focus:bg-white rounded-xl transition-all outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-bold text-gray-700">Senha</label>
                <Tooltip content="Mínimo de 6 caracteres" className="text-gray-300" />
              </div>
              <input 
                type="password" 
                required
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#003366] focus:bg-white rounded-xl transition-all outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              className="text-sm text-blue-900 hover:underline"
              onClick={async () => {
                if (!email) {
                  alert('Por favor, insira seu e-mail para recuperar a senha.');
                  return;
                }
                try {
                  await sendPasswordResetEmail(auth, email);
                  alert('E-mail de recuperação enviado!');
                } catch (err) {
                  alert('Erro ao enviar e-mail de recuperação.');
                }
              }}
            >
              Esqueceu sua senha?
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function UserManagementList() {
  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`E-mail de redefinição de senha enviado para ${email}`);
    } catch (err) {
      alert('Erro ao enviar e-mail de redefinição.');
    }
  };

  return (
    <div className="space-y-4">
      {APP_USERS.map(u => (
        <Card key={u.email} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
              {u.displayName?.[0] || 'U'}
            </div>
            <div>
              <p className="font-bold">{u.displayName}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={u.role === 'admin' ? 'danger' : 'teal'}>{u.role}</Badge>
            <Button variant="outline" size="sm" onClick={() => handleResetPassword(u.email)}>
              Resetar Senha
            </Button>
          </div>
        </Card>
      ))}
      
      <div className="mt-8 p-6 bg-blue-50 rounded-2xl">
        <h4 className="font-bold text-blue-900 mb-2">Adicionar Novo Usuário</h4>
        <p className="text-xs text-blue-800 mb-4">
          Como o sistema é simplificado, para adicionar novos usuários você deve primeiro criá-los no Console do Firebase e depois adicioná-los à lista de constantes no código.
        </p>
        <div className="flex gap-2">
          <input 
            type="email" 
            id="manual-reset-email"
            placeholder="E-mail para reset manual" 
            className="flex-1 p-2 rounded-lg border border-blue-200 text-sm"
          />
          <Button size="sm" onClick={() => {
            const email = (document.getElementById('manual-reset-email') as HTMLInputElement).value;
            if (email) handleResetPassword(email);
          }}>
            Enviar Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function ManageFunnelModal({ businessUnit, currentStages, onSave, onCancel }: { businessUnit: string; currentStages: string[]; onSave: (stages: string[]) => void; onCancel: () => void }) {
  const [stages, setStages] = useState<string[]>(currentStages);
  const [newStage, setNewStage] = useState('');

  const handleAdd = () => {
    if (newStage && !stages.includes(newStage)) {
      setStages([...stages, newStage]);
      setNewStage('');
    }
  };

  const handleRemove = (stage: string) => {
    setStages(stages.filter(s => s !== stage));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newStages.length) {
      [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
      setStages(newStages);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl">Configurar Funil: {businessUnit}</h3>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            placeholder="Nova etapa..."
            className="flex-1 p-2 rounded-xl border border-gray-200 text-sm"
          />
          <Button onClick={handleAdd} size="sm" icon={<Plus size={16} />}>Adicionar</Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
          {stages.map((stage, idx) => (
            <div key={stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-sm font-medium text-gray-700">{stage}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => handleMove(idx, 'down')} disabled={idx === stages.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => handleRemove(stage)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-2"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={() => onSave(stages)}>Salvar Funil</Button>
      </div>
    </div>
  );
}

function AddLeadForm({ onCancel, onSuccess, userId, businessUnit, initialData, funnelConfigs }: { onCancel: () => void; onSuccess: () => void; userId: string; businessUnit: BusinessUnit; initialData?: any; funnelConfigs: Record<string, string[]> }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    companyName: initialData?.companyName || '',
    leadSource: initialData?.leadSource || 'Indicação',
    priority: (initialData?.priority as LeadPriority) || 'Medium',
    temperature: (initialData?.temperature as LeadTemperature) || 'Warm',
    estimatedValue: initialData?.estimatedValue || 0,
    businessUnit: (initialData?.businessUnit as BusinessUnit) || businessUnit,
    // B2B Specific
    segment: '',
    contactRole: '',
    bidRelated: false,
    // B2C Specific
    ageRange: '',
    wellnessGoal: '',
    painPoint: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const leadData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        companyName: formData.companyName,
        source: formData.leadSource,
        priority: formData.priority,
        temperature: formData.temperature,
        estimatedValue: Number(formData.estimatedValue),
        businessUnit: formData.businessUnit,
        ownerUserId: userId,
        currentStage: funnelConfigs[formData.businessUnit]?.[0] || B2B_STAGES[0],
        type: 'lead',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastInteractionDate: new Date().toISOString()
      };

      if (formData.businessUnit === 'Gestão Esportiva') {
        leadData.b2bProfile = {
          segment: formData.segment,
          contactRole: formData.contactRole,
          bidRelated: formData.bidRelated,
          estimatedContractValue: Number(formData.estimatedValue)
        };
      } else {
        leadData.b2cProfile = {
          ageRange: formData.ageRange,
          wellnessGoal: formData.wellnessGoal,
          painPoint: formData.painPoint
        };
      }

      await addDoc(collection(db, 'leads'), leadData);

      if (initialData?.whatsappMsgId) {
        await updateDoc(doc(db, 'whatsapp_inbox', initialData.whatsappMsgId), {
          status: 'processed'
        });
      }

      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-full overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6321] rounded-2xl flex items-center justify-center shadow-sm shadow-[#FF6321]/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl">Novo Lead</h3>
            <p className="text-xs text-[#00A896] font-bold uppercase tracking-wider">{formData.businessUnit}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Preencha todos os campos obrigatórios para salvar o lead." className="w-4 h-4 text-gray-400 cursor-help" />
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pr-4 space-y-6 custom-scrollbar min-h-0">
        <section className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unidade de Negócio</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Selecione a Unidade</label>
              <select 
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold text-[#003366]"
                value={formData.businessUnit}
                onChange={e => setFormData({...formData, businessUnit: e.target.value as BusinessUnit})}
              >
                {BUSINESS_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informações Básicas</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1">
                Nome Completo / Razão Social
                <Tooltip content="Nome do lead ou da empresa contratante" className="text-gray-400" />
              </label>
              <input 
                type="text" required
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1">
                Telefone / WhatsApp
                <Tooltip content="Número para contato direto via WhatsApp" className="text-gray-400" />
              </label>
              <input 
                type="tel"
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1">
                E-mail
                <Tooltip content="E-mail principal para envio de propostas" className="text-gray-400" />
              </label>
              <input 
                type="email"
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
        </section>

        {formData.businessUnit === 'Gestão Esportiva' ? (
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Perfil B2B (Gestão Esportiva)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Empresa / Instituição</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1">
                  Segmento
                  <Tooltip content="Tipo de instituição para direcionamento da proposta" className="text-gray-400" />
                </label>
                <select 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.segment}
                  onChange={e => setFormData({...formData, segment: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Condomínio">Condomínio</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Clube">Clube</option>
                  <option value="Público">Público / Licitação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo do Contato</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.contactRole}
                  onChange={e => setFormData({...formData, contactRole: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="bidRelated"
                  checked={formData.bidRelated}
                  onChange={e => setFormData({...formData, bidRelated: e.target.checked})}
                />
                <label htmlFor="bidRelated" className="text-sm font-medium text-gray-700">Relacionado a Licitação / Edital?</label>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Perfil B2C (Studio de Pilates)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Faixa Etária</label>
                <select 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.ageRange}
                  onChange={e => setFormData({...formData, ageRange: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Kids">Kids</option>
                  <option value="Adulto">Adulto</option>
                  <option value="Sênior">Sênior</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Objetivo</label>
                <input 
                  type="text"
                  placeholder="Ex: Reabilitação, Flexibilidade"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.wellnessGoal}
                  onChange={e => setFormData({...formData, wellnessGoal: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Dores / Patologias</label>
                <textarea 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm h-20"
                  value={formData.painPoint}
                  onChange={e => setFormData({...formData, painPoint: e.target.value})}
                />
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Qualificação Comercial</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1">
                Valor Estimado (R$)
                <Tooltip content="Valor potencial do contrato ou mensalidade" className="text-gray-400" />
              </label>
              <input 
                type="number"
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.estimatedValue}
                onChange={e => setFormData({...formData, estimatedValue: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Origem do Lead</label>
              <select 
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.leadSource}
                onChange={e => setFormData({...formData, leadSource: e.target.value})}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Prioridade</label>
              <select 
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as LeadPriority})}
              >
                <option value="Low">Baixa</option>
                <option value="Medium">Média</option>
                <option value="High">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Temperatura</label>
              <select 
                className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                value={formData.temperature}
                onChange={e => setFormData({...formData, temperature: e.target.value as LeadTemperature})}
              >
                <option value="Cold">Frio</option>
                <option value="Warm">Morno</option>
                <option value="Hot">Quente</option>
              </select>
            </div>
          </div>
        </section>
      </form>

      <div className="p-6 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Lead'}
        </Button>
      </div>
    </div>
  );
}

function LeadDetailsView({ lead, interactions, documents, negotiations, user, profile, onClose, onLogInteraction, onEdit, onUseAsBase, onOpenPricer, funnelConfigs }: { lead: Lead; interactions: Interaction[]; documents: LeadDocument[]; negotiations: Negotiation[]; user: FirebaseUser | null; profile: UserProfile | null; onClose: () => void; onLogInteraction: () => void; onEdit: () => void; onUseAsBase: (pricing: NegotiationPricing) => void; onOpenPricer: (customerId: string) => void; funnelConfigs: Record<string, string[]> }) {
  const [activeTab, setActiveTab] = useState(lead.type === 'customer' ? 'negotiations' : 'history');
  const [showAddNegotiation, setShowAddNegotiation] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  // Orçamento (negociação precificada) escolhido como base da proposta; null = usar o mais recente.
  const [proposalNeg, setProposalNeg] = useState<Negotiation | null>(null);
  const [editProposal, setEditProposal] = useState<{ docId: string; data: any } | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showLossForm, setShowLossForm] = useState(false);
  // Após enviar uma proposta, oferece criar tarefa de retorno (cobrar resposta).
  const [followUp, setFollowUp] = useState<{ canal: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkData, setLinkData] = useState({ title: '', url: '' });
  const [lossData, setLossData] = useState({ reason: '', category: LOSS_REASONS[0] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteLead = async () => {
    if (!user) return;
    try {
      // Exclui o lead E seus dados relacionados num batch atômico, evitando
      // órfãos (negociações Won órfãs poluíam a "possível recompra"; refs mortas).
      const batch = writeBatch(db);
      const relacionados: [string, string][] = [
        ['interactions', 'leadId'], ['tasks', 'leadId'],
        ['documents', 'leadId'], ['negotiations', 'customerId'],
      ];
      for (const [col, campo] of relacionados) {
        const snap = await getDocs(query(collection(db, col), where(campo, '==', lead.id)));
        snap.forEach(d => batch.delete(d.ref));
      }
      batch.delete(doc(db, 'leads', lead.id));
      await batch.commit();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${lead.id}`);
      alert('Não foi possível excluir o cliente e seus dados relacionados. Verifique suas permissões.');
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData.title || !linkData.url || !user) return;

    try {
      await addDoc(collection(db, 'documents'), {
        leadId: lead.id,
        title: linkData.title,
        type: 'Drive Link',
        fileUrl: linkData.url.startsWith('http') ? linkData.url : `https://${linkData.url}`,
        uploadedByUserId: user.email,
        uploadedAt: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'interactions'), {
        leadId: lead.id,
        type: 'Note',
        summary: `Link adicionado: ${linkData.title}`,
        outcome: 'Neutral',
        dateTime: new Date().toISOString(),
        createdByUserId: user.email
      });

      setShowAddLink(false);
      setLinkData({ title: '', url: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'documents');
      alert('Não foi possível adicionar o link. Verifique suas permissões e tente novamente.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      await addDoc(collection(db, 'documents'), {
        leadId: lead.id,
        title: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'Contract',
        fileUrl: '#',
        uploadedByUserId: user.email,
        uploadedAt: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'interactions'), {
        leadId: lead.id,
        type: 'Note',
        summary: `Documento anexado: ${file.name}`,
        outcome: 'Neutral',
        dateTime: new Date().toISOString(),
        createdByUserId: user.email
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'documents');
      alert('Não foi possível anexar o documento. Verifique suas permissões e tente novamente.');
    }
  };

  const currentStages = funnelConfigs[lead.businessUnit] || (lead.businessUnit === 'Gestão Esportiva' ? B2B_STAGES : B2C_STAGES);

  // --- Envio da proposta (link público) + registro no histórico ---------
  const propostaUrl = (docId: string) => `${window.location.origin}/proposta/${docId}`;
  const docLabel = (tipo: string) => tipo === 'Schedule' ? 'Quadro de horários' : 'Proposta';
  const logEnvioDoc = async (label: string, canal: string) => {
    const email = auth.currentUser?.email;
    if (!email) return;
    try {
      await addDoc(collection(db, 'interactions'), {
        leadId: lead.id,
        type: 'Proposal',
        summary: `${label} enviado por ${canal}`,
        outcome: 'Neutral',
        dateTime: new Date().toISOString(),
        createdByUserId: email,
      });
    } catch (err) {
      console.error('Erro ao registrar envio:', err);
    }
  };
  const enviarPropostaWhatsApp = (docId: string, tipo = 'Proposal') => {
    const phone = (lead.phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Segue ${docLabel(tipo).toLowerCase()} da Benesse Gestão Esportiva: ${propostaUrl(docId)}`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    logEnvioDoc(docLabel(tipo), 'WhatsApp');
    if (tipo === 'Proposal') setFollowUp({ canal: 'WhatsApp' });
  };
  const enviarPropostaEmail = (docId: string, tipo = 'Proposal') => {
    const subject = encodeURIComponent(`${docLabel(tipo)} — Benesse Gestão Esportiva`);
    const body = encodeURIComponent(`Olá,\n\nSegue ${docLabel(tipo).toLowerCase()}:\n${propostaUrl(docId)}\n\nQualquer dúvida, estamos à disposição.\nBenesse Gestão Esportiva`);
    window.location.href = `mailto:${lead.email || ''}?subject=${subject}&body=${body}`;
    logEnvioDoc(docLabel(tipo), 'E-mail');
    if (tipo === 'Proposal') setFollowUp({ canal: 'E-mail' });
  };
  // Cria uma tarefa de retorno (cobrar resposta da proposta) atribuída ao usuário atual.
  const criarTarefaRetorno = async (dias: number) => {
    const email = auth.currentUser?.email;
    if (!email) { setFollowUp(null); return; }
    const due = format(addDays(new Date(), dias), 'yyyy-MM-dd');
    try {
      await addDoc(collection(db, 'tasks'), {
        leadId: lead.id,
        title: `Cobrar retorno da proposta — ${lead.companyName || lead.name}`,
        dueDate: due,
        reminderDate: due,
        priority: 'Medium',
        status: 'Pending',
        assignedToUserId: email,
        businessUnit: lead.businessUnit,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao criar tarefa de retorno:', err);
      alert('Não foi possível criar a tarefa. Verifique suas permissões.');
    } finally {
      setFollowUp(null);
    }
  };
  // Download em Word (.doc HTML, editável) e PDF (via impressão do navegador).
  const baixarWord = (d: LeadDocument) => {
    if (!d.content) return;
    const blob = new Blob(['﻿' + d.content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(d.title || 'documento').replace(/[\\/:*?"<>|]/g, '-')}.doc`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const baixarPdf = (d: LeadDocument) => {
    if (!d.content) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para baixar o PDF.'); return; }
    w.document.open();
    w.document.write(d.content);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* usuário imprime manualmente */ } }, 500);
  };

  const handleAction = (type: string) => {
    if (type === 'whatsapp') {
      const phone = lead.phone?.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    } else if (type === 'email') {
      window.location.href = `mailto:${lead.email}`;
    }
    onLogInteraction();
  };

  const handleMoveStage = async () => {
    const currentIndex = currentStages.indexOf(lead.currentStage);
    if (currentIndex < currentStages.length - 1) {
      const nextStage = currentStages[currentIndex + 1];
      try {
        await updateDoc(doc(db, 'leads', lead.id), {
          currentStage: nextStage,
          updatedAt: serverTimestamp()
        });
        onClose();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leads/${lead.id}`);
        alert('Não foi possível avançar o estágio. Verifique suas permissões e tente novamente.');
      }
    }
  };

  const handleMarkAsLost = async () => {
    if (!lossData.reason) {
      alert('Por favor, informe o motivo da perda.');
      return;
    }
    try {
      await updateDoc(doc(db, 'leads', lead.id), {
        currentStage: 'Perdido',
        lossReason: lossData.reason,
        lossCategory: lossData.category,
        updatedAt: serverTimestamp()
      });

      // Create a recovery task for 30 days later
      await addDoc(collection(db, 'tasks'), {
        leadId: lead.id,
        title: `Recuperação de Lead: ${lead.name}`,
        dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        priority: 'Low',
        status: 'Pending',
        assignedToUserId: lead.ownerUserId,
        businessUnit: lead.businessUnit
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `leads/${lead.id}`);
      alert('Não foi possível marcar como perdido. Verifique suas permissões e tente novamente.');
    }
  };

  return (
    <div className="flex flex-col max-h-full overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ArrowLeft size={20} /></button>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
            lead.businessUnit === 'Gestão Esportiva' ? "bg-[#003366]" : "bg-[#00A896]"
          )}>
            <User size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl text-gray-900">{lead.name}</h3>
              <Tooltip content="Informações detalhadas do lead e histórico de conversas" className="text-gray-300" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={lead.temperature === 'Hot' ? 'danger' : lead.temperature === 'Warm' ? 'warning' : 'neutral'}>
                {lead.temperature}
              </Badge>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 font-medium">{lead.currentStage}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(profile?.role === 'admin' || profile?.role === 'manager' || lead.ownerUserId === user?.email) && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50" 
              icon={<Trash2 size={16} />} 
              onClick={() => setShowDeleteConfirm(true)}
            >
              Excluir
            </Button>
          )}
          <Button size="sm" variant="outline" icon={<Edit size={16} />} onClick={onEdit}>Editar</Button>
          <Button size="sm" variant="outline" icon={<Phone size={16} />} onClick={() => handleAction('call')}>Ligar</Button>
          <Button size="sm" className="bg-[#00A896] hover:bg-teal-700" icon={<MessageSquare size={16} />} onClick={() => handleAction('whatsapp')}>WhatsApp</Button>
          <Button size="sm" variant="ghost" icon={<Mail size={16} />} onClick={() => handleAction('email')} />
        </div>
      </div>

      <div className="flex border-b border-gray-100 px-6">
        <button 
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-all", activeTab === 'history' ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-400")}
          onClick={() => setActiveTab('history')}
        >
          Histórico
        </button>
        <button 
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-all", activeTab === 'details' ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-400")}
          onClick={() => setActiveTab('details')}
        >
          Dados do Lead
        </button>
        <button 
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-all", activeTab === 'docs' ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-400")}
          onClick={() => setActiveTab('docs')}
        >
          Documentos
        </button>
        {lead.type === 'customer' && (
          <button 
            className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-all", activeTab === 'negotiations' ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-400")}
            onClick={() => setActiveTab('negotiations')}
          >
            Negociações
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <h4 className="text-red-900 font-bold mb-1">Confirmar Exclusão</h4>
            <p className="text-sm text-red-700 mb-4">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDeleteLead}>Sim, Excluir</Button>
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Linha do Tempo</h4>
              <Button size="sm" icon={<Plus size={16} />} onClick={onLogInteraction}>Registrar Contato</Button>
            </div>
            
            <div className="space-y-6">
              {interactions.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">Nenhuma interação registrada ainda.</p>
                </div>
              )}
              {interactions.map((interaction, idx) => (
                <div key={interaction.id} className="relative pl-8 pb-6 last:pb-0">
                  {idx !== interactions.length - 1 && <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200" />}
                  <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                    {interaction.type === 'Call' && <Phone size={12} />}
                    {interaction.type === 'WhatsApp' && <MessageSquare size={12} />}
                    {interaction.type === 'Email' && <Mail size={12} />}
                    {interaction.type === 'Note' && <FileText size={12} />}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#003366] uppercase tracking-widest">{interaction.type}</span>
                      <span className="text-[10px] text-gray-400">{format(new Date(interaction.dateTime), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    <p className="text-sm text-gray-700">{interaction.summary}</p>
                    {interaction.nextStep && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <Badge variant="neutral">Próximo Passo</Badge>
                        <span className="text-xs text-gray-500">{interaction.nextStep}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-8">
            <section className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">E-mail</p>
                <p className="text-sm font-medium">{lead.email || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Telefone</p>
                <p className="text-sm font-medium">{lead.phone || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Origem</p>
                <p className="text-sm font-medium">{lead.source}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Estimado</p>
                <p className="text-sm font-medium">R$ {lead.estimatedValue?.toLocaleString()}</p>
              </div>
            </section>

            <div className="h-px bg-gray-100" />

            {lead.businessUnit === 'Gestão Esportiva' && lead.b2bProfile && (
              <section className="space-y-4">
                <h4 className="font-bold text-[#003366]">Perfil Gestão Esportiva</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Empresa</p>
                    <p className="text-sm font-medium">{lead.companyName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Segmento</p>
                    <p className="text-sm font-medium">{lead.b2bProfile.segment}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cargo</p>
                    <p className="text-sm font-medium">{lead.b2bProfile.contactRole}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Licitação?</p>
                    <Badge variant={lead.b2bProfile.bidRelated ? 'warning' : 'neutral'}>
                      {lead.b2bProfile.bidRelated ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              </section>
            )}

            {lead.businessUnit === 'Studio de Pilates' && lead.b2cProfile && (
              <section className="space-y-4">
                <h4 className="font-bold text-[#00A896]">Perfil Studio de Pilates</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Faixa Etária</p>
                    <p className="text-sm font-medium">{lead.b2cProfile.ageRange}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Objetivo</p>
                    <p className="text-sm font-medium">{lead.b2cProfile.wellnessGoal}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dores / Patologias</p>
                    <p className="text-sm font-medium">{lead.b2cProfile.painPoint}</p>
                  </div>
                </div>
              </section>
            )}

            {lead.currentStage === 'Perdido' && (
              <section className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-widest mb-2">Motivo da Perda</h4>
                <p className="text-sm text-red-800 font-medium">{lead.lossCategory}: {lead.lossReason}</p>
              </section>
            )}

            {lead.type !== 'customer' && (
              <section className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
                <Target className="w-10 h-10 text-[#003366] mb-3" />
                <h4 className="font-bold text-gray-900 mb-1">Converter em Cliente?</h4>
                <p className="text-xs text-gray-500 mb-4">Ao converter, este lead será movido para a base de clientes ativos.</p>
                <Button
                  className="w-full bg-[#003366]"
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'leads', lead.id), { type: 'customer', updatedAt: serverTimestamp() });
                      setActiveTab('negotiations');
                    } catch (err) {
                      handleFirestoreError(err, OperationType.WRITE, `leads/${lead.id}`);
                      alert('Não foi possível converter o lead em cliente. Verifique suas permissões.');
                    }
                  }}
                >
                  Confirmar Conversão
                </Button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900">Arquivos e Propostas</h4>
                <Tooltip content="Anexe propostas, contratos ou links do Google Drive" className="text-gray-400 cursor-help" />
              </div>
              <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  icon={<Link size={16} />}
                  onClick={() => setShowAddLink(!showAddLink)}
                >
                  Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Anexar
                </Button>
                <Button size="sm" icon={<FileText size={16} />} onClick={() => { setProposalNeg(null); setShowProposal(true); }}>
                  Gerar Proposta
                </Button>
                <Button size="sm" variant="secondary" icon={<Calendar size={16} />} onClick={() => setShowSchedule(true)}>
                  Quadro de Horários
                </Button>
              </div>
            </div>

            {showAddLink && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleAddLink}
                className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Título</label>
                    <input 
                      type="text" required
                      placeholder="Ex: Proposta Comercial"
                      className="w-full p-2 bg-white border rounded-lg text-sm"
                      value={linkData.title}
                      onChange={e => setLinkData({...linkData, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL / Link</label>
                    <input 
                      type="text" required
                      placeholder="drive.google.com/..."
                      className="w-full p-2 bg-white border rounded-lg text-sm"
                      value={linkData.url}
                      onChange={e => setLinkData({...linkData, url: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddLink(false)}>Cancelar</Button>
                  <Button size="sm" type="submit">Salvar Link</Button>
                </div>
              </motion.form>
            )}
            
            {documents.filter(d => d.leadId === lead.id).length > 0 ? (
              <div className="space-y-2">
                {documents.filter(d => d.leadId === lead.id).map(doc => (
                  <Card key={doc.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        doc.type === 'Proposal' ? "bg-teal-50 text-teal-600" : doc.type === 'Schedule' ? "bg-indigo-50 text-indigo-600" : doc.type === 'Drive Link' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {doc.type === 'Drive Link' ? <Link size={18} /> : doc.type === 'Schedule' ? <Calendar size={18} /> : <FileText size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{doc.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          {doc.type === 'Proposal' ? 'Proposta' : doc.type === 'Schedule' ? 'Quadro de Horários' : doc.type} • {format(new Date(doc.uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {doc.type === 'Proposal' && doc.data && (
                        <Button variant="ghost" size="sm" className="px-2 text-xs font-bold text-[#003366]"
                          onClick={() => setEditProposal({ docId: doc.id, data: doc.data })}>Editar</Button>
                      )}
                      {(doc.type === 'Proposal' || doc.type === 'Schedule') && (
                        <>
                          <Button variant="ghost" size="sm" className="px-2 text-xs font-bold text-gray-600"
                            onClick={() => baixarWord(doc)}>Word</Button>
                          <Button variant="ghost" size="sm" className="px-2 text-xs font-bold text-gray-600"
                            onClick={() => baixarPdf(doc)}>PDF</Button>
                          <Button variant="ghost" size="sm" className="p-2 text-green-600 hover:bg-green-50"
                            onClick={() => enviarPropostaWhatsApp(doc.id, doc.type)} aria-label="Enviar por WhatsApp">
                            <Phone size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-2 text-blue-600 hover:bg-blue-50"
                            onClick={() => enviarPropostaEmail(doc.id, doc.type)} aria-label="Enviar por e-mail">
                            <Mail size={16} />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="p-2" aria-label="Ver" onClick={() => {
                        if (doc.type === 'Proposal' || doc.type === 'Schedule') {
                          window.open(propostaUrl(doc.id), '_blank');
                        } else if (doc.content) {
                          const blob = new Blob([doc.content], { type: 'text/html' });
                          window.open(URL.createObjectURL(blob), '_blank');
                        } else if (doc.fileUrl && doc.fileUrl !== '#') {
                          window.open(doc.fileUrl, '_blank');
                        }
                      }}>
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">Nenhum documento anexado.</p>
                <p className="text-xs text-gray-400 mt-1">Propostas, links do drive e contratos podem ser salvos aqui.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'negotiations' && (
          <NegotiationHistory
            customerId={lead.id}
            negotiations={negotiations}
            onAddNegotiation={() => setShowAddNegotiation(true)}
            onUseAsBase={onUseAsBase}
            onGenerateProposal={(neg) => { setProposalNeg(neg); setActiveTab('docs'); setShowProposal(true); }}
          />
        )}
      </div>

      {showAddNegotiation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          >
            <AddNegotiationForm
              lead={lead}
              onSuccess={() => setShowAddNegotiation(false)}
              onCancel={() => setShowAddNegotiation(false)}
              onOpenPricer={() => onOpenPricer(lead.id)}
            />
          </motion.div>
        </div>
      )}

      {(showProposal || editProposal) && (() => {
        // Orçamento base: o escolhido no card, ou o mais recente precificado do cliente.
        const baseNeg = proposalNeg ?? negotiations
          .filter(n => n.customerId === lead.id && n.pricing)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
        const pricingLabel = baseNeg?.pricing
          ? `${baseNeg.title} — ${baseNeg.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${format(new Date(baseNeg.date), 'dd/MM/yyyy', { locale: ptBR })}`
          : undefined;
        return (
          <ProposalModal
            lead={lead}
            pricing={baseNeg?.pricing}
            pricingLabel={pricingLabel}
            initialData={editProposal?.data}
            editingDocId={editProposal?.docId}
            onOpenPricer={() => onOpenPricer(lead.id)}
            onClose={() => { setShowProposal(false); setProposalNeg(null); setEditProposal(null); }}
          />
        );
      })()}

      {showSchedule && (
        <ScheduleModal
          lead={lead}
          pricing={negotiations
            .filter(n => n.customerId === lead.id && n.pricing)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.pricing}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {followUp && (
        <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFollowUp(null)}>
          <Card className="w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h4 className="font-bold text-gray-900">Proposta enviada por {followUp.canal} ✓</h4>
              <p className="text-sm text-gray-500 mt-1">Quer criar um lembrete para cobrar o retorno do cliente?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => criarTarefaRetorno(3)}>Em 3 dias</Button>
              <Button variant="secondary" onClick={() => criarTarefaRetorno(7)}>Em 7 dias</Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setFollowUp(null)}>Agora não</Button>
          </Card>
        </div>
      )}

      <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
        {showLossForm ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <select 
                  className="w-full p-2 bg-white border rounded-lg text-sm"
                  value={lossData.category}
                  onChange={e => setLossData({...lossData, category: e.target.value})}
                >
                  {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detalhes do Motivo</label>
                <textarea 
                  className="w-full p-2 bg-white border rounded-lg text-sm h-20"
                  placeholder="Explique por que o lead foi perdido..."
                  value={lossData.reason}
                  onChange={e => setLossData({...lossData, reason: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowLossForm(false)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleMarkAsLost}>Confirmar Perda</Button>
            </div>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 text-red-600 border-red-100 hover:bg-red-50" 
              onClick={() => setShowLossForm(true)}
            >
              Marcar como Perdido
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleMoveStage}
            >
              Mover para Próxima Etapa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LogInteractionForm({ lead, onCancel, onSuccess, userId }: { lead: Lead; onCancel: () => void; onSuccess: () => void; userId: string }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Call' as InteractionType,
    summary: '',
    outcome: 'Neutral',
    nextStep: '',
    createTask: false,
    taskDueDate: format(addDays(new Date(), 1), 'yyyy-MM-dd')
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const interactionData = {
        leadId: lead.id,
        type: formData.type,
        summary: formData.summary,
        outcome: formData.outcome,
        nextStep: formData.nextStep,
        dateTime: new Date().toISOString(),
        createdByUserId: userId
      };

      await addDoc(collection(db, 'interactions'), interactionData);
      
      // Update lead's last interaction date
      await updateDoc(doc(db, 'leads', lead.id), {
        lastInteractionDate: new Date().toISOString()
      });

      // Create task if requested
      if (formData.createTask && formData.nextStep) {
        await addDoc(collection(db, 'tasks'), {
          leadId: lead.id,
          title: `Follow-up: ${formData.nextStep}`,
          dueDate: formData.taskDueDate,
          priority: 'Medium',
          status: 'Pending',
          assignedToUserId: userId,
          businessUnit: lead.businessUnit
        });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar interação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl">Registrar Contato</h3>
          <p className="text-xs text-gray-500">{lead.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Registre os detalhes do contato realizado com o lead" className="text-gray-400" />
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Contato</label>
            <div className="flex gap-2">
              {['Call', 'WhatsApp', 'Email', 'Meeting', 'Note'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, type: type as InteractionType})}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                    formData.type === type 
                      ? "bg-[#003366] text-white border-[#003366]" 
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Resumo da Conversa</label>
            <textarea 
              required
              placeholder="O que foi conversado?"
              className="w-full p-3 bg-gray-50 border rounded-xl text-sm h-32"
              value={formData.summary}
              onChange={e => setFormData({...formData, summary: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Resultado</label>
            <select 
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.outcome}
              onChange={e => setFormData({...formData, outcome: e.target.value})}
            >
              <option value="Positive">Positivo</option>
              <option value="Neutral">Neutro</option>
              <option value="Negative">Negativo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Próximo Passo (Opcional)</label>
            <input 
              type="text"
              placeholder="Ex: Enviar proposta"
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.nextStep}
              onChange={e => setFormData({...formData, nextStep: e.target.value})}
            />
          </div>

          {formData.nextStep && (
            <div className="col-span-2 flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="createTask"
                  checked={formData.createTask}
                  onChange={e => setFormData({...formData, createTask: e.target.checked})}
                />
                <label htmlFor="createTask" className="text-sm font-bold text-blue-900">Criar tarefa de follow-up?</label>
              </div>
              {formData.createTask && (
                <input 
                  type="date"
                  className="p-1 rounded bg-white border border-blue-200 text-xs"
                  value={formData.taskDueDate}
                  onChange={e => setFormData({...formData, taskDueDate: e.target.value})}
                />
              )}
            </div>
          )}
        </div>
      </form>

      <div className="p-6 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Registrando...' : 'Salvar Interação'}
        </Button>
      </div>
    </div>
  );
}

function AddTaskForm({ onCancel, onSuccess, userId, businessUnit, leads }: { onCancel: () => void; onSuccess: () => void; userId: string; businessUnit: BusinessUnit; leads: Lead[] }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    priority: 'Medium' as LeadPriority,
    leadId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        ...formData,
        status: 'Pending',
        assignedToUserId: userId,
        businessUnit
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar tarefa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-xl">Nova Tarefa</h3>
        <div className="flex items-center gap-2">
          <Tooltip content="Crie tarefas de acompanhamento para não perder o timing do lead" className="text-gray-400" />
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Título da Tarefa</label>
          <input 
            type="text" required
            className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Data de Vencimento</label>
            <input 
              type="date" required
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.dueDate}
              onChange={e => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Prioridade</label>
            <select 
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value as LeadPriority})}
            >
              <option value="Low">Baixa</option>
              <option value="Medium">Média</option>
              <option value="High">Alta</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Vincular a Lead (Opcional)</label>
          <select 
            className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
            value={formData.leadId}
            onChange={e => setFormData({...formData, leadId: e.target.value})}
          >
            <option value="">Nenhum</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="pt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Tarefa'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditLeadForm({ lead, onCancel, onSuccess }: { lead: Lead; onCancel: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: lead.name,
    phone: lead.phone || '',
    email: lead.email || '',
    companyName: lead.companyName || '',
    priority: lead.priority,
    temperature: lead.temperature,
    estimatedValue: lead.estimatedValue || 0,
    // B2B
    segment: lead.b2bProfile?.segment || '',
    contactRole: lead.b2bProfile?.contactRole || '',
    bidRelated: lead.b2bProfile?.bidRelated || false,
    // B2C
    ageRange: lead.b2cProfile?.ageRange || '',
    wellnessGoal: lead.b2cProfile?.wellnessGoal || '',
    painPoint: lead.b2cProfile?.painPoint || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        companyName: formData.companyName,
        priority: formData.priority,
        temperature: formData.temperature,
        estimatedValue: Number(formData.estimatedValue),
        updatedAt: serverTimestamp()
      };

      if (lead.businessUnit === 'Gestão Esportiva') {
        updateData.b2bProfile = {
          ...lead.b2bProfile,
          segment: formData.segment,
          contactRole: formData.contactRole,
          bidRelated: formData.bidRelated,
          estimatedContractValue: Number(formData.estimatedValue)
        };
      } else {
        updateData.b2cProfile = {
          ...lead.b2cProfile,
          ageRange: formData.ageRange,
          wellnessGoal: formData.wellnessGoal,
          painPoint: formData.painPoint
        };
      }

      await updateDoc(doc(db, 'leads', lead.id), updateData);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-full overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6321] rounded-2xl flex items-center justify-center shadow-sm shadow-[#FF6321]/20">
            <Edit className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-xl">Editar Lead</h3>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Atualize as informações do lead. Campos com * são obrigatórios." className="w-4 h-4 text-gray-400 cursor-help" />
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pr-4 space-y-6 custom-scrollbar min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome</label>
            <input 
              type="text" required
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
            <input 
              type="tel"
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
            <input 
              type="email"
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        {lead.businessUnit === 'Gestão Esportiva' ? (
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Perfil B2B (Gestão Esportiva)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Empresa / Instituição</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Segmento</label>
                <select 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.segment}
                  onChange={e => setFormData({...formData, segment: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Condomínio">Condomínio</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Clube">Clube</option>
                  <option value="Público">Público / Licitação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo do Contato</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.contactRole}
                  onChange={e => setFormData({...formData, contactRole: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="editBidRelated"
                  checked={formData.bidRelated}
                  onChange={e => setFormData({...formData, bidRelated: e.target.checked})}
                />
                <label htmlFor="editBidRelated" className="text-sm font-medium text-gray-700">Relacionado a Licitação / Edital?</label>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Perfil B2C (Studio de Pilates)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Faixa Etária</label>
                <select 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.ageRange}
                  onChange={e => setFormData({...formData, ageRange: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Kids">Kids</option>
                  <option value="Adulto">Adulto</option>
                  <option value="Sênior">Sênior</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Objetivo</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                  value={formData.wellnessGoal}
                  onChange={e => setFormData({...formData, wellnessGoal: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Dores / Patologias</label>
                <textarea 
                  className="w-full p-2 bg-gray-50 border rounded-lg text-sm h-20"
                  value={formData.painPoint}
                  onChange={e => setFormData({...formData, painPoint: e.target.value})}
                />
              </div>
            </div>
          </section>
        )}

        <div className="pt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
}

const AddNegotiationForm: React.FC<{
  lead: Lead;
  onSuccess: () => void;
  onCancel: () => void;
  onOpenPricer: () => void;
}> = ({ lead, onSuccess, onCancel, onOpenPricer }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'Ongoing' as 'Won' | 'Lost' | 'Ongoing',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // As regras do Firestore exigem createdByUserId == email do usuário; se a
    // sessão expirou, currentUser é nulo e o write é rejeitado em silêncio.
    const email = auth.currentUser?.email;
    if (!email) {
      alert('Sua sessão expirou. Faça login novamente para salvar a negociação.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'negotiations'), {
        customerId: lead.id,
        title: formData.title,
        value: Number(formData.value),
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        description: formData.description,
        createdAt: serverTimestamp(),
        createdByUserId: email,
      });
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'negotiations');
      alert('Erro ao salvar negociação. Verifique suas permissões e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-full overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#003366] rounded-2xl flex items-center justify-center shadow-sm shadow-[#003366]/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-xl">Nova Negociação</h3>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar min-h-0">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Título da Negociação *</label>
            <input 
              type="text" required
              placeholder="Ex: Renovação de Contrato 2024"
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Valor (R$) *</label>
            <input
              type="number" required
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.value}
              onChange={e => setFormData({...formData, value: e.target.value})}
            />
            <button type="button"
              className="mt-2 text-xs font-bold text-[#003366] hover:underline inline-flex items-center gap-1"
              onClick={onOpenPricer}>
              <Calculator size={13} /> Calcular no Precificador
            </button>
            <p className="mt-1 text-[11px] text-gray-400">
              Para um orçamento detalhado, use o Precificador — lá você monta os serviços e salva como proposta deste cliente.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Data *</label>
            <input 
              type="date" required
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status *</label>
            <select 
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
            >
              <option value="Ongoing">Em Andamento</option>
              <option value="Won">Ganha</option>
              <option value="Lost">Perdida</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Resumo / Detalhes</label>
            <textarea 
              className="w-full p-2 bg-gray-50 border rounded-lg text-sm h-24"
              placeholder="Descreva os pontos principais da negociação..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="flex-1 bg-[#003366]" loading={loading}>Salvar Negociação</Button>
        </div>
      </form>
    </div>
  );
};

import * as XLSX from 'xlsx';

const CustomersView: React.FC<{
  leads: Lead[];
  negotiations: Negotiation[];
  onCustomerClick: (lead: Lead) => void;
  user: FirebaseUser | null;
  recompraCustomerIds?: Set<string>;
}> = ({ leads, negotiations, onCustomerClick, user, recompraCustomerIds }) => {
  const customers = leads.filter(l => l.type === 'customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];

          console.log("Importing data:", json);

          if (json.length === 0) {
            alert('A planilha parece estar vazia.');
            setIsImporting(false);
            return;
          }

          // Local cache to avoid creating the same customer multiple times in one batch
          const newlyCreatedCustomers: Record<string, string> = {};

          for (const row of json) {
            // Extremely flexible header mapping (ignores spaces, accents, and case)
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();
            
            const getVal = (searchKeys: string[]) => {
              const normalizedSearchKeys = searchKeys.map(normalize);
              const foundKey = Object.keys(row).find(k => normalizedSearchKeys.includes(normalize(k)));
              return foundKey ? row[foundKey] : undefined;
            };

            const customerName = getVal(['nome', 'cliente', 'name', 'customer', 'nomeoucliente']);
            if (!customerName) {
              console.log("Row skipped: No customer name found", row);
              continue;
            }

            const email = getVal(['email', 'e-mail']);
            const company = getVal(['empresa', 'company', 'companyname']);
            let unit = getVal(['unidade de negocio', 'business unit', 'unidade']) || 'Gestão Esportiva';
            
            // Normalize Unit to match Firestore allowed values
            const normalizedUnit = normalize(String(unit));
            if (normalizedUnit.includes('pilates')) unit = 'Studio de Pilates';
            else unit = 'Gestão Esportiva';

            const negTitle = getVal(['titulonegociacao', 'titulo', 'negociacao', 'servico', 'title', 'titulonegociacao']);
            const negValue = getVal(['valor', 'preço', 'price', 'value']);
            const negDate = getVal(['data', 'date', 'venda']);
            const negStatus = getVal(['status', 'resultado']) || 'Won';
            const negDesc = getVal(['descricao', 'description', 'obs', 'observação']);

            // 1. Find or Create Customer
            let customerId = '';
            
            const searchName = String(customerName).toLowerCase().trim();
            const searchEmail = email ? String(email).toLowerCase().trim() : null;

            const existingCustomer = leads.find(l => 
              l.name.toLowerCase().trim() === searchName || 
              (searchEmail && l.email?.toLowerCase().trim() === searchEmail)
            );

            if (existingCustomer) {
              customerId = existingCustomer.id;
              console.log(`Found existing customer: ${customerName} (ID: ${customerId}, Type: ${existingCustomer.type})`);
              // If it exists but is not a customer, update it to customer
              if (existingCustomer.type !== 'customer') {
                console.log(`Updating existing lead ${customerName} to type 'customer'`);
                await updateDoc(doc(db, 'leads', customerId), {
                  type: 'customer',
                  currentStage: 'Fechado',
                  updatedAt: new Date().toISOString()
                });
              }
            } else if (newlyCreatedCustomers[String(customerName).toLowerCase()]) {
              customerId = newlyCreatedCustomers[String(customerName).toLowerCase()];
              console.log(`Found newly created customer in batch: ${customerName} (ID: ${customerId})`);
            } else {
              // Create new customer
              console.log(`Creating new customer: ${customerName}`);
              const newCustomerRef = await addDoc(collection(db, 'leads'), {
                name: String(customerName),
                companyName: company ? String(company) : '',
                email: email ? String(email) : '',
                businessUnit: unit,
                type: 'customer',
                currentStage: 'Fechado',
                ownerUserId: user.email,
                createdAt: serverTimestamp(),
                updatedAt: new Date().toISOString()
              });
              customerId = newCustomerRef.id;
              newlyCreatedCustomers[String(customerName).toLowerCase()] = customerId;
            }

            // 2. Add Negotiation
            if (negTitle || negValue) {
              await addDoc(collection(db, 'negotiations'), {
                customerId: customerId,
                title: negTitle ? String(negTitle) : 'Negociação Importada',
                value: Number(String(negValue).replace(/[^\d.-]/g, '')) || 0,
                date: parseDataImport(negDate) ?? new Date().toISOString(),
                status: (['Won', 'Lost', 'Ongoing'].includes(String(negStatus))) ? negStatus : 'Won',
                description: negDesc ? String(negDesc) : 'Importado via planilha',
                createdAt: serverTimestamp(),
                createdByUserId: user.email
              });
            }
          }

          alert(`${json.length} registros processados com sucesso!`);
        } catch (innerErr) {
          console.error("Error processing sheet data:", innerErr);
          alert('Erro ao processar os dados da planilha. Verifique se as colunas estão corretas.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error reading file:", err);
      alert('Erro ao ler o arquivo.');
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Base de Clientes ({customers.length})</h3>
          <p className="text-sm text-gray-500">Gerencie sua carteira de clientes ativos e histórico de contratos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv"
            onChange={handleExcelImport}
          />
          <Button 
            variant="outline" 
            icon={<FileUp size={18} />} 
            onClick={() => fileInputRef.current?.click()}
            loading={isImporting}
          >
            Importar Planilha
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const customerNegotiations = negotiations.filter(n => n.customerId === customer.id);
          const totalValue = customerNegotiations.reduce((acc, n) => acc + (n.status === 'Won' ? n.value : 0), 0);
          
          return (
            <Card 
              key={customer.id} 
              className="p-5 hover:shadow-md transition-all cursor-pointer border-gray-100 group"
              onClick={() => onCustomerClick(customer)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                  customer.businessUnit === 'Gestão Esportiva' ? "bg-[#003366]" : "bg-[#00A896]"
                )}>
                  <User size={20} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="neutral">{customer.businessUnit}</Badge>
                  {recompraCustomerIds?.has(customer.id) && (
                    <Badge variant="warning">Possível recompra</Badge>
                  )}
                </div>
              </div>
              
              <h4 className="font-bold text-gray-900 group-hover:text-[#003366] transition-colors truncate">{customer.name}</h4>
              <p className="text-xs text-gray-500 mb-4 truncate">{customer.companyName || 'Pessoa Física'}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Negociações</p>
                  <p className="text-sm font-bold text-gray-700">{customerNegotiations.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">LTV Estimado</p>
                  <p className="text-sm font-bold text-[#00A896]">R$ {totalValue.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Users size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum cliente encontrado.</p>
            <p className="text-sm text-gray-400">Leads marcados como 'Cliente' aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NegotiationHistory: React.FC<{
  customerId: string;
  negotiations: Negotiation[];
  onAddNegotiation: () => void;
  onUseAsBase: (pricing: NegotiationPricing) => void;
  onGenerateProposal: (neg: Negotiation) => void;
}> = ({ customerId, negotiations, onAddNegotiation, onUseAsBase, onGenerateProposal }) => {
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);

  const customerNegotiations = negotiations
    .filter(n => n.customerId === customerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleImport = async () => {
    try {
      setImporting(true);
      const data = JSON.parse(importData);
      if (!Array.isArray(data)) throw new Error('Dados devem ser um array');
      
      const batch = data.map(item => ({
        customerId,
        title: item.title || 'Negociação Importada',
        value: Number(item.value) || 0,
        date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        status: (item.status === 'Won' || item.status === 'Lost' || item.status === 'Ongoing') ? item.status : 'Won',
        description: item.description || '',
        createdAt: serverTimestamp(),
        createdByUserId: auth.currentUser?.email
      }));

      for (const neg of batch) {
        await addDoc(collection(db, 'negotiations'), neg);
      }

      setShowImport(false);
      setImportData('');
      alert('Histórico importado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao importar dados. Verifique o formato JSON.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-gray-900">Histórico de Negociações</h4>
          <Tooltip content="Registro de contratos, renovações e novas vendas" className="text-gray-400 cursor-help" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Link size={16} />} onClick={() => setShowImport(true)}>Importar</Button>
          <Button size="sm" icon={<Plus size={16} />} onClick={onAddNegotiation}>Nova Negociação</Button>
        </div>
      </div>

      {showImport && (
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
          <h5 className="text-xs font-bold text-blue-900 uppercase">Importar Negociações (JSON)</h5>
          <p className="text-[10px] text-blue-700">Cole um array JSON com campos: title, value, date, status, description.</p>
          <textarea 
            className="w-full p-2 bg-white border rounded-lg text-xs h-32 font-mono"
            placeholder='[{"title": "Contrato 2023", "value": 5000, "date": "2023-01-15", "status": "Won"}]'
            value={importData}
            onChange={e => setImportData(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowImport(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleImport} loading={importing}>Processar Importação</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {customerNegotiations.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Nenhuma negociação registrada.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={onAddNegotiation}>Começar agora</Button>
          </div>
        )}
        {customerNegotiations.map(neg => (
          <div key={neg.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-bold text-gray-900">{neg.title}</h5>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {(() => {
                    const c: any = neg.createdAt;
                    const d = c?.toDate ? c.toDate() : (neg.date ? new Date(neg.date) : null);
                    return d
                      ? format(d, "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                      : format(new Date(neg.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                  })()}
                </p>
              </div>
              <Badge variant={neg.status === 'Won' ? 'success' : neg.status === 'Lost' ? 'danger' : 'warning'}>
                {neg.status === 'Won' ? 'Ganha' : neg.status === 'Lost' ? 'Perdida' : 'Em Andamento'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{neg.description}</p>

            {neg.pricing && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge variant="info">Precificado</Badge>
                <Badge variant="neutral">Markup {neg.pricing.markupPct.toLocaleString('pt-BR')}%</Badge>
                <Badge variant={(neg.pricing.margemLiquida ?? neg.pricing.margemLucro) >= 0.25 ? 'success' : 'warning'}>
                  Margem líq. {((neg.pricing.margemLiquida ?? neg.pricing.margemLucro) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </Badge>
                <Badge variant="neutral">{neg.pricing.servicos.length} serviço(s)</Badge>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1 text-[#00A896]">
                <DollarSign size={14} />
                <span className="text-sm font-black">R$ {neg.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                {neg.pricing && (
                  <>
                    <Button variant="ghost" size="sm" icon={<Calculator size={14} />}
                      onClick={() => onUseAsBase(neg.pricing!)}>
                      Usar como base
                    </Button>
                    <Button variant="outline" size="sm" icon={<FileText size={14} />}
                      onClick={() => onGenerateProposal(neg)}>
                      Gerar Proposta
                    </Button>
                  </>
                )}
                {neg.documents && neg.documents.length > 0 && (
                  <div className="flex -space-x-2">
                    {neg.documents.map((doc, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-blue-600">
                        <FileText size={10} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
