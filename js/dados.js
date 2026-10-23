'use strict';
/* Base de dados fictícia: Empresa Modelo Ltda (empresa 1000), exercício 2026, janeiro a 20 de outubro. */

const ESTRUTURA_BAL = [
  { no: '1', txt: 'ATIVO', filhos: ['1.1', '1.2'] },
  { no: '1.1', txt: 'Ativo circulante' },
  { no: '1.2', txt: 'Ativo não circulante' },
  { no: '2', txt: 'PASSIVO', filhos: ['2.1', '2.2'] },
  { no: '2.1', txt: 'Passivo circulante' },
  { no: '2.2', txt: 'Passivo não circulante' },
  { no: '3', txt: 'PATRIMÔNIO LÍQUIDO', filhos: [] },
  { no: '4', txt: 'DEMONSTRAÇÃO DO RESULTADO', filhos: ['4.1', '4.2', '4.3', '4.4', '4.5'] },
  { no: '4.1', txt: 'Receita bruta' },
  { no: '4.2', txt: 'Deduções da receita' },
  { no: '4.3', txt: 'Custo das mercadorias vendidas' },
  { no: '4.4', txt: 'Despesas operacionais' },
  { no: '4.5', txt: 'Resultado financeiro' }
];
const NOS_FOLHA = ['1.1', '1.2', '2.1', '2.2', '3', '4.1', '4.2', '4.3', '4.4', '4.5'];

const CONTAS_INICIAIS = [
  ['111000', 'Caixa geral', 'Caixa geral da matriz', '1.1'],
  ['111100', 'Banco conta movimento', 'Banco conta movimento: agência 0001, c/c 12345-6', '1.1'],
  ['112000', 'Clientes nacionais', 'Clientes nacionais (conta de reconciliação)', '1.1', 'D'],
  ['113000', 'Adiantam. a fornec.', 'Adiantamentos a fornecedores', '1.1'],
  ['114000', 'ICMS a recuperar', 'ICMS a recuperar sobre compras', '1.1'],
  ['115000', 'Estoque mercadorias', 'Estoque de mercadorias para revenda', '1.1'],
  ['121000', 'Máquinas e equipam.', 'Máquinas e equipamentos', '1.2'],
  ['121900', '(-) Deprec. acumulada', '(-) Depreciação acumulada de máquinas', '1.2'],
  ['211000', 'Fornecedores nacion.', 'Fornecedores nacionais (conta de reconciliação)', '2.1', 'K'],
  ['212000', 'Salários a pagar', 'Salários e ordenados a pagar', '2.1'],
  ['213000', 'ICMS a recolher', 'ICMS a recolher', '2.1'],
  ['214000', 'Impostos retidos', 'Impostos retidos a recolher', '2.1'],
  ['215000', 'Empréstimos bancários', 'Empréstimos e financiamentos bancários', '2.2'],
  ['231000', 'Capital social', 'Capital social integralizado', '3'],
  ['232000', 'Lucros acumulados', 'Lucros ou prejuízos acumulados', '3'],
  ['311000', 'Receita de vendas', 'Receita de venda de mercadorias', '4.1'],
  ['311500', 'Receita de serviços', 'Receita de prestação de serviços', '4.1'],
  ['312000', '(-) Devoluções', '(-) Devoluções de vendas', '4.2'],
  ['313000', '(-) ICMS s/ vendas', '(-) ICMS sobre vendas', '4.2'],
  ['321000', 'CMV', 'Custo das mercadorias vendidas', '4.3'],
  ['411000', 'Salários', 'Salários e ordenados', '4.4'],
  ['412000', 'Aluguel', 'Aluguel do imóvel', '4.4'],
  ['413000', 'Energia elétrica', 'Energia elétrica', '4.4'],
  ['414000', 'Telefone e internet', 'Telefone e internet', '4.4'],
  ['415000', 'Material escritório', 'Material de escritório', '4.4'],
  ['416000', 'Depreciação', 'Despesa de depreciação', '4.4'],
  ['417000', 'Serviços terceiros', 'Serviços de terceiros: pessoa jurídica', '4.4'],
  ['421000', 'Despesas bancárias', 'Tarifas e despesas bancárias', '4.5'],
  ['422000', 'Juros pagos', 'Juros passivos', '4.5'],
  ['431000', 'Receitas financeiras', 'Rendimentos de aplicações financeiras', '4.5'],
  ['432000', 'Descontos obtidos', 'Descontos financeiros obtidos', '4.5']
];

