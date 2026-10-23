'use strict';
/* Camada didática: guia de cada transação, ajuda F1 dos campos e trilha de missões. */

const GUIA = {
  MENU: {
    oque: 'É a porta de entrada do sistema. Cada item do menu é uma transação, identificada por um código curto como FB50. Quem trabalha com SAP no dia a dia quase não usa o menu: digita o código direto no campo de comando, no alto da tela.',
    passos: [
      'Dê duplo clique numa transação do menu para abrir.',
      'Ou digite o código no campo de comando (ex.: FB03) e tecle Enter.',
      'Dentro de uma transação, para ir para outra, digite /n antes do código (ex.: /nFBL3N). Só /n volta para este menu.',
      'F3 volta uma tela. F1 em qualquer campo explica o campo. F4 abre a lista de valores possíveis.'
    ],
    conferir: [
      'O ciclo da contabilidade financeira (FI): cadastro (FS00, FK01, FD01) → lançamento (FB50, FB60, FB70) → pagamento e recebimento (F-53, F-28) → conferência (FBL3N, FBL1N, FBL5N, FS10N) → relatórios (balancete e F.01) → correção (FB08, FBRA) → fechamento do mês (OB52).',
      'Comece pela aba Missões: ela segue a ordem em que o trabalho acontece no financeiro.'
    ]
  },
  FS00: {
    oque: 'Cadastro central da conta contábil (conta do Razão). Define o nome da conta, se ela é de balanço ou de resultado e como se comporta nos lançamentos.',
    quando: 'Para consultar como uma conta está configurada ou para criar uma conta nova no plano de contas.',
    passos: ['Informe a conta (F4 lista o plano de contas) e clique em Exibir.', 'Navegue pelas abas Tipo/descrição, Dados de controle e Criação/banco/juros.', 'Para alterar, clique em Modificar, ajuste e grave com Ctrl+S. Para uma conta nova, digite um número que não existe e clique em Criar.'],
    conferir: [
      'Na aba Dados de controle, "Conta de reconciliação" diz se a conta é alimentada só pelos fornecedores (K) ou pelos clientes (D). Conta assim não aceita lançamento direto no FB50.',
      'Conta de resultado (receita, custo, despesa) zera no fim do ano e o saldo vai para o patrimônio líquido. Conta de balanço leva o saldo para o ano seguinte.'
    ],
    tabelas: 'SKAT (nome da conta) e SKB1 (dados da conta na empresa). Veja no SE16N.'
  },
  FS10N: {
    oque: 'Mostra o saldo de uma conta do Razão mês a mês: débitos, créditos, saldo do mês e saldo acumulado.',
    quando: 'É a primeira parada para responder "quanto tem nessa conta?" no fim de qualquer mês.',
    passos: ['Informe a conta e o exercício e tecle F8.', 'Dê duplo clique em qualquer valor para ver os lançamentos que formam aquele número (abre o FBL3N já filtrado).', 'No FBL3N, duplo clique num lançamento abre o documento (FB03). F3 volta pelo mesmo caminho.'],
    conferir: [
      'Saldo acumulado do mês = acumulado do mês anterior + débitos − créditos do mês.',
      'Saldo sem sinal = devedor (natural de ativo e despesa). Saldo com sinal de menos no fim, como 1.000,00-, = credor (natural de passivo, patrimônio líquido e receita).'
    ],
    tabelas: 'No SAP S/4HANA os saldos vêm da tabela ACDOCA (Universal Journal). Aqui o simulador soma a BSEG.'
  },
  FBL3N: {
    oque: 'Lista todas as partidas (linhas de lançamento) de uma ou mais contas do Razão.',
    quando: 'Para explicar um saldo: quais lançamentos compõem o número que apareceu no FS10N ou no balancete.',
    passos: ['Informe a conta (ou uma faixa de contas) e, se quiser, um intervalo de datas de lançamento.', 'F8 executa.', 'Na barra da lista: clique no título de uma coluna e depois em Classificar; Filtro procura um texto em qualquer coluna; Σ liga e desliga os totais; Planilha exporta para o Excel.', 'Duplo clique numa linha abre o documento.'],
    conferir: [
      'O total da lista para a conta tem que bater com o saldo acumulado do FS10N no mesmo intervalo.',
      'Crédito aparece com o sinal de menos no fim (1.500,00-). É a convenção do SAP.',
      'Procure textos estranhos para a conta: é assim que se acha lançamento em conta errada.'
    ],
    tabelas: 'BSEG (linhas do documento) e BKPF (cabeçalho).'
  },
  FBL1N: {
    oque: 'Lista faturas, pagamentos e notas de crédito dos fornecedores, com o status de cada uma: em aberto (círculo vermelho) ou compensada (círculo verde).',
    quando: 'Para saber o que a empresa deve, para quem e com qual vencimento. É a base da programação de pagamentos.',
    passos: ['Informe o fornecedor ou deixe vazio para todos.', 'Escolha: partidas em aberto na data fixada, compensadas ou todas.', 'F8 executa. A coluna Atraso mostra quantos dias a fatura passou do vencimento (número negativo = ainda vai vencer).'],
    conferir: [
      'A soma das partidas em aberto de todos os fornecedores é igual ao saldo da conta de reconciliação 211000 no FS10N.',
      'A fatura do fornecedor entra a crédito (valor com - no fim). O pagamento entra a débito e compensa a fatura.'
    ],
    tabelas: 'BSIK (partidas de fornecedor em aberto) e BSAK (compensadas).'
  },
  FBL5N: {
    oque: 'Lista as faturas e os recebimentos dos clientes, com o status: em aberto (vermelho) ou compensada (verde).',
    quando: 'Para cobrança: quem está devendo, quanto e desde quando.',
    passos: ['Informe o cliente ou deixe vazio para todos.', 'Escolha partidas em aberto, compensadas ou todas e tecle F8.', 'Classifique pela coluna Atraso para ver primeiro quem está atrasado há mais tempo.'],
    conferir: [
      'A soma das partidas em aberto de todos os clientes é igual ao saldo da conta 112000 no FS10N.',
      'Fatura de cliente entra a débito (valor positivo). O recebimento entra a crédito e compensa a fatura.'
    ],
    tabelas: 'BSID (partidas de cliente em aberto) e BSAD (compensadas).'
  },
  FK03: {
    oque: 'Cadastro do fornecedor: dados gerais (nome, endereço, CNPJ) e dados na empresa (conta de reconciliação e condição de pagamento).',
    quando: 'Antes do primeiro lançamento de um fornecedor novo (FK01) e para consultar ou corrigir o cadastro (FK03 e FK02).',
    passos: ['Informe o fornecedor e tecle Enter.', 'Navegue pelas abas Endereço, Controle, Gestão de conta e Pagamentos.'],
    conferir: [
      'A conta de reconciliação (aba Gestão de conta) é a conta do Razão que recebe automaticamente cada lançamento deste fornecedor. Por isso a 211000 sempre bate com o FBL1N.',
      'A condição de pagamento define o vencimento automático da fatura. Exemplo: Z030 = 30 dias depois da data da fatura.'
    ],
    tabelas: 'LFA1 (dados gerais) e LFB1 (dados na empresa).'
  },
  FD03: {
    oque: 'Cadastro do cliente: dados gerais e dados na empresa (conta de reconciliação e condição de pagamento).',
    quando: 'Antes de faturar para um cliente novo (FD01) e para consultar ou corrigir o cadastro (FD03 e FD02).',
    passos: ['Informe o cliente e tecle Enter.', 'Navegue pelas abas Endereço, Controle, Gestão de conta e Pagamentos.'],
    conferir: ['A conta de reconciliação do cliente (112000) recebe automaticamente cada fatura e cada recebimento dele.', 'A condição de pagamento define o vencimento da fatura e, portanto, o atraso que aparece no FBL5N.'],
    tabelas: 'KNA1 (dados gerais) e KNB1 (dados na empresa).'
  },
  FK10N: {
    oque: 'Saldo do fornecedor mês a mês: quanto foi faturado (créditos), quanto foi pago (débitos) e o saldo devido.',
    passos: ['Informe o fornecedor e o exercício e tecle F8.', 'Duplo clique num valor abre as partidas (FBL1N).'],
    conferir: ['O saldo acumulado com - no fim é o quanto a empresa ainda deve a esse fornecedor.', 'A soma do saldo de todos os fornecedores é igual ao saldo da 211000.'],
    tabelas: 'No SAP clássico: LFC1. Aqui o simulador soma a BSEG.'
  },
  FD10N: {
    oque: 'Saldo do cliente mês a mês: faturado (débitos), recebido (créditos) e o saldo a receber.',
    passos: ['Informe o cliente e o exercício e tecle F8.', 'Duplo clique num valor abre as partidas (FBL5N).'],
    conferir: ['Saldo acumulado positivo é o quanto o cliente ainda deve.', 'A soma de todos os clientes é igual ao saldo da 112000.'],
    tabelas: 'No SAP clássico: KNC1. Aqui o simulador soma a BSEG.'
  },
  FB50: {
    oque: 'Lançamento manual direto em contas do Razão, sem fornecedor nem cliente: tarifas, provisões, transferências entre contas, ajustes.',
    quando: 'Quando o fato contábil não envolve contas a pagar nem contas a receber.',
    passos: [
      'Preencha data do documento, data de lançamento e um texto de cabeçalho.',
      'Em cada linha: conta, Débito ou Crédito e o montante. F4 na conta mostra o plano de contas.',
      'Acompanhe o quadro de saldo: só grava com saldo 0,00 (semáforo verde).',
      'Simular mostra como o documento vai ficar, com as chaves de lançamento 40 (débito) e 50 (crédito).',
      'Grave com Ctrl+S. O número do documento aparece na barra de status embaixo: clique nele para abrir o documento.'
    ],
    conferir: ['Depois de gravar, abra o FS10N das duas contas: o débito e o crédito aparecem no mês da data de lançamento.', 'Tente lançar na conta 211000: o sistema bloqueia, porque é conta de reconciliação.', 'Tente uma data num mês fechado (05.11.2026): aparece o erro de período fechado.'],
    tabelas: 'Cada gravação cria 1 linha na BKPF e uma linha na BSEG para cada item.'
  },
  FB60: {
    oque: 'Lança a fatura (nota fiscal) de um fornecedor. A dívida vai para o fornecedor e a despesa ou o estoque vai para a conta informada nos itens.',
    quando: 'Toda nota de compra ou de serviço recebida.',
    passos: ['Informe o fornecedor (F4), a data da fatura, a data de lançamento, a referência (número da nota) e o montante total.', 'Nos itens, informe a conta de despesa ou de estoque e o valor, a débito.', 'Saldo 0,00 significa que o valor da fatura foi todo distribuído nos itens. Grave com Ctrl+S.'],
    conferir: [
      'O documento sai com tipo KR: chave 31 (crédito no fornecedor) e chave 40 (débito na despesa).',
      'O fornecedor não tem conta própria no Razão: o valor vai sozinho para a conta de reconciliação 211000.',
      'No FBL1N, a fatura aparece em aberto (vermelho) com o vencimento calculado pela condição de pagamento.',
      'Se repetir a mesma referência para o mesmo fornecedor, o sistema avisa de possível duplicidade.'
    ],
    tabelas: 'BKPF, BSEG e BSIK (partida em aberto do fornecedor).'
  },
  FB70: {
    oque: 'Lança a fatura de venda para um cliente. O valor a receber vai para o cliente e a receita vai para a conta informada nos itens.',
    quando: 'Vendas e serviços faturados direto no financeiro. Numa empresa com o módulo de vendas (SD), a fatura chega pronta da VF01.',
    passos: ['Informe o cliente, as datas, a referência e o montante.', 'Nos itens, informe a conta de receita e o valor, a crédito.', 'Grave com Ctrl+S quando o saldo for 0,00.'],
    conferir: ['O documento sai com tipo DR: chave 01 (débito no cliente) e chave 50 (crédito na receita).', 'O valor vai sozinho para a conta de reconciliação 112000.', 'No FBL5N a fatura aparece em aberto com vencimento pela condição de pagamento.'],
    tabelas: 'BKPF, BSEG e BSID (partida em aberto do cliente).'
  },
  'F-53': {
    oque: 'Registra o pagamento a um fornecedor e compensa (dá baixa) nas faturas pagas.',
    quando: 'Pagamento manual de uma ou mais faturas. Em empresa grande, o pagamento em lote é feito pela F110 (programa de pagamento automático).',
    passos: ['Informe as datas, a conta do banco (111100) e o montante pago.', 'Em Seleção de partidas em aberto, informe o fornecedor e clique em Processar PA.', 'Marque as faturas que o pagamento quita. A diferença precisa ficar 0,00.', 'Grave com Ctrl+S.'],
    conferir: ['O documento KZ tem chave 50 (crédito no banco) e 25 (débito no fornecedor).', 'No FBL1N as faturas ficam verdes (compensadas) e mostram o número do pagamento na coluna Doc. compensação.', 'O saldo do banco no FS10N cai no valor pago.'],
    tabelas: 'As faturas saem da BSIK e vão para a BSAK.'
  },
  'F-28': {
    oque: 'Registra o recebimento de um cliente e compensa as faturas recebidas.',
    quando: 'Cada valor que entrou no banco vindo de um cliente.',
    passos: ['Informe as datas, a conta do banco e o valor recebido.', 'Informe o cliente e clique em Processar PA.', 'Marque as faturas recebidas até a diferença zerar e grave com Ctrl+S.'],
    conferir: ['O documento DZ tem chave 40 (débito no banco) e 15 (crédito no cliente).', 'No FBL5N as faturas ficam verdes.', 'O saldo do banco sobe no valor recebido.'],
    tabelas: 'As faturas saem da BSID e vão para a BSAD.'
  },
  FB03: {
    oque: 'Exibe um documento contábil já lançado: o cabeçalho e todas as linhas.',
    quando: 'Para conferir o que foi lançado, por quem, em que data e em quais contas.',
    passos: ['Informe o número do documento (F4 lista os documentos) e o exercício. Enter.', 'Duplo clique numa linha mostra todos os campos técnicos dela.', 'O botão Estornar leva para o FB08 com o documento já preenchido.'],
    conferir: [
      'A soma das linhas é sempre 0,00: débitos = créditos.',
      'Chave de lançamento: 40/50 razão, 31/25 fornecedor, 01/15 cliente. Ela define o tipo de conta e o lado do lançamento.',
      'Tipo de documento: SA razão, KR fatura de fornecedor, KZ pagamento a fornecedor, DR fatura de cliente, DZ recebimento de cliente.'
    ],
    tabelas: 'BKPF (cabeçalho) e BSEG (linhas).'
  },
  FB08: {
    oque: 'Estorna (anula) um documento lançando outro igual, com os lados invertidos. O original não é apagado: no SAP nada se apaga, tudo fica rastreável.',
    quando: 'Lançamento com conta, valor ou data errados.',
    passos: ['Informe o número do documento e o exercício.', 'Motivo 01 estorna na mesma data do original. Motivo 02 estorna numa data posterior (informe a data).', 'Use "Exibir antes do estorno" para conferir o documento.', 'Grave com Ctrl+S.'],
    conferir: ['No FB03 do original aparece "Estornado por" com o número do estorno.', 'O saldo da conta volta ao valor de antes do erro.', 'Documento com partidas compensadas (fatura já paga) não estorna direto: anule a compensação antes na FBRA.'],
    tabelas: 'O campo STBLG da BKPF liga o original ao estorno.'
  },
  FBRA: {
    oque: 'Desfaz uma compensação: as partidas voltam a ficar em aberto. Se quiser, estorna o documento de pagamento junto.',
    quando: 'Pagamento lançado errado (valor, fornecedor ou fatura errada).',
    passos: ['Informe o documento de compensação (normalmente o número do pagamento) e o exercício.', 'Grave e escolha: só anular a compensação, ou anular e estornar.'],
    conferir: ['No FBL1N ou no FBL5N as partidas voltam para vermelho (em aberto).', 'Se escolheu estornar, o saldo do banco volta ao valor de antes.'],
    tabelas: 'Os campos AUGBL e AUGDT da BSEG ficam vazios de novo.'
  },
  OB52: {
    oque: 'Controla quais meses (períodos contábeis) aceitam lançamentos. É assim que a contabilidade fecha o mês: depois de fechado, ninguém lança mais naquela data.',
    quando: 'No fechamento mensal (fecha o mês encerrado) e na virada do mês (abre o próximo).',
    passos: ['Clique em Modificar.', 'Ajuste o período inicial, o período final e os exercícios.', 'Grave com Ctrl+S.'],
    conferir: ['Tente lançar no FB50 com data num período fechado: aparece o erro de período não aberto.', 'No SAP real existem intervalos por tipo de conta (+ todos, K fornecedores, D clientes, S razão) e os períodos especiais 13 a 16 para ajustes do fechamento anual.'],
    tabelas: 'T001B (períodos contábeis permitidos).'
  },
  'F.01': {
    oque: 'Balanço patrimonial e demonstração do resultado (DRE), montados a partir da estrutura de balanço.',
    quando: 'No fechamento do mês e do ano, e para provar que a contabilidade fecha.',
    passos: ['Informe o exercício e o intervalo de períodos.', 'F8 executa.'],
    conferir: [
      'Ativo + passivo + patrimônio líquido soma 0,00 na convenção do SAP (devedor sem sinal, credor com -). É a prova de que o balanço fecha.',
      'Resultado com sinal de menos = lucro (credor). Sem sinal = prejuízo.',
      'O total de cada conta tem que bater com o balancete (S_ALR_87012277).'
    ]
  },
  S_ALR_87012277: {
    oque: 'Balancete: saldo anterior, débitos, créditos e saldo acumulado de cada conta no intervalo de períodos.',
    quando: 'Conferência mensal antes do fechamento e base para o balanço.',
    passos: ['Informe a faixa de contas (vazio = todas), o exercício e os períodos.', 'F8 executa. Duplo clique numa conta abre o FS10N dela.'],
    conferir: ['Total de débitos = total de créditos, e o saldo acumulado total = 0,00.', 'O saldo de uma conta aqui é igual ao FS10N da mesma conta no mesmo período.']
  },
  SE16N: {
    oque: 'Mostra o conteúdo das tabelas do banco de dados. É a ferramenta preferida de quem audita e de quem precisa achar um dado rápido.',
    quando: 'Quando a tela da transação não mostra o que você precisa, ou para contar e cruzar registros.',
    passos: ['Informe a tabela (F4 mostra as disponíveis) e tecle Enter.', 'Preencha os critérios. Exemplo: BELNR = 100000001. Use * como curinga: 1900* traz todos os documentos KR.', 'F8 executa.'],
    conferir: ['BKPF tem 1 linha por documento. BSEG tem 1 linha por item.', 'Na BSEG o montante (DMBTR) é sempre positivo; o lado vem no campo SHKZG: S = débito, H = crédito.', 'BSIK e BSAK separam as partidas de fornecedor em aberto e compensadas. BSID e BSAD fazem o mesmo para clientes.'],
    tabelas: 'BKPF, BSEG, SKAT, SKB1, LFA1, LFB1, KNA1, KNB1, BSIK, BSAK, BSID, BSAD, T001B.'
  }
};
const GUIA_ALIAS = { FK01: 'FK03', FK02: 'FK03', FD01: 'FD03', FD02: 'FD03' };

