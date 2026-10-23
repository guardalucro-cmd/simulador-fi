'use strict';
/* Motor contábil do simulador: base de dados, lançamento, compensação, estorno e saldos.
   Os nomes dos campos seguem as tabelas do SAP (BKPF/BSEG) para o aluno reconhecer no SE16N. */

const SIM = { hoje: '2026-10-22', usuario: 'ALUNO', chave: 'simulador-fi-db', versao: 1 };

// Chaves de lançamento: definem o tipo de conta (S razão, K fornecedor, D cliente) e o lado (S débito, H crédito)
const CHAVES = {
  '01': { koart: 'D', shkzg: 'S', txt: 'Fatura' },
  '02': { koart: 'D', shkzg: 'S', txt: 'Estorno de nota de crédito' },
  '05': { koart: 'D', shkzg: 'S', txt: 'Pagamento efetuado' },
  '11': { koart: 'D', shkzg: 'H', txt: 'Nota de crédito' },
  '12': { koart: 'D', shkzg: 'H', txt: 'Estorno de fatura' },
  '15': { koart: 'D', shkzg: 'H', txt: 'Pagamento recebido' },
  '21': { koart: 'K', shkzg: 'S', txt: 'Nota de crédito' },
  '22': { koart: 'K', shkzg: 'S', txt: 'Estorno de fatura' },
  '25': { koart: 'K', shkzg: 'S', txt: 'Pagamento efetuado' },
  '31': { koart: 'K', shkzg: 'H', txt: 'Fatura' },
  '32': { koart: 'K', shkzg: 'H', txt: 'Estorno de nota de crédito' },
  '35': { koart: 'K', shkzg: 'H', txt: 'Pagamento recebido' },
  '40': { koart: 'S', shkzg: 'S', txt: 'Lançamento a débito' },
  '50': { koart: 'S', shkzg: 'H', txt: 'Lançamento a crédito' }
};
const CHAVE_ESTORNO = { '01': '12', '12': '01', '02': '11', '11': '02', '05': '15', '15': '05', '21': '32', '32': '21', '22': '31', '31': '22', '25': '35', '35': '25', '40': '50', '50': '40' };
const TIPOS_DOC = { SA: 'Documento de razão', KR: 'Fatura de fornecedor', KZ: 'Pagamento a fornecedor', DR: 'Fatura de cliente', DZ: 'Pagamento de cliente' };
const TIPOS_CONTA = { S: 'Razão', K: 'Fornecedor', D: 'Cliente' };
const COND_PGTO = {
  Z000: { dias: 0, txt: 'Pagável imediatamente' },
  Z015: { dias: 15, txt: 'Em 15 dias líquido' },
  Z030: { dias: 30, txt: 'Em 30 dias líquido' },
  Z045: { dias: 45, txt: 'Em 45 dias líquido' }
};
const MOTIVOS_ESTORNO = { '01': 'Estorno no período atual', '02': 'Estorno em período posterior' };

