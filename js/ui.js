'use strict';
/* Peças de interface: ícones, campos, pop-ups, ajuda F4/F1, barra de status e lista ALV. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function cmp(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a === '' || a === undefined || a === null) return b === '' || b === undefined || b === null ? 0 : -1;
  if (b === '' || b === undefined || b === null) return 1;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

/* Transações registradas: cada tela define título, campos, botões e ações de teclado */
const TX = {};
function defTx(tc, def) { TX[tc] = Object.assign({ tcode: tc }, def); }

/* ---------- ícones (SVG 16x16) ---------- */
const S = (corpo, w = 16) => `<svg viewBox="0 0 16 16" width="${w}" height="${w}" aria-hidden="true">${corpo}</svg>`;
const ICONES = {
  ok: S('<circle cx="8" cy="8" r="7" fill="#2b7d2b"/><path d="M4.6 8.2l2.3 2.4 4.6-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  gravar: S('<path d="M2 2h10l2 2v10H2z" fill="#3f6fa0"/><rect x="4.3" y="2.6" width="6.6" height="3.6" fill="#e3ecf5"/><rect x="4" y="9" width="8" height="4.6" fill="#fff"/>'),
  voltar: S('<circle cx="8" cy="8" r="7" fill="#2b7d2b"/><path d="M9.6 4.6L6.2 8l3.4 3.4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  sair: S('<circle cx="8" cy="8" r="7" fill="#e3a21a"/><path d="M8 11.6V4.8M5 7.6l3-3 3 3" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  cancelar: S('<circle cx="8" cy="8" r="7" fill="#c0392b"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>'),
  exec: S('<circle cx="8" cy="8" r="6.4" fill="#fff" stroke="#2b7d2b" stroke-width="1.6"/><path d="M8 4.4V8l2.6 1.6" fill="none" stroke="#2b7d2b" stroke-width="1.6" stroke-linecap="round"/>'),
  exibir: S('<circle cx="4.6" cy="9.4" r="2.7" fill="#d9e8f6" stroke="#32363a" stroke-width="1.3"/><circle cx="11.4" cy="9.4" r="2.7" fill="#d9e8f6" stroke="#32363a" stroke-width="1.3"/><path d="M7.3 9.2h1.4M1.9 9L1.2 5.6M14.1 9l.7-3.4" stroke="#32363a" stroke-width="1.3" fill="none"/>'),
  modificar: S('<path d="M2.6 13.4l.9-3.1 7.4-7.4 2.2 2.2-7.4 7.4z" fill="#f0b429" stroke="#8a5a00" stroke-width=".9"/><path d="M3.5 10.3l2.2 2.2" stroke="#8a5a00" stroke-width=".9"/>'),
  criar: S('<path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#5b738b"/><path d="M9.5 1.5v3h3" fill="none" stroke="#5b738b"/><path d="M6 9h4M8 7v4" stroke="#2b7d2b" stroke-width="1.4"/>'),
  novo: S('<path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#5b738b"/><path d="M9.5 1.5v3h3" fill="none" stroke="#5b738b"/>'),
  simular: S('<path d="M2.5 1.5h6l2 2v5" fill="#fff" stroke="#5b738b"/><path d="M2.5 1.5v12h5" fill="none" stroke="#5b738b"/><circle cx="10.5" cy="10.5" r="2.6" fill="none" stroke="#32363a" stroke-width="1.4"/><path d="M12.4 12.4l2.2 2.2" stroke="#32363a" stroke-width="1.7"/>'),
  lupa: S('<circle cx="6.6" cy="6.6" r="4.1" fill="#eef5fc" stroke="#32363a" stroke-width="1.6"/><path d="M9.6 9.6l4.2 4.2" stroke="#32363a" stroke-width="2.1" stroke-linecap="round"/>'),
  f4: S('<rect x="2.5" y="2.5" width="11" height="11" fill="#fff" stroke="#5b738b"/><path d="M4.6 5.5h6.8M4.6 8h6.8M4.6 10.5h6.8" stroke="#5b738b"/>', 14),
  asc: S('<path d="M4 13V3M1.8 5.2L4 3l2.2 2.2" fill="none" stroke="#32363a" stroke-width="1.4"/><path d="M8 4h3M8 8h5M8 12h7" stroke="#0854a0" stroke-width="1.6"/>'),
  desc: S('<path d="M4 3v10M1.8 10.8L4 13l2.2-2.2" fill="none" stroke="#32363a" stroke-width="1.4"/><path d="M8 4h7M8 8h5M8 12h3" stroke="#0854a0" stroke-width="1.6"/>'),
  filtro: S('<path d="M1.5 2.5h13l-5 6v5l-3 1.5V8.5z" fill="#d9e8f6" stroke="#32363a" stroke-width="1.1" stroke-linejoin="round"/>'),
  soma: S('<path d="M12.5 3H3.5l5 5-5 5h9" fill="none" stroke="#32363a" stroke-width="1.7" stroke-linejoin="round"/>'),
  exportar: S('<rect x="1.5" y="2" width="13" height="12" fill="#fff" stroke="#1d6f42"/><path d="M1.5 5.5h13M6 2v12M10 2v12M1.5 9h13" stroke="#1d6f42" stroke-width=".9"/>'),
  lista: S('<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#5b738b"/><path d="M4 5h8M4 8h8M4 11h6" stroke="#0854a0" stroke-width="1.3"/>'),
  estornar: S('<path d="M5 3.5L2 6.5l3 3" fill="none" stroke="#c0392b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 6.5h7a3.6 3.6 0 010 7.2H6" fill="none" stroke="#c0392b" stroke-width="1.7" stroke-linecap="round"/>'),
  mais: S('<path d="M8 3v10M3 8h10" stroke="#2b7d2b" stroke-width="2" stroke-linecap="round"/>'),
  menos: S('<path d="M3 8h10" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>'),
  info: S('<circle cx="8" cy="8" r="7" fill="#0a6ed1"/><path d="M8 7v4.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="4.6" r="1.1" fill="#fff"/>'),
  erro: S('<circle cx="8" cy="8" r="7" fill="#bb0000"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'),
  aviso: S('<path d="M8 1.6l7 12.6H1z" fill="#f0ab00" stroke="#b07a00" stroke-width=".8" stroke-linejoin="round"/><path d="M8 6v4" stroke="#32363a" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="#32363a"/>'),
  sucesso: S('<rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#107e3e"/><path d="M4.6 8.2l2.3 2.4 4.6-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  ab: S('<circle cx="8" cy="8" r="5" fill="#d32f2f" stroke="#8e1b1b" stroke-width=".8"/>', 14),
  cp: S('<circle cx="8" cy="8" r="5" fill="#2e9d4b" stroke="#1b6b31" stroke-width=".8"/>', 14),
  vencido: S('<path d="M8 2l6 6-6 6-6-6z" fill="#d32f2f"/>', 13),
  emdia: S('<path d="M8 2l6 6-6 6-6-6z" fill="#2e9d4b"/>', 13),
  luzVerde: S('<rect x="4" y="1" width="8" height="14" rx="2" fill="#3b3f44"/><circle cx="8" cy="4.5" r="1.8" fill="#555"/><circle cx="8" cy="11.5" r="1.9" fill="#3fd463"/>'),
  luzVermelha: S('<rect x="4" y="1" width="8" height="14" rx="2" fill="#3b3f44"/><circle cx="8" cy="4.5" r="1.9" fill="#ff4d4d"/><circle cx="8" cy="11.5" r="1.8" fill="#555"/>'),
  pasta: S('<path d="M1.5 4h5l1.5 1.5h6.5v8h-13z" fill="#f2c94c" stroke="#b58a12" stroke-width=".8"/>'),
  pastaAberta: S('<path d="M1.5 4h5l1.5 1.5h6v2H4l-2.5 6z" fill="#f2c94c" stroke="#b58a12" stroke-width=".8"/><path d="M4 7.5h11l-2.5 6h-11z" fill="#f7dc83" stroke="#b58a12" stroke-width=".8"/>'),
  tx: S('<path d="M8 1.8l5.6 3.1v6.2L8 14.2 2.4 11.1V4.9z" fill="#dce9f6" stroke="#0854a0" stroke-width="1"/><path d="M2.6 5L8 8l5.4-3M8 8v6" fill="none" stroke="#0854a0" stroke-width=".9"/>'),
  livro: S('<path d="M2 3c2-1 4-1 6 .5 2-1.5 4-1.5 6-.5v10c-2-1-4-1-6 .5-2-1.5-4-1.5-6-.5z" fill="#fff" stroke="currentColor" stroke-width="1.2"/><path d="M8 3.5v10" stroke="currentColor" stroke-width="1.1"/>'),
  marcar: S('<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#5b738b"/><path d="M4.6 8.2l2.3 2.4 4.6-5" fill="none" stroke="#2b7d2b" stroke-width="1.8"/>'),
  desmarcar: S('<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#5b738b"/>'),
  tecnico: S('<text x="1" y="12" font-size="10" font-family="monospace" font-weight="bold" fill="#0854a0">AB</text>')
};
function icone(n) { return ICONES[n] || ''; }

/* ---------- construtores de campos ---------- */
function descDe(tipo, v) {
  const db = app.db; v = String(v || '').trim();
  if (!v) return '';
  if (tipo === 'conta') return (acharConta(db, v) || {}).txt || '';
  if (tipo === 'fornecedor') return (acharFornecedor(db, v) || {}).nome || '';
  if (tipo === 'cliente') return (acharCliente(db, v) || {}).nome || '';
  if (tipo === 'motivo') return MOTIVOS_ESTORNO[v] || '';
  if (tipo === 'tabela') return (TABELAS[v.toUpperCase()] || {}).desc || '';
  if (tipo === 'zterm') return (COND_PGTO[v.toUpperCase()] || {}).txt || '';
  return '';
}
function inp(k, ctx, o = {}) {
  const v = ctx.v[k] ?? '';
  const at = [
    `id="f_${k}"`, `data-k="${k}"`, `value="${esc(v)}"`, `style="width:${(o.larg || 12) + 3}ch"`,
    o.obrig ? 'data-obrig="1"' : '', o.f4 ? `data-f4="${o.f4}"` : '', `data-f1="${o.f1 || k}"`,
    o.desc ? `data-desc="${o.desc}"` : '', o.tipo ? `data-tipo="${o.tipo}"` : '', o.max ? `maxlength="${o.max}"` : '',
    o.ro ? 'readonly tabindex="-1"' : '', o.dis ? 'disabled' : '', 'autocomplete="off" spellcheck="false"'
  ].filter(Boolean).join(' ');
  return `<span class="inpw${o.f4 && !o.dis ? ' temf4' : ''}"><input ${at}>${o.f4 && !o.dis ? `<button class="f4btn" tabindex="-1" title="Ajuda de pesquisa (F4)">${icone('f4')}</button>` : ''}</span>`;
}
function campo(k, rot, ctx, o = {}) {
  const v = ctx.v[k] ?? '';
  return `<div class="campo"><label for="f_${k}" class="${o.obrig ? 'obr' : ''}" title="Posicione no campo e tecle F1 para ajuda">${esc(rot)}</label>${inp(k, ctx, o)}${o.desc ? `<span class="desc" id="d_${k}">${esc(descDe(o.desc, v))}</span>` : ''}${o.depois || ''}</div>`;
}
function faixa(kDe, kAte, rot, ctx, o = {}) {
  return `<div class="campo"><label for="f_${kDe}">${esc(rot)}</label>${inp(kDe, ctx, o)}<span class="ate">até</span>${inp(kAte, ctx, o)}</div>`;
}
function campoFixo(rot, valor, extra = '') {
  return `<div class="campo"><span class="rot">${esc(rot)}</span><span class="fixo">${esc(valor)}</span>${extra ? `<span class="desc">${esc(extra)}</span>` : ''}</div>`;
}
function rad(k, ops, ctx, o = {}) {
  return `<div class="radios">${ops.map(([val, rot]) => `<label class="rd"><input type="radio" name="r_${k}" data-k="${k}" value="${val}" ${String(ctx.v[k]) === val ? 'checked' : ''} ${o.dis ? 'disabled' : ''}> ${esc(rot)}</label>`).join('')}</div>`;
}
function chk(k, rot, ctx, o = {}) {
  return `<div class="campo"><span class="rot"></span><label class="ck"><input type="checkbox" data-k="${k}" data-f1="${o.f1 || k}" ${ctx.v[k] ? 'checked' : ''} ${o.dis ? 'disabled' : ''}> ${esc(rot)}</label></div>`;
}
function sel(k, rot, ops, ctx, o = {}) {
  const v = String(ctx.v[k] ?? '');
  return `<div class="campo"><label for="f_${k}" class="${o.obrig ? 'obr' : ''}">${esc(rot)}</label><select id="f_${k}" data-k="${k}" data-f1="${o.f1 || k}" ${o.dis ? 'disabled' : ''}>${ops.map(([val, t]) => `<option value="${esc(val)}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
}
function grupo(titulo, html) { return `<fieldset class="grupo"><legend>${esc(titulo)}</legend>${html}</fieldset>`; }
function abasHTML(ctx, abas) {
  const at = ctx.s.aba || abas[0][0];
  return `<div class="abas">${abas.map(([id, t]) => `<div class="aba ${id === at ? 'ativa' : ''}" data-aba="${id}">${esc(t)}</div>`).join('')}</div>`;
}

/* ---------- barra de status ---------- */
function msg(tipo, texto, opts = {}) {
  const m = $('#msg');
  m.className = 'msg-' + tipo + (opts.acao ? ' clic' : '');
  m.innerHTML = `${icone({ S: 'sucesso', E: 'erro', W: 'aviso', I: 'info' }[tipo])}<span>${esc(texto)}</span>`;
  m.onclick = opts.acao || null;
  m.title = opts.acao ? (opts.dicaAcao || 'Clique para ver os detalhes') : texto;
  if (tipo === 'E') { m.classList.remove('pisca'); void m.offsetWidth; m.classList.add('pisca'); }
}
function limparMsg() { const m = $('#msg'); m.className = ''; m.innerHTML = ''; m.onclick = null; m.title = ''; }
function msgErros(erros) {
  if (!erros || !erros.length) return;
  if (erros.length === 1) { msg('E', erros[0]); return; }
  msg('E', `${erros[0]}  (+${erros.length - 1}: clique para ver todas)`, {
    acao: () => popup({ titulo: 'Log de mensagens', largura: 620, html: `<table class="grid"><tbody>${erros.map(e => `<tr><td class="ic">${icone('erro')}</td><td style="white-space:normal">${esc(e)}</td></tr>`).join('')}</tbody></table>`, botoes: [{ txt: 'Fechar', ic: 'ok', padrao: true }] })
  });
}
function marcarErro(k) { const i = $(`#f_${k}`); if (i) { i.classList.add('erro'); i.focus(); i.select && i.select(); } }

/* ---------- pop-ups ---------- */
let popupAtual = null;
function popup({ titulo, html, botoes = [], largura = 520, aoAbrir }) {
  fecharPopup();
  const layer = $('#popup-layer');
  layer.innerHTML = `<div class="pp-fundo"><div class="pp" style="width:${largura}px" role="dialog"><div class="pp-tit"><span>${esc(titulo)}</span><button class="pp-x" title="Fechar (Esc)">×</button></div><div class="pp-corpo">${html}</div>${botoes.length ? `<div class="pp-bts">${botoes.map((b, i) => `<button class="btn ${b.padrao ? 'pri' : ''}" data-i="${i}">${b.ic ? icone(b.ic) : ''}${esc(b.txt)}</button>`).join('')}</div>` : ''}</div></div>`;
  const el = $('.pp', layer);
  popupAtual = { el, botoes };
  $('.pp-x', el).onclick = fecharPopup;
  $$('.pp-bts button', el).forEach(b => b.onclick = () => { const bt = botoes[+b.dataset.i]; fecharPopup(); if (bt.acao) bt.acao(); });
  if (aoAbrir) aoAbrir(el);
  else { const f = $('input,button.pri', el); if (f) f.focus(); }
  return el;
}
function fecharPopup() { const l = $('#popup-layer'); if (l) l.innerHTML = ''; popupAtual = null; }
function popupPadrao() {
  if (!popupAtual) return;
  const b = popupAtual.botoes.find(x => x.padrao) || popupAtual.botoes[0];
  fecharPopup();
  if (b && b.acao) b.acao();
}
function confirmar(titulo, texto, acaoSim, rotSim = 'Sim') {
  popup({ titulo, html: `<p style="display:flex;gap:10px;align-items:flex-start">${icone('aviso')}<span>${esc(texto)}</span></p>`, botoes: [{ txt: rotSim, ic: 'ok', padrao: true, acao: acaoSim }, { txt: 'Cancelar', ic: 'cancelar' }] });
}

/* ---------- ajuda de pesquisa F4 ---------- */
const F4 = {
  conta: { titulo: 'Contas do Razão (plano de contas PCBR)', cols: ['Conta', 'Texto breve', 'Tipo'], linhas: () => app.db.contas.map(c => [c.saknr, c.txt, c.recon ? `Reconciliação ${c.recon === 'K' ? 'fornecedores' : 'clientes'}` : contaResultado(c) ? 'Resultado' : 'Balanço']) },
  fornecedor: { titulo: 'Fornecedores', cols: ['Fornecedor', 'Nome', 'Cidade'], linhas: () => app.db.fornecedores.map(f => [f.lifnr, f.nome, `${f.cidade}/${f.uf}`]) },
  cliente: { titulo: 'Clientes', cols: ['Cliente', 'Nome', 'Cidade'], linhas: () => app.db.clientes.map(c => [c.kunnr, c.nome, `${c.cidade}/${c.uf}`]) },
  motivo: { titulo: 'Motivos de estorno', cols: ['Motivo', 'Descrição'], linhas: () => Object.entries(MOTIVOS_ESTORNO) },
  zterm: { titulo: 'Condições de pagamento', cols: ['Cond.', 'Descrição'], linhas: () => Object.entries(COND_PGTO).map(([k, c]) => [k, c.txt]) },
  tabela: { titulo: 'Tabelas disponíveis', cols: ['Tabela', 'Descrição'], linhas: () => Object.entries(TABELAS).map(([k, t]) => [k, t.desc]) },
  doc: {
    titulo: 'Lista de documentos (empresa 1000)', cols: ['Nº documento', 'Exerc.', 'Tp', 'Data lçto.', 'Referência', 'Texto', 'Montante'],
    linhas: () => app.db.docs.slice().reverse().map(d => [d.belnr, String(d.gjahr), d.blart, fmtData(d.budat), d.xblnr, d.bktxt, fmtValor(r2(d.itens.filter(i => i.shkzg === 'S').reduce((s, i) => s + i.valor, 0)))])
  },
  tcode: { titulo: 'Transações disponíveis', cols: ['Transação', 'Descrição'], linhas: () => Object.values(TX).filter(t => t.tcode !== 'MENU').map(t => [t.tcode, t.nome || '']) }
};
function abrirF4(input) {
  const def = F4[input.dataset.f4];
  if (!def) return;
  const todas = def.linhas();
  const desenhar = (filtro) => {
    const f = filtro.toLowerCase();
    const ls = f ? todas.filter(l => l.some(c => String(c).toLowerCase().includes(f))) : todas;
    return { html: ls.map((l, i) => `<tr data-v="${esc(l[0])}">${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join(''), n: ls.length };
  };
  const ini = desenhar('');
  const el = popup({
    titulo: def.titulo, largura: 720,
    html: `<div class="f4busca"><span>Restringir:</span><input id="f4filtro" placeholder="digite parte do código ou do nome"><span class="desc" id="f4n">${ini.n} entradas encontradas</span></div><div class="f4lista"><table class="grid"><thead><tr>${def.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody id="f4corpo">${ini.html}</tbody></table></div><p class="nota">Duplo clique numa linha para copiar o valor para o campo.</p>`,
    botoes: [{ txt: 'Cancelar', ic: 'cancelar' }],
    aoAbrir: (el) => { $('#f4filtro', el).focus(); }
  });
  const escolher = v => {
    fecharPopup();
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  };
  $('#f4filtro', el).oninput = e => { const r = desenhar(e.target.value); $('#f4corpo', el).innerHTML = r.html; $('#f4n', el).textContent = `${r.n} entradas encontradas`; };
  $('#f4filtro', el).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const p = $('#f4corpo tr', el); if (p) escolher(p.dataset.v); } };
  $('#f4corpo', el).onclick = e => { const tr = e.target.closest('tr'); if (!tr) return; $$('#f4corpo tr', el).forEach(t => t.classList.remove('sel')); tr.classList.add('sel'); };
  $('#f4corpo', el).ondblclick = e => { const tr = e.target.closest('tr'); if (tr) escolher(tr.dataset.v); };
}

/* ---------- ajuda F1 ---------- */
function ajudaF1(el) {
  const k = el && el.dataset ? el.dataset.f1 : null;
  const a = k && AJUDA[k];
  if (!a) {
    popup({ titulo: 'Ajuda de desempenho', html: '<p>Posicione o cursor num campo de entrada e tecle F1 para ver a explicação dele.</p>', botoes: [{ txt: 'OK', ic: 'ok', padrao: true }] });
    return;
  }
  popup({
    titulo: 'Ajuda de desempenho', largura: 560,
    html: `<p><b>${esc(a.t)}</b></p><p>${esc(a.txt)}</p>${a.tec ? `<p class="tec">Informação técnica: campo ${esc(a.tec)}</p>` : ''}`,
    botoes: [{ txt: 'OK', ic: 'ok', padrao: true, acao: () => el.focus() }]
  });
}

/* ---------- download ---------- */
function baixarArquivo(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const b = new Blob(['﻿' + conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- lista ALV ---------- */
class ALV {
  constructor(el, cfg, estado) {
    this.el = el; this.cfg = cfg;
    this.e = estado || {};
    if (this.e.totais === undefined) this.e.totais = cfg.totais !== false;
    if (this.e.ordem === undefined) this.e.ordem = cfg.ordem || null;
    if (this.e.filtro === undefined) this.e.filtro = '';
    if (this.e.tecnico === undefined) this.e.tecnico = !!cfg.tecnico;
    this.sel = null; this.colSel = null;
    this.render();
  }
  fmt(c, v, l) {
    if (c.fmt) return c.fmt(v, l);
    if (c.tipo === 'valor') return fmtValor(v);
    if (c.tipo === 'data') return fmtData(v);
    return esc(v ?? '');
  }
  txt(c, v, l) {
    if (c.txt) return c.txt(v, l);
    if (c.tipo === 'valor') return fmtValor(v);
    if (c.tipo === 'data') return fmtData(v);
    return String(v ?? '');
  }
  visiveis() {
    let ls = this.cfg.linhas.map((l, i) => ({ l, i }));
    const f = this.e.filtro.toLowerCase();
    if (f) ls = ls.filter(({ l }) => this.cfg.colunas.some(c => this.txt(c, l[c.k], l).toLowerCase().includes(f)));
    if (this.e.ordem) { const { k, dir } = this.e.ordem; ls.sort((a, b) => cmp(a.l[k], b.l[k]) * dir || a.i - b.i); }
    if (this.cfg.grupo) { const g = this.cfg.grupo; ls.sort((a, b) => cmp(a.l[g], b.l[g])); }
    return ls.map(x => x.l);
  }
  render() {
    const cols = this.cfg.colunas, ls = this.visiveis(); this._ls = ls;
    const somaCols = cols.some(c => c.soma);
    const num = c => c.tipo === 'valor' || c.tipo === 'num';
    const linha = (l, i) => `<tr data-i="${i}">${cols.map(c => `<td data-k="${c.k}" class="${num(c) ? 'num' : ''} ${c.tipo === 'icone' ? 'ic' : ''} ${c.lk ? 'lk' : ''}">${this.fmt(c, l[c.k], l)}</td>`).join('')}</tr>`;
    const primeiraSoma = Math.max(1, cols.findIndex(c => c.soma));
    // o rótulo ocupa as colunas antes do primeiro total, sem alargar a primeira coluna
    const tot = (rows, cls, rot) => `<tr class="${cls}"><td colspan="${primeiraSoma}"><div style="width:0;overflow:visible;white-space:nowrap">${rot}</div></td>${cols.slice(primeiraSoma).map(c => c.soma
      ? `<td class="num">${fmtValor(r2(rows.reduce((a, l) => a + (Number(l[c.k]) || 0), 0)))}</td>` : '<td></td>').join('')}</tr>`;
    let body = '';
    if (this.cfg.grupo && this.e.totais && somaCols) {
      let atual = null, bloco = [];
      const fecha = () => { if (bloco.length) body += tot(bloco, 'sub', `• ${esc(this.cfg.rotGrupo ? this.cfg.rotGrupo(atual, bloco[0]) : atual)}`); };
      ls.forEach((l, i) => { const g = l[this.cfg.grupo]; if (g !== atual) { fecha(); atual = g; bloco = []; } bloco.push(l); body += linha(l, i); });
      fecha();
    } else ls.forEach((l, i) => { body += linha(l, i); });
    if (this.e.totais && somaCols && ls.length) body += tot(ls, 'tot', 'Σ Total');
    if (!ls.length) body = `<tr><td colspan="${cols.length}" style="padding:10px;color:var(--muted)">Nenhuma linha foi selecionada.</td></tr>`;
    const tb = [
      this.cfg.duplo ? ['det', 'lupa', 'Detalhe'] : null,
      ['asc', 'asc', 'Classif. crescente'], ['desc', 'desc', 'Classif. decrescente'],
      ['fil', 'filtro', this.e.filtro ? 'Filtro ativo' : 'Filtro'],
      somaCols ? ['tot', 'soma', 'Total'] : null,
      this.cfg.temTecnico ? ['tec', 'tecnico', this.e.tecnico ? 'Descrições' : 'Nomes técnicos'] : null,
      ['csv', 'exportar', 'Planilha']
    ].filter(Boolean);
    this.el.innerHTML = `<div class="alv"><div class="alv-tb">${tb.map(([id, ic, t]) => `<button data-a="${id}" class="${(id === 'tot' && this.e.totais) || (id === 'fil' && this.e.filtro) ? 'on' : ''}" title="${esc(t)}">${icone(ic)}<span>${esc(t)}</span></button>`).join('')}</div>
      <div class="alv-wrap"><table class="grid"><thead><tr>${cols.map(c => `<th data-k="${c.k}" class="${num(c) ? 'num' : ''} ${this.colSel === c.k ? 'colsel' : ''}" title="${esc((c.tec ? c.tec + ': ' : '') + (c.desc || c.t))}">${esc(this.e.tecnico && c.tec ? c.tec : c.t)}${this.e.ordem && this.e.ordem.k === c.k ? (this.e.ordem.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="alv-rod">${ls.length} ${ls.length === 1 ? 'linha' : 'linhas'}${this.e.filtro ? ` com o filtro "${esc(this.e.filtro)}"` : ''}${this.cfg.rodape ? ' · ' + this.cfg.rodape : ''}. Clique no título de uma coluna para selecioná-la; duplo clique numa linha para abrir.</div></div>`;
    $$('th', this.el).forEach(th => th.onclick = () => { this.colSel = th.dataset.k; $$('th', this.el).forEach(t => t.classList.toggle('colsel', t === th)); });
    $$('th', this.el).forEach(th => th.ondblclick = () => { const k = th.dataset.k; this.e.ordem = { k, dir: this.e.ordem && this.e.ordem.k === k ? -this.e.ordem.dir : 1 }; this.colSel = k; this.render(); });
    const tbody = $('tbody', this.el);
    tbody.onclick = e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; $$('tr.sel', tbody).forEach(t => t.classList.remove('sel')); tr.classList.add('sel'); this.sel = this._ls[+tr.dataset.i]; };
    tbody.ondblclick = e => { const tr = e.target.closest('tr[data-i]'); if (!tr || !this.cfg.duplo) return; const td = e.target.closest('td'); this.cfg.duplo(this._ls[+tr.dataset.i], td ? td.dataset.k : null); };
    $$('.alv-tb button', this.el).forEach(b => b.onclick = () => this.acao(b.dataset.a));
  }
  acao(a) {
    if (a === 'det') { if (!this.sel) { msg('W', 'Selecione uma linha primeiro (um clique na linha).'); return; } this.cfg.duplo(this.sel, null); return; }
    if (a === 'asc' || a === 'desc') {
      if (!this.colSel) { msg('W', 'Selecione primeiro uma coluna: clique no título dela.'); return; }
      this.e.ordem = { k: this.colSel, dir: a === 'asc' ? 1 : -1 }; this.render(); return;
    }
    if (a === 'tot') { this.e.totais = !this.e.totais; this.render(); return; }
    if (a === 'tec') { this.e.tecnico = !this.e.tecnico; this.render(); return; }
    if (a === 'fil') {
      const el = popup({
        titulo: 'Definir filtro', largura: 440,
        html: `<p>Mostrar só as linhas que contêm o texto:</p><input id="alvf" value="${esc(this.e.filtro)}" style="width:100%;height:26px;border:1px solid var(--fb);padding:0 6px;font:13px var(--font)"><p class="nota">Deixe vazio para remover o filtro. Vale para qualquer coluna (conta, texto, número do documento, valor).</p>`,
        botoes: [{ txt: 'Aplicar', ic: 'ok', padrao: true, acao: () => { this.e.filtro = this._f || ''; this.render(); } }, { txt: 'Remover filtro', acao: () => { this.e.filtro = ''; this.render(); } }, { txt: 'Cancelar', ic: 'cancelar' }],
        aoAbrir: el => { const i = $('#alvf', el); i.focus(); i.select(); }
      });
      this._f = this.e.filtro;
      $('#alvf', el).oninput = e => { this._f = e.target.value.trim(); };
      return;
    }
    if (a === 'csv') {
      const cols = this.cfg.colunas.filter(c => c.tipo !== 'icone' || c.txt);
      const linhas = [cols.map(c => c.t).join(';')].concat(this._ls.map(l => cols.map(c => `"${this.txt(c, l[c.k], l).replace(/"/g, '""')}"`).join(';')));
      baixarArquivo(this.cfg.arquivo || 'lista.csv', linhas.join('\r\n'));
      msg('S', `Lista exportada para ${this.cfg.arquivo || 'lista.csv'} (abre no Excel).`);
    }
  }
}
