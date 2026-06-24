// Biblioteca de modelos de Escopo da Benesse, extraídos dos orçamentos reais
// (Drive). Cada preset preenche Escopo + Responsabilidades da Contratada +
// Vigência no modal de proposta — tudo editável antes de gerar.

export type CategoriaProposta = 'Condomínio' | 'Empresa' | 'Evento';

export interface EscopoPreset {
  id: string;
  label: string;
  categoria: CategoriaProposta;
  escopo: string;
  responsabilidades: string;
  vigencia: string;
}

export const ESCOPO_PRESETS: EscopoPreset[] = [
  {
    id: 'condominio-assessoria',
    label: 'Condomínio — Assessoria Esportiva (recorrente)',
    categoria: 'Condomínio',
    escopo:
`O presente serviço contempla a realização de atividades físicas e de bem-estar voltadas para os moradores do condomínio, com foco na promoção da saúde, lazer, integração social e melhoria da qualidade de vida.

As aulas serão conduzidas por profissionais qualificados em suas respectivas áreas, em espaços previamente definidos dentro do condomínio, tais como salão de festas, academia, quadras ou áreas externas, desde que asseguradas condições adequadas de segurança e conforto.

As atividades serão organizadas em horários previamente acordados entre a administração do condomínio e a contratada, de forma a atender diferentes perfis e faixas etárias dos moradores.`,
    responsabilidades:
`Apresentar e alocar profissionais devidamente qualificados (Educador Físico, Instrutor de Dança, Professor de Futebol, entre outros, com registro no respectivo conselho quando aplicável);
Conduzir as aulas conforme os horários acordados, respeitando a grade de atividades definida;
Adequar as técnicas utilizadas às condições físicas e necessidades dos moradores;
Respeitar normas de conduta, segurança e sigilo do condomínio.`,
    vigencia: 'O presente contrato terá vigência de 12 (doze) meses, podendo ser prorrogado mediante acordo entre as partes.',
  },
  {
    id: 'empresa-laboral',
    label: 'Empresa — Ginástica Laboral (recorrente)',
    categoria: 'Empresa',
    escopo:
`O serviço contempla a realização de atividades de Ginástica Laboral, com foco na promoção da saúde, bem-estar, prevenção de lesões ocupacionais e melhoria da qualidade de vida dos colaboradores.

As atividades serão conduzidas por profissional qualificado, por meio de exercícios específicos voltados ao ambiente corporativo, incluindo alongamentos, mobilidade, relaxamento muscular e ativação corporal.

Cada atendimento terá duração total de 1 (uma) hora, sendo estruturado conforme a dinâmica da empresa, podendo contemplar sessões coletivas, divisão em turmas quando necessário e aplicação de exercícios adaptados às atividades desempenhadas pelos colaboradores.

As atividades poderão ser realizadas nas dependências da contratante, em local previamente definido, promovendo pausas estratégicas durante a jornada de trabalho.`,
    responsabilidades:
`Disponibilizar profissional devidamente qualificado para condução das atividades;
Planejar e conduzir atividades adequadas ao ambiente corporativo;
Realizar as aulas conforme cronograma acordado;
Garantir organização, pontualidade e qualidade na execução das atividades;
Respeitar normas de conduta, segurança e sigilo da empresa contratante.`,
    vigencia: 'O presente contrato terá vigência de ____ (____) meses, a contar da data de início do serviço, podendo ser prorrogado mediante acordo entre as partes.',
  },
  {
    id: 'empresa-riscos-psicossociais',
    label: 'Empresa — Campanha de Riscos Psicossociais',
    categoria: 'Empresa',
    escopo:
`O presente serviço contempla a realização de campanha de incentivo ao preenchimento de pesquisa de riscos psicossociais, com foco na promoção da saúde mental, bem-estar e melhoria do ambiente organizacional.

A ação será realizada de forma presencial nas unidades da contratante, por meio de abordagem ativa aos colaboradores, com o objetivo de estimular a adesão à pesquisa e apoiar a coleta de dados relacionados aos fatores psicossociais no ambiente de trabalho.

A operação será executada conforme cronograma previamente definido, considerando a distribuição dos colaboradores e a logística entre localidades.

O projeto terá duração estimada de até 22 (vinte e dois) dias úteis, com jornada diária de 6 (seis) horas. A capacidade média de abordagem será de aproximadamente 50 a 70 colaboradores por dia, podendo variar conforme a dinâmica de cada unidade.`,
    responsabilidades:
`Disponibilizar profissional qualificado para condução da campanha;
Realizar abordagem e orientação aos colaboradores sobre a importância da participação;
Apoiar o processo de adesão à pesquisa, conforme diretrizes da contratante;
Atuar conforme cronograma acordado, zelando pela organização, pontualidade e qualidade da execução;
Cumprir as normas de conduta, segurança e confidencialidade estabelecidas pela empresa contratante.`,
    vigencia: 'O presente contrato terá vigência correspondente ao período de execução dos serviços, estimado em até 22 (vinte e dois) dias úteis, conforme cronograma estabelecido entre as partes.',
  },
  {
    id: 'empresa-saude-trabalho',
    label: 'Empresa — Coleta de Dados de Saúde no Trabalho',
    categoria: 'Empresa',
    escopo:
`O presente serviço contempla a realização de ação voltada à coleta de dados de saúde ocupacional dos colaboradores, com foco na promoção da saúde, bem-estar e geração de indicadores para apoio à gestão corporativa.

As atividades serão realizadas de forma presencial, por meio de atendimentos individuais, contemplando a coleta dos seguintes dados: aferição de pressão arterial, cálculo de IMC, medição de circunferência abdominal e frequência cardíaca.

A operação será executada nas unidades da contratante, conforme cronograma previamente definido, considerando a distribuição dos colaboradores e a logística entre localidades.

O projeto terá duração estimada de até 22 (vinte e dois) dias úteis, com jornada diária de 6 (seis) horas. A capacidade média de atendimento será de aproximadamente 50 a 70 colaboradores por dia.

Os dados coletados serão posteriormente organizados e disponibilizados aos colaboradores por meio de relatório individual em formato digital (PDF), com envio via e-mail ou WhatsApp.`,
    responsabilidades:
`Disponibilizar profissional devidamente qualificado para a execução das atividades;
Fornecer os recursos necessários para coleta de dados, incluindo tablet para registro das informações;
Realizar os atendimentos conforme cronograma acordado, zelando pela organização, pontualidade e qualidade da execução;
Consolidar as informações coletadas e disponibilizar os relatórios individuais;
Cumprir as normas de conduta, segurança e confidencialidade estabelecidas pela empresa contratante.`,
    vigencia: 'O presente contrato terá vigência correspondente ao período de execução dos serviços, estimado em até 22 (vinte e dois) dias úteis, conforme cronograma estabelecido entre as partes.',
  },
  {
    id: 'evento-quick-massage',
    label: 'Evento — Quick Massage (ação pontual)',
    categoria: 'Evento',
    escopo:
`O presente serviço contempla a realização de sessões de Quick Massage em ação pontual, voltada aos colaboradores/clientes, com foco na promoção do bem-estar, experiência e valorização do público atendido.

As sessões terão duração de 10 (dez) minutos cada, com atendimento direcionado aos principais pontos de tensão muscular — como costas, ombros, pescoço e braços — utilizando cadeira ergonômica específica para a prática.

A ação será realizada em horário comercial, nas dependências da contratante, garantindo condições adequadas de conforto, organização e segurança para a realização dos atendimentos.`,
    responsabilidades:
`Disponibilizar profissional devidamente qualificado, com formação nas técnicas de Quick Massage;
Fornecer todo o material necessário, incluindo cadeira específica de quick massage, produtos higienizados e materiais descartáveis;
Realizar os atendimentos conforme cronograma acordado, zelando pela pontualidade, segurança e conforto;
Respeitar normas de conduta, segurança e sigilo da empresa contratante.`,
    vigencia: 'O presente contrato terá vigência de 1 (um) dia, correspondente à data da execução do serviço.',
  },
  {
    id: 'evento-yoga',
    label: 'Evento — Aula de Yoga (ação pontual)',
    categoria: 'Evento',
    escopo:
`O presente serviço contempla a realização de uma aula de Yoga em formato de ação pontual, voltada à promoção da saúde, bem-estar e qualidade de vida dos participantes.

As atividades serão conduzidas por profissional qualificado, com planejamento técnico adequado, promovendo equilíbrio físico e mental aos participantes.

As aulas serão realizadas de forma presencial, para grupos de até 30 (trinta) pessoas por unidade, em datas previamente definidas entre as partes. A Yoga terá duração aproximada de até 50 minutos, promovendo equilíbrio físico e mental, respiração consciente e redução do estresse.

Para a realização das atividades, a contratada poderá disponibilizar colchonetes para os participantes, conforme a localidade.`,
    responsabilidades:
`Disponibilizar profissional qualificado para condução das aulas;
Planejar e estruturar a prática de acordo com o perfil dos participantes;
Cumprir pontualmente os horários acordados;
Garantir condução segura, respeitando limites e condições dos participantes.`,
    vigencia: 'O presente contrato terá vigência correspondente às datas de execução dos serviços, caracterizando-se como ação pontual.',
  },
  {
    id: 'evento-laboral-blitz',
    label: 'Evento — Ginástica Laboral + Blitz Postural (pontual)',
    categoria: 'Evento',
    escopo:
`O serviço contempla a realização de uma ação pontual de promoção à saúde no ambiente corporativo, por meio de atividades de Ginástica Laboral combinadas com Blitz Postural individual.

A proposta tem como objetivo promover bem-estar, prevenir desconfortos físicos e conscientizar os colaboradores sobre postura e ergonomia no dia a dia de trabalho.

As atividades serão conduzidas por profissional qualificado e terão duração total de 1 (uma) hora, estruturadas da seguinte forma: aplicação de Ginástica Laboral com duração média de 15 minutos (alongamento, mobilidade, relaxamento muscular e ativação corporal) e realização de Blitz Postural individual, com orientações práticas e personalizadas sobre postura e ajustes no ambiente de trabalho.

As atividades poderão ser realizadas nas dependências da contratante, em local previamente definido, promovendo uma pausa estratégica durante a jornada de trabalho.`,
    responsabilidades:
`Disponibilizar profissional devidamente qualificado para condução das atividades;
Planejar e conduzir atividades adequadas ao ambiente corporativo;
Realizar as aulas conforme cronograma acordado;
Garantir organização, pontualidade e qualidade na execução das atividades;
Respeitar normas de conduta, segurança e sigilo da empresa contratante.`,
    vigencia: 'O presente contrato terá vigência correspondente à data de execução do serviço, caracterizando-se como ação pontual.',
  },
  {
    id: 'em-branco',
    label: 'Em branco (escrever do zero)',
    categoria: 'Empresa',
    escopo: '',
    responsabilidades: '',
    vigencia: '',
  },
];