const FORNECEDORES_INICIAIS = [
  { lifnr: '100001', nome: 'Distribuidora Paulista de Papéis Ltda', rua: 'Rua das Indústrias, 450', cidade: 'Guarulhos', uf: 'SP', cep: '07034-000', cnpj: '12.345.678/0001-90', conta: '211000', zterm: 'Z030' },
  { lifnr: '100002', nome: 'Energia Sul Distribuição S.A.', rua: 'Av. Central, 1000', cidade: 'São Paulo', uf: 'SP', cep: '01310-000', cnpj: '23.456.789/0001-01', conta: '211000', zterm: 'Z015' },
  { lifnr: '100003', nome: 'Imobiliária Central Ltda', rua: 'Rua XV de Novembro, 88', cidade: 'São Paulo', uf: 'SP', cep: '01013-000', cnpj: '34.567.890/0001-12', conta: '211000', zterm: 'Z015' },
  { lifnr: '100004', nome: 'TeleNet Telecomunicações Ltda', rua: 'Av. das Nações, 2200', cidade: 'Barueri', uf: 'SP', cep: '06454-000', cnpj: '45.678.901/0001-23', conta: '211000', zterm: 'Z015' },
  { lifnr: '100005', nome: 'Prisma Assessoria Contábil Ltda', rua: 'Rua Augusta, 1500', cidade: 'São Paulo', uf: 'SP', cep: '01304-001', cnpj: '56.789.012/0001-34', conta: '211000', zterm: 'Z030' }
];
const CLIENTES_INICIAIS = [
  { kunnr: '200001', nome: 'Mercado Bom Preço Ltda', rua: 'Av. Brasil, 300', cidade: 'Campinas', uf: 'SP', cep: '13010-000', cnpj: '67.890.123/0001-45', conta: '112000', zterm: 'Z030' },
  { kunnr: '200002', nome: 'Loja Horizonte Ltda', rua: 'Rua do Comércio, 77', cidade: 'Santos', uf: 'SP', cep: '11010-000', cnpj: '78.901.234/0001-56', conta: '112000', zterm: 'Z030' },
  { kunnr: '200003', nome: 'Comercial Rio Claro Ltda', rua: 'Av. 1, 940', cidade: 'Rio Claro', uf: 'SP', cep: '13500-000', cnpj: '89.012.345/0001-67', conta: '112000', zterm: 'Z030' },
  { kunnr: '200004', nome: 'Supermercado Estrela Ltda', rua: 'Rua das Flores, 15', cidade: 'Sorocaba', uf: 'SP', cep: '18010-000', cnpj: '90.123.456/0001-78', conta: '112000', zterm: 'Z030' },
  { kunnr: '200005', nome: 'Papelaria Ponto Certo Ltda', rua: 'Rua Direita, 210', cidade: 'Jundiaí', uf: 'SP', cep: '13201-000', cnpj: '01.234.567/0001-89', conta: '112000', zterm: 'Z015' }
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function gerarBaseInicial() {
  const db = {
    versao: SIM.versao,
    empresa: { bukrs: '1000', nome: 'Empresa Modelo Ltda', cidade: 'São Paulo', moeda: 'BRL', plano: 'PCBR', variante: '1000' },
    periodos: { de: 1, anoDe: 2026, ate: 10, anoAte: 2026 },
    contas: CONTAS_INICIAIS.map(([saknr, txt, longo, no, recon]) => ({ saknr, txt, longo, no, recon: recon || '', xopvw: false, zuawa: recon ? '012' : '001', bloqueada: false })),
    fornecedores: FORNECEDORES_INICIAIS.map(f => ({ ...f })),
    clientes: CLIENTES_INICIAIS.map(c => ({ ...c })),
    docs: [],
    seq: { SA: 100000000, KR: 1900000000, KZ: 1500000000, DR: 1800000000, DZ: 1400000000 },
    progresso: { missoes: {}, eventos: {} },
    semente: {}
  };
  const rnd = mulberry32(20261022);
  const v = (a, b) => r2(a + rnd() * (b - a));
  const eventos = [];
  const ev = (data, ordem, fn) => eventos.push({ data, ordem, fn, i: eventos.length });
  const op = data => ({ ignorarPeriodo: true, usuario: 'CONTAB01', cpudt: data });
  const post = (cab, linhas) => {
    const r = lancarDoc(db, cab, linhas, op(cab.budat));
    if (!r.ok) console.warn('Base inicial:', cab, r.erros);
    return r.doc;
  };
  const sa = (data, txt, linhas) => post({ blart: 'SA', bldat: data, budat: data, bktxt: txt }, linhas.map(([bschl, hkont, valor, sgtxt]) => ({ bschl, hkont, valor, sgtxt: sgtxt || txt })));
  const fatF = {}, fatC = {}, vendas = {}, icms = {};
  let nfCompra = 4810, nfVenda = 1201;

  ev('2026-01-02', 0, () => sa('2026-01-02', 'Saldos de abertura 2026', [
    ['40', '111100', 120000, 'Saldo inicial do banco'],
    ['40', '115000', 45000, 'Estoque inicial'],
    ['40', '121000', 96000, 'Máquinas e equipamentos'],
    ['50', '231000', 200000, 'Capital social'],
    ['50', '215000', 61000, 'Empréstimo bancário']
  ]));

  for (let m = 1; m <= 10; m++) {
    const dmax = m === 10 ? 20 : ultimoDia(2026, m);
    const D = d => dataISO(2026, m, Math.min(d, dmax));
    const mm = pad(m);
    fatF[m] = []; fatC[m] = []; vendas[m] = 0;

    const kr = (dia, lifnr, valor, conta, txt, ref, depois) => ev(D(dia), 1, () => {
      const doc = post({ blart: 'KR', bldat: D(dia), budat: D(dia), xblnr: ref, bktxt: txt }, [
        { bschl: '31', lifnr, valor, sgtxt: txt }, { bschl: '40', hkont: conta, valor, sgtxt: txt }]);
      if (doc) { fatF[m].push({ lifnr, doc }); if (depois) depois(doc); }
    });
    kr(1, '100003', 4500, '412000', `Aluguel ${mm}/2026`, `REC-${mm}26`);
    kr(8, '100001', v(14000, 20000), '115000', `Compra de mercadorias ${mm}/2026`, `NF ${nfCompra++}`);
    kr(10, '100002', v(950, 1450), m === 9 ? '415000' : '413000', `Conta de energia ${mm}/2026`, `NF ${70100 + m}`,
      m === 9 ? doc => { db.semente.docErrado = doc.belnr; } : null);
    kr(12, '100004', 389.9, '414000', `Telefone e internet ${mm}/2026`, `FAT ${55000 + m}`);
    kr(15, '100005', 1850, '417000', `Honorários contábeis ${mm}/2026`, `NFS ${300 + m}`);

    const diasVenda = m === 10 ? [4, 11, 18] : [4, 11, 18, 25];
    diasVenda.forEach((dia, k) => {
      const cli = db.clientes[(m * 4 + k) % 5].kunnr;
      const valor = v(9000, 16000), ref = `NF-e ${nfVenda++}`;
      vendas[m] += valor;
      ev(D(dia), 2, () => {
        const doc = post({ blart: 'DR', bldat: D(dia), budat: D(dia), xblnr: ref, bktxt: 'Venda de mercadorias' }, [
          { bschl: '01', kunnr: cli, valor, sgtxt: `Venda ${ref}` }, { bschl: '50', hkont: '311000', valor, sgtxt: `Venda ${ref}` }]);
        if (doc) fatC[m].push({ k, kunnr: cli, doc });
      });
    });

    if (m < 10) {
      const im = icms[m] = r2(vendas[m] * 0.18);
      const cmv = r2(vendas[m] * 0.35);
      ev(D(dmax - 2), 3, () => sa(D(dmax - 2), `ICMS sobre vendas ${mm}/2026`, [['40', '313000', im], ['50', '213000', im]]));
      ev(D(dmax - 2), 4, () => sa(D(dmax - 2), `Baixa do CMV ${mm}/2026`, [['40', '321000', cmv], ['50', '115000', cmv]]));
      ev(D(dmax), 5, () => sa(D(dmax), `Folha de pagamento ${mm}/2026`, [['40', '411000', 12400], ['50', '212000', 12400]]));
      ev(D(dmax), 6, () => sa(D(dmax), `Depreciação ${mm}/2026`, [['40', '416000', 800], ['50', '121900', 800]]));
    }
    const tarifa = v(60, 140);
    ev(D(25), 3, () => sa(D(25), `Tarifas bancárias ${mm}/2026`, [['40', '421000', tarifa], ['50', '111100', tarifa]]));

    if (m >= 2) {
      const ant = pad(m - 1);
      ev(D(5), 1, () => sa(D(5), `Pagamento da folha ${ant}/2026`, [['40', '212000', 12400], ['50', '111100', 12400]]));
      const im = icms[m - 1];
      ev(D(20), 1, () => sa(D(20), `Recolhimento ICMS ${ant}/2026`, [['40', '213000', im], ['50', '111100', im]]));
      // fornecedores: paga no dia 9 as faturas do mês anterior (setembro fica parcialmente em aberto)
      ev(D(9), 3, () => {
        const porForn = {};
        fatF[m - 1].forEach(f => (porForn[f.lifnr] = porForn[f.lifnr] || []).push(f.doc));
        Object.keys(porForn).forEach(lifnr => {
          if (m - 1 === 9 && ['100001', '100002', '100005'].includes(lifnr)) return;
          const docs = porForn[lifnr];
          const total = r2(docs.reduce((s, d) => s + d.itens[0].valor, 0));
          const r = pagarPartidas(db, { tipo: 'K', conta: lifnr, banco: '111100', valor: total, bldat: D(9), budat: D(9), xblnr: '', bktxt: 'Pagamento a fornecedor', refs: docs.map(d => ({ belnr: d.belnr, gjahr: d.gjahr, buzei: 1 })) }, op(D(9)));
          if (!r.ok) console.warn('Pagamento base inicial:', r.erros);
        });
      });
      // clientes: recebem 2 dias depois do mês seguinte; uma fatura de junho nunca foi paga
      [4, 11, 18, 25].forEach((diaFat, k) => {
        if (m - 1 === 6 && k === 2) return;
        if (m - 1 === 9 && k >= 2) return;
        const dia = Math.min(diaFat + 2, dmax);
        ev(D(dia), 4, () => {
          const f = fatC[m - 1].find(x => x.k === k);
          if (!f) return;
          const r = pagarPartidas(db, { tipo: 'D', conta: f.kunnr, banco: '111100', valor: f.doc.itens[0].valor, bldat: D(dia), budat: D(dia), xblnr: f.doc.xblnr, bktxt: 'Recebimento de cliente', refs: [{ belnr: f.doc.belnr, gjahr: f.doc.gjahr, buzei: 1 }] }, op(D(dia)));
          if (!r.ok) console.warn('Recebimento base inicial:', r.erros);
        });
      });
    }
  }

  eventos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem || a.i - b.i));
  eventos.forEach(e => e.fn());
  return db;
}