const AJUDA = {
  bukrs: { t: 'Empresa', tec: 'T001-BUKRS', txt: 'Unidade contábil com balanço próprio. Um grupo pode ter várias empresas no mesmo sistema; aqui existe só a 1000, Empresa Modelo Ltda.' },
  gjahr: { t: 'Exercício', tec: 'BKPF-GJAHR', txt: 'Ano fiscal do documento. Junto com a empresa e o número do documento, identifica um lançamento de forma única.' },
  belnr: { t: 'Número do documento', tec: 'BKPF-BELNR', txt: 'Número dado pelo sistema na gravação. A faixa depende do tipo de documento: SA começa com 10, KR com 19, KZ com 15, DR com 18 e DZ com 14.' },
  bldat: { t: 'Data do documento', tec: 'BKPF-BLDAT', txt: 'Data em que o documento original foi emitido (nota fiscal, recibo, extrato). Na fatura, é a base para calcular o vencimento.' },
  budat: { t: 'Data de lançamento', tec: 'BKPF-BUDAT', txt: 'Data em que o documento entra na contabilidade. Ela define o período (mês) e o exercício. Saldos e relatórios usam esta data, e o período precisa estar aberto na OB52.' },
  xblnr: { t: 'Referência', tec: 'BKPF-XBLNR', txt: 'Número do documento externo, normalmente o número da nota fiscal. Na fatura de fornecedor, o sistema usa a referência para avisar de lançamento em duplicidade.' },
  bktxt: { t: 'Texto de cabeçalho', tec: 'BKPF-BKTXT', txt: 'Descrição livre do documento inteiro. Ajuda quem for consultar depois a entender o lançamento.' },
  hkont: { t: 'Conta do Razão', tec: 'BSEG-HKONT', txt: 'Conta contábil que recebe o valor do item. Use F4 para ver o plano de contas. Contas de reconciliação (211000, 112000) não aceitam lançamento direto.' },
  saknr: { t: 'Conta do Razão', tec: 'SKA1-SAKNR', txt: 'Número da conta no plano de contas. Neste simulador as contas têm 6 dígitos: 1 ativo, 2 passivo e PL, 3 receitas e custos, 4 despesas.' },
  dc: { t: 'Débito/Crédito', tec: 'BSEG-SHKZG', txt: 'Lado do lançamento. No banco de dados fica gravado como S (Soll, débito) ou H (Haben, crédito), herança do alemão.' },
  wrbtr: { t: 'Montante', tec: 'BSEG-WRBTR', txt: 'Valor do item, sempre positivo. O lado (débito ou crédito) vem da chave de lançamento ou da coluna D/C.' },
  sgtxt: { t: 'Texto do item', tec: 'BSEG-SGTXT', txt: 'Descrição da linha. É o texto que aparece no FBL3N, por isso vale escrever algo que explique o lançamento.' },
  zuonr: { t: 'Atribuição', tec: 'BSEG-ZUONR', txt: 'Campo de ordenação das partidas. Se ficar vazio, o sistema preenche pela chave de ordenação da conta (aqui: data de lançamento nas contas do Razão e referência nos fornecedores e clientes).' },
  conta: { t: 'Conta do parceiro', tec: 'BSEG-LIFNR / BSEG-KUNNR', txt: 'Código do fornecedor ou do cliente. O valor vai automaticamente para a conta de reconciliação cadastrada para ele.' },
  lifnr: { t: 'Fornecedor', tec: 'LFA1-LIFNR', txt: 'Código do fornecedor. Use F4 para ver a lista.' },
  kunnr: { t: 'Cliente', tec: 'KNA1-KUNNR', txt: 'Código do cliente. Use F4 para ver a lista.' },
  obj: { t: 'Código do parceiro', tec: 'LFA1-LIFNR / KNA1-KUNNR', txt: 'Código do fornecedor ou do cliente. Na criação, deixe vazio para o sistema dar o próximo número.' },
  stgrd: { t: 'Motivo do estorno', tec: 'BKPF-STGRD', txt: '01: estorno na mesma data do documento original. 02: estorno numa data posterior, por exemplo quando o mês original já está fechado.' },
  augbl: { t: 'Documento de compensação', tec: 'BSEG-AUGBL', txt: 'Número do documento que compensou (deu baixa) a partida. Num pagamento, é o próprio número do pagamento.' },
  banco: { t: 'Conta do banco', tec: 'BSEG-HKONT', txt: 'Conta do Razão do banco por onde o dinheiro saiu ou entrou. Aqui: 111100.' },
  valor: { t: 'Montante pago ou recebido', tec: 'BSEG-WRBTR', txt: 'Valor total que saiu ou entrou no banco. Ele tem que ser igual à soma das partidas marcadas.' },
  chave: { t: 'Data fixada', tec: 'RFITEM-STIDA', txt: 'As partidas são mostradas como estavam nesta data: uma fatura paga depois dela aparece como em aberto.' },
  de: { t: 'Faixa de contas', tec: '', txt: 'Preencha só o primeiro campo para uma conta, os dois para uma faixa, ou deixe vazio para todas.' },
  ate: { t: 'Faixa de contas (até)', tec: '', txt: 'Limite superior da faixa de contas.' },
  budatDe: { t: 'Data de lançamento (de)', tec: 'BKPF-BUDAT', txt: 'Mostra só partidas lançadas a partir desta data. Vazio = sem limite.' },
  budatAte: { t: 'Data de lançamento (até)', tec: 'BKPF-BUDAT', txt: 'Mostra só partidas lançadas até esta data. Vazio = sem limite.' },
  perDe: { t: 'Período inicial', tec: 'BKPF-MONAT', txt: 'Mês inicial do relatório (1 = janeiro).' },
  perAte: { t: 'Período final', tec: 'BKPF-MONAT', txt: 'Mês final do relatório (12 = dezembro).' },
  tabela: { t: 'Nome da tabela', tec: 'DD02L-TABNAME', txt: 'Tabela do banco de dados. Exemplos: BKPF (cabeçalho do documento), BSEG (linhas), LFA1 (fornecedores). F4 mostra as disponíveis.' },
  max: { t: 'Número máximo de ocorrências', tec: '', txt: 'Limita quantas linhas a consulta devolve, para não pesar o sistema.' },
  c_txt: { t: 'Texto breve', tec: 'SKAT-TXT20', txt: 'Nome curto da conta, até 20 caracteres. É o que aparece nas telas de lançamento.' },
  c_longo: { t: 'Texto descritivo', tec: 'SKAT-TXT50', txt: 'Nome completo da conta, até 50 caracteres.' },
  c_no: { t: 'Item da estrutura de balanço', tec: 'Estrutura BPBR', txt: 'Grupo do balanço ou da DRE em que a conta aparece no F.01. No SAP real isso se configura na estrutura de balanço (OB58).' },
  c_recon: { t: 'Conta de reconciliação para tipo de conta', tec: 'SKB1-MITKZ', txt: 'K = a conta é alimentada só pelos lançamentos de fornecedores. D = só pelos de clientes. Vazio = conta comum, aceita lançamento direto.' },
  c_xopvw: { t: 'Administração de partidas em aberto', tec: 'SKB1-XOPVW', txt: 'Quando marcada, cada lançamento fica em aberto até ser compensado por outro. Usada em contas transitórias, como adiantamentos ou banco a identificar.' },
  c_zuawa: { t: 'Chave de ordenação', tec: 'SKB1-ZUAWA', txt: 'Regra para preencher a atribuição automaticamente. 001 = data de lançamento; 012 = referência.' },
  c_xspeb: { t: 'Bloqueado para lançamento', tec: 'SKB1-XSPEB', txt: 'Quando marcada, a conta não aceita novos lançamentos. Usado para desativar contas sem apagar o histórico.' },
  m_nome: { t: 'Nome', tec: 'LFA1-NAME1', txt: 'Razão social do parceiro.' },
  m_cnpj: { t: 'CNPJ', tec: 'LFA1-STCD1', txt: 'Número fiscal do parceiro. No SAP Brasil fica no campo STCD1.' },
  m_conta: { t: 'Conta de reconciliação', tec: 'LFB1-AKONT / KNB1-AKONT', txt: 'Conta do Razão que recebe automaticamente os lançamentos deste parceiro. Fornecedor: 211000. Cliente: 112000.' },
  m_zterm: { t: 'Condição de pagamento', tec: 'LFB1-ZTERM', txt: 'Regra de vencimento: Z000 imediato, Z015 15 dias, Z030 30 dias, Z045 45 dias da data do documento.' }
};