/* ---------- utilidades de número e data ---------- */
function r2(n) { const x = Number(n); return Math.round((x + (x >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100; }
function pad(n, l = 2) { return String(n).padStart(l, '0'); }
function fmtValor(v) {
  if (v === '' || v === null || v === undefined || isNaN(v)) return '';
  const n = r2(v);
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? s + '-' : s; // convenção SAP: sinal de menos no fim
}
function parseValor(s) {
  if (s === null || s === undefined) return NaN;
  s = String(s).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return NaN;
  let neg = false;
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s);
  return neg ? -n : n;
}
function ultimoDia(a, m) { return new Date(Date.UTC(a, m, 0)).getUTCDate(); }
function dataISO(a, m, d) { return `${a}-${pad(m)}-${pad(d)}`; }
function fmtData(iso) { if (!iso) return ''; const [a, m, d] = iso.split('-'); return `${d}.${m}.${a}`; }
function parseData(s) {
  s = String(s || '').trim();
  if (!s) return null;
  let a, m, d, x;
  if ((x = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/))) { d = +x[1]; m = +x[2]; a = +x[3]; }
  else if ((x = s.match(/^(\d{2})(\d{2})(\d{4})$/)) || (x = s.match(/^(\d{2})(\d{2})(\d{2})$/))) { d = +x[1]; m = +x[2]; a = +x[3]; }
  else if ((x = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { a = +x[1]; m = +x[2]; d = +x[3]; }
  else return null;
  if (a < 100) a += 2000;
  if (m < 1 || m > 12 || d < 1 || d > ultimoDia(a, m)) return null;
  return dataISO(a, m, d);
}
function somarDias(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diasEntre(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

/* ---------- consultas ---------- */
function acharConta(db, saknr) { const k = String(saknr || '').trim(); return db.contas.find(c => c.saknr === k); }
function acharFornecedor(db, lifnr) { const k = String(lifnr || '').trim(); return db.fornecedores.find(f => f.lifnr === k); }
function acharCliente(db, kunnr) { const k = String(kunnr || '').trim(); return db.clientes.find(c => c.kunnr === k); }
function acharDoc(db, belnr, gjahr) {
  const k = String(belnr || '').trim();
  return db.docs.find(d => d.belnr === k && (!gjahr || d.gjahr === +gjahr));
}
function contaResultado(c) { return String(c.no).startsWith('4'); }
function vencimento(it) { return it.zfbdt ? somarDias(it.zfbdt, it.dias || 0) : ''; }
function nomeParceiro(db, it) {
  if (it.koart === 'K') return (acharFornecedor(db, it.lifnr) || {}).nome || '';
  if (it.koart === 'D') return (acharCliente(db, it.kunnr) || {}).nome || '';
  return (acharConta(db, it.hkont) || {}).txt || '';
}
function contaDoItem(it) { return it.koart === 'K' ? it.lifnr : it.koart === 'D' ? it.kunnr : it.hkont; }
function docAtivo(d) { return !d.stblg && !d.estornoDe; }

function periodoAberto(db, gjahr, monat) {
  const p = db.periodos, v = gjahr * 100 + monat;
  return v >= p.anoDe * 100 + p.de && v <= p.anoAte * 100 + p.ate;
}

/* ---------- lançamento ---------- */
function lancarDoc(db, cab, linhas, opts = {}) {
  const erros = [];
  const budat = cab.budat, bldat = cab.bldat || cab.budat;
  if (!budat) erros.push('Informe uma data de lançamento válida (DD.MM.AAAA).');
  if (!bldat) erros.push('Informe uma data de documento válida (DD.MM.AAAA).');
  if (!TIPOS_DOC[cab.blart]) erros.push(`O tipo de documento ${cab.blart} não existe.`);
  let gjahr = 0, monat = 0;
  if (budat) {
    gjahr = +budat.slice(0, 4); monat = +budat.slice(5, 7);
    if (!opts.ignorarPeriodo && !periodoAberto(db, gjahr, monat))
      erros.push(`O período contábil ${pad(monat, 3)} ${gjahr} não está aberto. Abra o período na transação OB52.`);
  }
  if (linhas.length < 2) erros.push('Um documento precisa de pelo menos duas linhas: um débito e um crédito.');
  const itens = [];
  linhas.forEach((l, i) => {
    const n = i + 1, ch = CHAVES[l.bschl];
    if (!ch) { erros.push(`Linha ${n}: a chave de lançamento ${l.bschl} não existe.`); return; }
    const valor = r2(Number(l.valor));
    if (!(valor > 0)) erros.push(`Linha ${n}: informe um montante maior que zero.`);
    const it = { buzei: n, bschl: l.bschl, koart: ch.koart, shkzg: ch.shkzg, hkont: '', lifnr: '', kunnr: '', valor, sgtxt: l.sgtxt || '', zuonr: l.zuonr || '', zfbdt: '', dias: 0, augbl: '', augdt: '' };
    if (ch.koart === 'S') {
      const c = acharConta(db, l.hkont);
      if (!c) erros.push(`Linha ${n}: a conta ${l.hkont || '(vazia)'} não existe na empresa ${db.empresa.bukrs}.`);
      else if (c.recon && !opts.permitirRecon) erros.push(`Linha ${n}: a conta ${c.saknr} (${c.txt}) é conta de reconciliação. Ela só recebe lançamentos indiretos, pelo ${c.recon === 'K' ? 'fornecedor (FB60, F-53)' : 'cliente (FB70, F-28)'}.`);
      else if (c.bloqueada) erros.push(`Linha ${n}: a conta ${c.saknr} está bloqueada para lançamentos (FS00, aba Criação/banco/juros).`);
      if (c) it.hkont = c.saknr;
      if (!it.zuonr && budat) it.zuonr = budat.replace(/-/g, '');
    } else if (ch.koart === 'K') {
      const f = acharFornecedor(db, l.lifnr);
      if (!f) erros.push(`Linha ${n}: o fornecedor ${l.lifnr || '(vazio)'} não existe na empresa ${db.empresa.bukrs}.`);
      else {
        it.lifnr = f.lifnr; it.hkont = f.conta; it.zfbdt = bldat;
        it.dias = l.dias !== undefined ? l.dias : (COND_PGTO[f.zterm] || { dias: 0 }).dias;
        if (!it.zuonr) it.zuonr = cab.xblnr || '';
      }
    } else {
      const c = acharCliente(db, l.kunnr);
      if (!c) erros.push(`Linha ${n}: o cliente ${l.kunnr || '(vazio)'} não existe na empresa ${db.empresa.bukrs}.`);
      else {
        it.kunnr = c.kunnr; it.hkont = c.conta; it.zfbdt = bldat;
        it.dias = l.dias !== undefined ? l.dias : (COND_PGTO[c.zterm] || { dias: 0 }).dias;
        if (!it.zuonr) it.zuonr = cab.xblnr || '';
      }
    }
    itens.push(it);
  });
  const deb = r2(itens.filter(i => i.shkzg === 'S').reduce((s, i) => s + (i.valor || 0), 0));
  const cred = r2(itens.filter(i => i.shkzg === 'H').reduce((s, i) => s + (i.valor || 0), 0));
  if (itens.length >= 2 && Math.abs(deb - cred) > 0.004)
    erros.push(`O saldo do documento não é zero: débitos ${fmtValor(deb)}, créditos ${fmtValor(cred)}, diferença ${fmtValor(r2(deb - cred))}.`);
  if (erros.length) return { ok: false, erros };
  if (opts.simular) return { ok: true, simulado: true, itens, gjahr, monat };
  db.seq[cab.blart] = (db.seq[cab.blart] || 0) + 1;
  const doc = {
    bukrs: db.empresa.bukrs, belnr: String(db.seq[cab.blart]), gjahr, blart: cab.blart, bldat, budat, monat,
    xblnr: cab.xblnr || '', bktxt: cab.bktxt || '', usnam: opts.usuario || SIM.usuario, cpudt: opts.cpudt || SIM.hoje,
    stblg: '', estornoDe: '', stgrd: '', itens
  };
  db.docs.push(doc);
  return { ok: true, belnr: doc.belnr, doc };
}

/* ---------- compensação e pagamento ---------- */
function compensar(db, refs, augbl, augdt) {
  refs.forEach(r => {
    const d = acharDoc(db, r.belnr, r.gjahr);
    const it = d && d.itens.find(i => i.buzei === r.buzei);
    if (it) { it.augbl = augbl; it.augdt = augdt; }
  });
}

function pagarPartidas(db, p, opts = {}) {
  const K = p.tipo === 'K', erros = [];
  if (!p.refs || !p.refs.length) erros.push('Selecione pelo menos uma partida em aberto.');
  let soma = 0;
  (p.refs || []).forEach(r => {
    const d = acharDoc(db, r.belnr, r.gjahr);
    const it = d && d.itens.find(i => i.buzei === r.buzei);
    if (!it || it.augbl) { erros.push(`A partida ${r.belnr}/${r.buzei} não está mais em aberto.`); return; }
    soma += it.shkzg === 'S' ? it.valor : -it.valor;
  });
  const esperado = r2(K ? -soma : soma);
  const valor = r2(p.valor);
  if (!erros.length && esperado <= 0) erros.push('As partidas selecionadas não somam um valor a pagar ou a receber.');
  if (!erros.length && Math.abs(esperado - valor) > 0.004)
    erros.push(`O montante informado (${fmtValor(valor)}) é diferente do total das partidas marcadas (${fmtValor(esperado)}). Diferença: ${fmtValor(r2(valor - esperado))}.`);
  if (erros.length) return { ok: false, erros };
  const txt = p.bktxt || (K ? 'Pagamento a fornecedor' : 'Recebimento de cliente');
  const linhas = K
    ? [{ bschl: '50', hkont: p.banco, valor, sgtxt: txt }, { bschl: '25', lifnr: p.conta, valor, sgtxt: txt, zuonr: p.xblnr || '', dias: 0 }]
    : [{ bschl: '40', hkont: p.banco, valor, sgtxt: txt }, { bschl: '15', kunnr: p.conta, valor, sgtxt: txt, zuonr: p.xblnr || '', dias: 0 }];
  const r = lancarDoc(db, { blart: K ? 'KZ' : 'DZ', bldat: p.bldat, budat: p.budat, xblnr: p.xblnr, bktxt: p.bktxt }, linhas, opts);
  if (!r.ok) return r;
  compensar(db, [...p.refs, { belnr: r.belnr, gjahr: r.doc.gjahr, buzei: 2 }], r.belnr, p.budat);
  return r;
}

/* ---------- estorno ---------- */
function estornarDoc(db, belnr, gjahr, p = {}, opts = {}) {
  const d = acharDoc(db, belnr, gjahr);
  const falha = t => ({ ok: false, erros: [t] });
  if (!d) return falha(`O documento ${belnr || '(vazio)'} não existe no exercício ${gjahr || '?'}.`);
  if (d.stblg) return falha(`O documento ${belnr} já foi estornado pelo documento ${d.stblg}.`);
  if (d.estornoDe) return falha(`O documento ${belnr} é o estorno do documento ${d.estornoDe} e não pode ser estornado.`);
  const comp = d.itens.find(i => i.augbl);
  if (comp) return falha(`O documento ${belnr} tem partidas compensadas pelo documento ${comp.augbl}. Anule a compensação antes, na transação FBRA.`);
  const motivo = p.motivo || '';
  if (!MOTIVOS_ESTORNO[motivo]) return falha('Informe o motivo do estorno (01 ou 02). Use F4 no campo.');
  const data = motivo === '01' ? d.budat : p.budat;
  if (!data) return falha('Com o motivo 02, informe a data de lançamento do estorno.');
  if (data < d.budat) return falha('A data do estorno não pode ser anterior à data de lançamento do documento original.');
  const linhas = d.itens.map(it => ({ bschl: CHAVE_ESTORNO[it.bschl], hkont: it.hkont, lifnr: it.lifnr, kunnr: it.kunnr, valor: it.valor, sgtxt: it.sgtxt, zuonr: it.zuonr, dias: it.dias }));
  const r = lancarDoc(db, { blart: d.blart, bldat: d.bldat, budat: data, xblnr: d.xblnr, bktxt: `Estorno do doc. ${d.belnr}` }, linhas, { ...opts, permitirRecon: true });
  if (!r.ok) return r;
  d.stblg = r.belnr; d.stgrd = motivo;
  r.doc.estornoDe = d.belnr; r.doc.stgrd = motivo;
  // as partidas de fornecedor/cliente do original e do estorno se compensam entre si
  d.itens.forEach((it, i) => {
    if (it.koart !== 'S') { it.augbl = r.belnr; it.augdt = data; r.doc.itens[i].augbl = r.belnr; r.doc.itens[i].augdt = data; }
  });
  return r;
}

function anularCompensacao(db, augbl, gjahr) {
  const k = String(augbl || '').trim();
  const d = acharDoc(db, k, gjahr);
  if (d && d.estornoDe) return { ok: false, erros: [`A compensação ${k} foi gerada por um estorno e não pode ser anulada.`] };
  const itens = [];
  db.docs.forEach(doc => doc.itens.forEach(it => { if (it.augbl === k) itens.push(it); }));
  if (!itens.length) return { ok: false, erros: [`O documento ${k || '(vazio)'} não compensou nenhuma partida. Informe o número do documento de compensação (normalmente o pagamento).`] };
  itens.forEach(it => { it.augbl = ''; it.augdt = ''; });
  return { ok: true, qtd: itens.length, doc: d };
}

/* ---------- saldos ---------- */
function mapaSaldos(db, gjahr) {
  const m = {};
  for (const d of db.docs) {
    if (d.gjahr !== gjahr) continue;
    for (const it of d.itens) {
      const p = m[it.hkont] || (m[it.hkont] = Array.from({ length: 13 }, () => ({ d: 0, c: 0 })));
      if (it.shkzg === 'S') p[d.monat].d += it.valor; else p[d.monat].c += it.valor;
    }
  }
  return m;
}
function saldosPeriodo(db, pred, gjahr) {
  const p = Array.from({ length: 13 }, () => ({ d: 0, c: 0 }));
  for (const d of db.docs) {
    if (d.gjahr !== gjahr) continue;
    for (const it of d.itens) {
      if (!pred(it)) continue;
      if (it.shkzg === 'S') p[d.monat].d += it.valor; else p[d.monat].c += it.valor;
    }
  }
  p.forEach(x => { x.d = r2(x.d); x.c = r2(x.c); });
  return p;
}
function saldoConta(db, saknr, gjahr, ate, de = 1) {
  const p = saldosPeriodo(db, it => it.hkont === saknr, gjahr);
  let s = 0;
  for (let m = de; m <= ate; m++) s += p[m].d - p[m].c;
  return r2(s);
}
function resultadoPeriodo(db, gjahr, de, ate) {
  const res = new Set(db.contas.filter(contaResultado).map(c => c.saknr));
  let s = 0;
  for (const d of db.docs) {
    if (d.gjahr !== gjahr || d.monat < de || d.monat > ate) continue;
    for (const it of d.itens) if (res.has(it.hkont)) s += it.shkzg === 'S' ? it.valor : -it.valor;
  }
  return r2(s); // negativo = lucro (credor)
}

/* Partidas individuais para FBL3N, FBL1N e FBL5N */
function partidas(db, tipo, f) {
  const out = [], chave = f.chave || SIM.hoje;
  for (const d of db.docs) {
    if (f.budatDe && d.budat < f.budatDe) continue;
    if (f.budatAte && d.budat > f.budatAte) continue;
    for (const it of d.itens) {
      let conta;
      if (tipo === 'S') conta = it.hkont;
      else if (tipo === 'K') { if (it.koart !== 'K') continue; conta = it.lifnr; }
      else { if (it.koart !== 'D') continue; conta = it.kunnr; }
      if (f.de && !f.ate && conta !== f.de) continue;
      if (f.de && f.ate && (conta < f.de || conta > f.ate)) continue;
      if (!f.de && f.ate && conta > f.ate) continue;
      const temOP = it.koart !== 'S';
      const aberta = d.budat <= chave && (!it.augbl || it.augdt > chave);
      if (f.status === 'ab' && !aberta) continue;
      if (f.status === 'cp' && !it.augbl) continue;
      const venc = vencimento(it);
      let nome;
      if (tipo === 'S') nome = (acharConta(db, conta) || {}).txt || '';
      else nome = nomeParceiro(db, it);
      out.push({
        st: temOP ? (aberta ? 'ab' : 'cp') : '',
        conta, nome, zuonr: it.zuonr, belnr: d.belnr, gjahr: d.gjahr, blart: d.blart, bldat: d.bldat, budat: d.budat,
        bschl: it.bschl, valor: it.shkzg === 'S' ? it.valor : -it.valor, moeda: 'BRL', sgtxt: it.sgtxt,
        augbl: it.augbl, augdt: it.augdt, venc, buzei: it.buzei,
        atraso: temOP && aberta && venc ? diasEntre(venc, chave) : ''
      });
    }
  }
  return out;
}

/* ---------- persistência ---------- */
function carregarDB() {
  try {
    const s = localStorage.getItem(SIM.chave);
    if (s) { const d = JSON.parse(s); if (d && d.versao === SIM.versao) return d; }
  } catch (e) { /* sem armazenamento: segue com base nova */ }
  return novaBase();
}
function novaBase() { const d = gerarBaseInicial(); salvarDB(d); return d; }
function salvarDB(db) { try { localStorage.setItem(SIM.chave, JSON.stringify(db)); } catch (e) { /* ignora */ } }