/* ---------- trilha de missões ---------- */
function _docAluno(db, f) { return db.docs.some(d => d.usnam === 'ALUNO' && docAtivo(d) && f(d)); }
function _igual(a, b) { return Math.abs(r2(a) - r2(b)) < 0.006; }

const MISSOES = [
  {
    id: 'nav', titulo: 'Conheça uma conta', tx: 'FS00', tipo: 'acao',
    texto: 'Abra a FS00 e exiba a conta 111100. Passe pelas três abas e veja como a conta está configurada.',
    dica: 'Digite FS00 no campo de comando e tecle Enter. Informe 111100 e clique em Exibir.',
    checar: db => !!db.progresso.eventos['FS00:111100']
  },
  {
    id: 'saldo', titulo: 'Quanto tinha no banco?', tx: 'FS10N', tipo: 'resposta', ph: 'ex.: 1.234,56',
    texto: 'Qual era o saldo da conta 111100 (banco) no fim de setembro?',
    dica: 'FS10N, conta 111100, exercício 2026, F8. Olhe a coluna Saldo acumulado na linha do período 9.',
    resposta: db => saldoConta(db, '111100', 2026, 9)
  },
  {
    id: 'tabela', titulo: 'Por trás da tela', tx: 'SE16N', tipo: 'resposta', ph: 'quantidade de linhas',
    texto: 'Na tabela BSEG, quantas linhas (itens) tem o documento 100000001, o lançamento de abertura?',
    dica: 'SE16N, tabela BSEG, Enter, BELNR = 100000001, F8. A quantidade aparece no rodapé da lista.',
    resposta: db => (acharDoc(db, '100000001', 2026) || { itens: [] }).itens.length
  },
  {
    id: 'devedor', titulo: 'Quem deve há mais tempo?', tx: 'FBL5N', tipo: 'resposta', ph: 'código do cliente',
    texto: 'Qual cliente tem a fatura vencida há mais tempo? Digite o código do cliente.',
    dica: 'FBL5N, deixe o cliente vazio, Partidas em aberto, F8. Clique no título da coluna Atraso e classifique em ordem decrescente.',
    resposta: db => {
      const ab = partidas(db, 'D', { status: 'ab' }).filter(p => p.atraso > 0).sort((a, b) => b.atraso - a.atraso);
      return ab.length ? ab[0].conta : '';
    }
  },
  {
    id: 'tarifa', titulo: 'Seu primeiro lançamento', tx: 'FB50', tipo: 'acao',
    texto: 'Lance pela FB50 uma tarifa bancária de R$ 45,90: débito na 421000 (despesas bancárias) e crédito na 111100 (banco).',
    dica: 'Linha 1: 421000, Débito, 45,90. Linha 2: 111100, Crédito, 45,90. Com o semáforo verde, grave com Ctrl+S.',
    checar: db => _docAluno(db, d => d.blart === 'SA' && d.itens.some(i => i.hkont === '421000' && i.shkzg === 'S' && _igual(i.valor, 45.9)) && d.itens.some(i => i.hkont === '111100' && i.shkzg === 'H' && _igual(i.valor, 45.9)))
  },
  {
    id: 'luz', titulo: 'Conta de luz de outubro', tx: 'FB60', tipo: 'acao',
    texto: 'Lance a fatura de outubro da Energia Sul (fornecedor 100002): R$ 1.280,00, referência NF 8812, despesa na conta 413000.',
    dica: 'FB60: fornecedor 100002, referência NF 8812, montante 1.280,00. No item: conta 413000, Débito, 1.280,00. Datas de outubro.',
    checar: db => _docAluno(db, d => d.blart === 'KR' && d.monat === 10 && d.itens.some(i => i.lifnr === '100002' && _igual(i.valor, 1280)) && d.itens.some(i => i.koart === 'S' && i.hkont === '413000'))
  },
  {
    id: 'aluguel', titulo: 'Pague o aluguel', tx: 'F-53', tipo: 'acao',
    texto: 'Pague com a F-53 tudo o que está em aberto da Imobiliária Central (fornecedor 100003), saindo do banco 111100.',
    dica: 'Veja antes no FBL1N quanto está em aberto para o 100003. Na F-53 informe esse montante e o fornecedor, clique em Processar PA e marque as faturas até a diferença zerar.',
    checar: db => !db.docs.some(d => d.itens.some(i => i.lifnr === '100003' && !i.augbl)) && _docAluno(db, d => d.blart === 'KZ' && d.itens.some(i => i.lifnr === '100003'))
  },
  {
    id: 'receber', titulo: 'Receba de um cliente', tx: 'F-28', tipo: 'acao',
    texto: 'O cliente 200002 pagou a fatura mais antiga dele que está em aberto. Registre o recebimento com a F-28 no banco 111100.',
    dica: 'Veja no FBL5N do 200002 qual é a fatura mais antiga e o valor. Na F-28 informe esse valor e marque só essa fatura.',
    checar: db => _docAluno(db, d => d.blart === 'DZ' && d.itens.some(i => i.kunnr === '200002'))
  },
  {
    id: 'erro', titulo: 'Ache o lançamento errado', tx: 'FBL3N', tipo: 'acao',
    texto: 'A conta de energia de setembro foi lançada em Material de escritório (415000). Encontre, estorne com a FB08 e lance de novo, certo, com a FB60 na conta 413000 e data de lançamento em setembro.',
    dica: 'FBL3N na conta 415000 mostra o lançamento estranho. Duplo clique abre o documento; o botão Estornar leva ao FB08 (motivo 01). Depois FB60: fornecedor 100002, mesmo valor, data de lançamento 10.09.2026, conta 413000.',
    checar: db => {
      const e = acharDoc(db, db.semente.docErrado, 2026);
      if (!e || !e.stblg) return false;
      const v = e.itens[0].valor;
      return _docAluno(db, d => d.blart === 'KR' && d.monat === 9 && d.itens.some(i => i.lifnr === '100002' && _igual(i.valor, v)) && d.itens.some(i => i.hkont === '413000' && i.koart === 'S'));
    }
  },
  {
    id: 'periodo', titulo: 'Mês fechado', tx: 'OB52', tipo: 'acao',
    texto: 'Tente lançar algo no FB50 com data de lançamento 05.11.2026 e veja o erro. Depois abra o período 11 na OB52.',
    dica: 'OB52, Modificar, troque o período final de 10 para 11 e grave com Ctrl+S. Volte ao FB50 e grave de novo.',
    checar: db => periodoAberto(db, 2026, 11)
  },
  {
    id: 'lucro', titulo: 'Deu lucro?', tx: 'F.01', tipo: 'resposta', ph: 'valor do resultado',
    texto: 'Pelo F.01, com os períodos 1 a 9 de 2026, qual foi o resultado da empresa? Digite o valor.',
    dica: 'F.01, períodos 1 a 9, F8. Veja a linha "Resultado do período" no fim da DRE. Valor com - no fim é lucro.',
    resposta: db => resultadoPeriodo(db, 2026, 1, 9), absoluto: true
  },
  {
    id: 'fbra', titulo: 'Desfaça um pagamento', tx: 'FBRA', tipo: 'acao',
    texto: 'Escolha um pagamento a fornecedor (documento KZ), anule a compensação e estorne o pagamento pela FBRA. Depois confira no FBL1N que as faturas voltaram a ficar em aberto.',
    dica: 'No FBL1N com "Partidas compensadas", a coluna Doc. compensação mostra o número do pagamento (começa com 15). Informe esse número na FBRA, grave e escolha "Anular e estornar".',
    checar: db => !!db.progresso.eventos.fbraEstorno
  }
];

function conferirResposta(m, texto) {
  const certa = m.resposta(app.db);
  if (typeof certa === 'number') {
    const n = parseValor(texto);
    if (isNaN(n)) return false;
    return m.absoluto ? _igual(Math.abs(n), Math.abs(certa)) : _igual(n, certa);
  }
  return String(texto || '').trim().toUpperCase() === String(certa).toUpperCase();
}
