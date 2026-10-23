'use strict';
/* Casca do simulador: navegação entre transações, campo de comando, teclado, menu e guia do aluno. */

const app = {
  db: null, ctx: null, pilha: [], hist: [],
  guiaAberta: true, abaGuia: 'tx',
  menuAberto: new Set(['Favoritos', 'Menu', 'Menu/Finanças', 'Menu/Finanças/Contabilidade financeira', 'Menu/Finanças/Contabilidade financeira/Razão']),
  menuSel: null,
  chamar(tc, params) { lerCampos(app.ctx); app.pilha.push(app.ctx); app.ctx = iniciarCtx(tc, params); render(); },
  evento(nome) { app.db.progresso.eventos[nome] = true; salvarDB(app.db); checarMissoes(); },
  depoisDeGravar() { checarMissoes(); }
};

const MENU = [
  { t: 'Favoritos', f: ['FB50', 'FB03', 'FBL3N', 'FS10N', 'SE16N'] },
  { t: 'Menu', f: [
    { t: 'Finanças', f: [
      { t: 'Contabilidade financeira', f: [
        { t: 'Razão', f: [
          { t: 'Lançamento', f: ['FB50'] },
          { t: 'Documento', f: ['FB03', 'FB08', 'FBRA'] },
          { t: 'Conta', f: ['FS10N', 'FBL3N'] },
          { t: 'Dados mestre', f: ['FS00'] },
          { t: 'Sistema de informação', f: ['S_ALR_87012277', 'F.01'] }
        ] },
        { t: 'Contas a pagar (fornecedores)', f: [
          { t: 'Lançamento', f: ['FB60', 'F-53'] },
          { t: 'Conta', f: ['FK10N', 'FBL1N'] },
          { t: 'Dados mestre', f: ['FK01', 'FK02', 'FK03'] }
        ] },
        { t: 'Contas a receber (clientes)', f: [
          { t: 'Lançamento', f: ['FB70', 'F-28'] },
          { t: 'Conta', f: ['FD10N', 'FBL5N'] },
          { t: 'Dados mestre', f: ['FD01', 'FD02', 'FD03'] }
        ] },
        { t: 'Ambiente', f: [{ t: 'Configuração atual', f: ['OB52'] }] }
      ] }
    ] },
    { t: 'Ferramentas', f: [{ t: 'Workbench ABAP', f: [{ t: 'Visão geral', f: ['SE16N'] }] }] }
  ] }
];

/* ---------- tela inicial (Easy Access) ---------- */
defTx('MENU', {
  nome: 'Menu Easy Access',
  titulo: 'Menu Easy Access',
  render() {
    const feitas = MISSOES.filter(m => app.db.progresso.missoes[m.id]).length;
    return `<div class="home"><div class="arvore" id="arvore">${arvoreHTML(MENU, 0, '')}</div>
      <div class="boasvindas"><h2>Simulador de Contabilidade Financeira (FI)</h2>
      <p>Empresa <b>1000 ${esc(app.db.empresa.nome)}</b>, exercício 2026, com lançamentos de janeiro a outubro. Data do sistema: <b>${hojeBR()}</b>. Usuário: <b>ALUNO</b>.</p>
      <ol><li>Dê duplo clique numa transação do menu ao lado, ou</li><li>digite o código no campo de comando lá em cima (ex.: <b>FB03</b>) e tecle Enter.</li><li>Para ir de uma transação para outra, use <b>/n</b> antes do código (ex.: <b>/nFBL3N</b>).</li></ol>
      <p><b>Atalhos de teclado</b></p>
      <div class="atalhos"><kbd>Enter</kbd><span>confirma a tela</span><kbd>F8</kbd><span>executa (relatórios e listas)</span><kbd>Ctrl+S</kbd><span>grava</span><kbd>F3</kbd><span>volta uma tela</span><kbd>Shift+F3</kbd><span>sai da transação</span><kbd>F4</kbd><span>lista de valores do campo</span><kbd>F1</kbd><span>explica o campo</span><kbd>Esc</kbd><span>cancela / fecha janela</span><kbd>Ctrl+/</kbd><span>vai para o campo de comando</span></div>
      <p style="margin-top:12px">Missões concluídas: <b>${feitas} de ${MISSOES.length}</b>. <button class="lnk" id="verMissoes">Ver a trilha de missões</button></p>
      <p class="nota">Tudo o que você lança fica salvo neste navegador. Para recomeçar do zero: menu Sistema → Restaurar base de dados.</p></div></div>`;
  },
  depois() {
    const arv = $('#arvore');
    arv.onclick = e => {
      const n = e.target.closest('.no'); if (!n) return;
      if (n.dataset.id) { const id = n.dataset.id; app.menuAberto.has(id) ? app.menuAberto.delete(id) : app.menuAberto.add(id); render(); return; }
      app.menuSel = n.dataset.tc; $$('.no.sel', arv).forEach(x => x.classList.remove('sel')); n.classList.add('sel');
    };
    arv.ondblclick = e => { const n = e.target.closest('.no.folha'); if (n) abrirTx(n.dataset.tc); };
    const vm = $('#verMissoes'); if (vm) vm.onclick = () => { app.guiaAberta = true; app.abaGuia = 'missoes'; renderGuia(); };
  },
  botoes: () => [{ txt: 'Restaurar base de dados', ic: 'estornar', acao: () => restaurarBase() }],
  enter() { if (app.menuSel) abrirTx(app.menuSel); }
});
function arvoreHTML(nos, nivel, caminho) {
  return nos.map(n => {
    const ind = `style="padding-left:${nivel * 20 + 6}px"`;
    if (typeof n === 'string') {
      const t = TX[n];
      return `<div class="no folha ${app.menuSel === n ? 'sel' : ''}" data-tc="${n}" ${ind}><span class="seta"></span>${icone('tx')}<span class="tc">${n}</span><span>${esc(t ? t.nome : '')}</span></div>`;
    }
    const id = caminho ? caminho + '/' + n.t : n.t, ab = app.menuAberto.has(id);
    return `<div class="no pasta" data-id="${esc(id)}" ${ind}><span class="seta">${ab ? '▼' : '▶'}</span>${icone(ab ? 'pastaAberta' : 'pasta')}<span>${esc(n.t)}</span></div>${ab ? arvoreHTML(n.f, nivel + 1, id) : ''}`;
  }).join('');
}

/* ---------- navegação ---------- */
function iniciarCtx(tc, params) {
  const tx = TX[tc];
  const ctx = { tcode: tc, tx, passo: 'ini', passos: [], v: {}, s: {} };
  Object.assign(ctx.v, tx.padrao ? tx.padrao() : {}, params || {});
  // quem chama ir() já leu os campos da tela (acaoTx e botões); ler de novo apagaria valores definidos na transição
  ctx.ir = p => { ctx.passos.push(ctx.passo); ctx.passo = p; render(); };
  if (tx.iniciar) tx.iniciar(ctx, params || {});
  return ctx;
}
function abrirTx(tc) {
  app.pilha = [];
  app.ctx = iniciarCtx(tc);
  if (tc !== 'MENU') { app.hist = [tc, ...app.hist.filter(x => x !== tc)].slice(0, 15); $('#histCmd').innerHTML = app.hist.map(h => `<option value="${h}">`).join(''); }
  render();
}
function voltar() {
  const ctx = app.ctx;
  if (ctx.passos.length) { ctx.passo = ctx.passos.pop(); render(); return; }
  sairTx();
}
function sairTx() {
  if (app.pilha.length) { app.ctx = app.pilha.pop(); render(); return; }
  if (app.ctx.tcode !== 'MENU') abrirTx('MENU');
}
function lerCampos(ctx) {
  if (!ctx || app.ctx !== ctx) return;
  $$('#tela [data-k]').forEach(i => {
    if (i.type === 'checkbox') ctx.v[i.dataset.k] = i.checked;
    else if (i.type === 'radio') { if (i.checked) ctx.v[i.dataset.k] = i.value; }
    else ctx.v[i.dataset.k] = i.value;
  });
}
function executarComando(texto) {
  const cmd = $('#cmd');
  let t = String(texto || '').trim().toUpperCase();
  cmd.value = '';
  if (!t) { acaoTx('enter'); return; }
  limparMsg();
  if (t === '/N' || t === '/NEND' || t === '/NEX') { abrirTx('MENU'); if (t !== '/N') msg('I', 'No simulador não há logoff: você voltou ao menu.'); return; }
  let novo = false;
  if (t.startsWith('/N') || t.startsWith('/O')) { novo = true; if (t.startsWith('/O')) msg('I', 'O simulador tem uma sessão só: a transação abriu nesta janela.'); t = t.slice(2); }
  if (!TX[t] || t === 'MENU') { msg('E', `A transação ${t} não existe no simulador. Tecle F4 no campo de comando para ver as disponíveis.`); return; }
  if (app.ctx.tcode !== 'MENU' && !novo) { msg('E', `Função ${t} não é possível aqui. Para trocar de transação, digite /n${t}.`); return; }
  abrirTx(t);
}

/* ---------- desenho ---------- */
function render() {
  const ctx = app.ctx, tx = ctx.tx;
  $('#titulo').textContent = typeof tx.titulo === 'function' ? tx.titulo(ctx) : tx.titulo;
  const bts = tx.botoes ? tx.botoes(ctx) : [];
  const atb = $('#apptoolbar');
  atb.innerHTML = bts.map((b, i) => `<button class="atb" data-i="${i}" title="${esc(b.txt)}${b.tecla ? ' (' + b.tecla + ')' : ''}">${b.ic ? icone(b.ic) : ''}<span>${esc(b.txt)}</span>${b.tecla ? `<small>${esc(b.tecla)}</small>` : ''}</button>`).join('');
  $$('.atb', atb).forEach(el => el.onclick = () => { limparMsg(); lerCampos(ctx); bts[+el.dataset.i].acao(ctx); });
  const tela = $('#tela');
  tela.innerHTML = tx.render(ctx);
  tela.scrollTop = 0;
  if (tx.depois) tx.depois(ctx, tela);
  ligarCampos(tela);
  $('#sysinfo').innerHTML = `<span>EDU (1) 100</span><span>Transação <b>${esc(ctx.tcode === 'MENU' ? 'SMEN' : ctx.tcode)}</b></span><span>${esc(SIM.usuario)}</span><span>${hojeBR()}</span>`;
  if (ctx.tcode === 'MENU') $('#cmd').focus();
  else {
    const alvo = $$('#tela input[data-k]:not([readonly]):not(:disabled), #tela table.edit input').find(i => i.dataset.obrig && !i.value) || $('#tela input[data-k]:not([readonly]):not(:disabled)');
    if (alvo) alvo.focus();
  }
  renderGuia();
}
function ligarCampos(root) {
  $$('.f4btn', root).forEach(b => b.onclick = e => { e.preventDefault(); abrirF4(b.parentElement.querySelector('input')); });
  $$('input[data-desc]', root).forEach(i => {
    const d = $(`#d_${i.dataset.k}`);
    const atu = () => { if (d) d.textContent = descDe(i.dataset.desc, i.value); };
    i.addEventListener('change', atu); i.addEventListener('blur', atu);
  });
  $$('input.erro', root).forEach(i => i.addEventListener('input', () => i.classList.remove('erro'), { once: true }));
}
function acaoTx(nome) {
  const ctx = app.ctx, f = ctx.tx[nome];
  limparMsg();
  lerCampos(ctx);
  if (f) { f(ctx); return; }
  if (nome === 'enter') { render(); return; }
  if (nome === 'f8') { msg('W', 'F8 (Executar) não está disponível nesta tela.'); return; }
  if (nome === 'gravar') msg('W', 'Não há nada para gravar nesta tela.');
}

/* ---------- guia do aluno ---------- */
function renderGuia() {
  const g = $('#guia');
  $('#btnGuia').classList.toggle('on', app.guiaAberta);
  if (!app.guiaAberta) { g.classList.add('fechada'); return; }
  g.classList.remove('fechada');
  const tc = app.ctx ? app.ctx.tcode : 'MENU';
  const feitas = MISSOES.filter(m => app.db.progresso.missoes[m.id]).length;
  let corpo = '';
  if (app.abaGuia === 'tx') {
    const gi = GUIA[GUIA_ALIAS[tc] || tc];
    const t = TX[tc];
    if (!gi) corpo = '<p>Sem guia para esta tela.</p>';
    else corpo = `<h3><span class="g-tc">${esc(tc === 'MENU' ? 'SMEN' : tc)}</span>${esc(t.nome)}</h3>
      <p>${esc(gi.oque)}</p>
      ${gi.quando ? `<h3>Quando usar</h3><p>${esc(gi.quando)}</p>` : ''}
      ${gi.passos ? `<h3>Passo a passo</h3><ol>${gi.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
      ${gi.conferir ? `<h3>Como conferir os números</h3><ul>${gi.conferir.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${gi.tabelas ? `<div class="g-caixa"><b>Por trás da tela:</b> ${esc(gi.tabelas)}</div>` : ''}
      ${t.prog ? `<p class="nota">Programa no SAP: ${esc(t.prog)} (menu Sistema → Status).</p>` : ''}`;
  } else {
    corpo = `<p>Concluídas: <b>${feitas} de ${MISSOES.length}</b></p><div class="g-prog"><i style="width:${Math.round(feitas / MISSOES.length * 100)}%"></i></div>
      ${MISSOES.map((m, i) => {
        const ok = !!app.db.progresso.missoes[m.id];
        return `<div class="mis ${ok ? 'feita' : ''}"><div class="mis-cab"><span class="mis-n">${ok ? '✓' : i + 1}</span><b>${esc(m.titulo)}</b></div>
          <p>${esc(m.texto)}</p>
          ${!ok ? `<button class="lnk" data-ir="${m.tx}">Abrir ${esc(m.tx)}</button>` : ''}
          ${m.tipo === 'resposta' && !ok ? `<div class="mis-resp"><input id="resp_${m.id}" placeholder="${esc(m.ph || 'sua resposta')}"><button class="btn" data-conf="${m.id}">Conferir</button></div><div class="mis-fb" id="fb_${m.id}"></div>` : ''}
          ${!ok ? `<details><summary>Dica</summary>${esc(m.dica)}</details>` : ''}</div>`;
      }).join('')}`;
  }
  g.innerHTML = `<div class="g-cab"><b>${icone('livro')} Guia do aluno</b><button title="Fechar o guia">×</button></div>
    <div class="g-abas"><div data-ga="tx" class="${app.abaGuia === 'tx' ? 'ativa' : ''}">Esta tela</div><div data-ga="missoes" class="${app.abaGuia === 'missoes' ? 'ativa' : ''}">Missões (${feitas}/${MISSOES.length})</div></div>
    <div class="g-corpo">${corpo}<div class="g-rodape">Simulador educacional independente, sem vínculo com a SAP SE. SAP e S/4HANA são marcas registradas da SAP SE. Telas, dados e empresa são fictícios e simplificados para estudo.</div></div>`;
  $('.g-cab button', g).onclick = () => { app.guiaAberta = false; renderGuia(); };
  $$('[data-ga]', g).forEach(a => a.onclick = () => { app.abaGuia = a.dataset.ga; renderGuia(); });
  $$('[data-ir]', g).forEach(b => b.onclick = () => abrirTx(b.dataset.ir));
  $$('[data-conf]', g).forEach(b => {
    const m = MISSOES.find(x => x.id === b.dataset.conf);
    const inpR = $(`#resp_${m.id}`, g);
    const conferir = () => {
      if (conferirResposta(m, inpR.value)) { concluirMissao(m); return; }
      const fb = $(`#fb_${m.id}`, g); fb.className = 'mis-fb nao'; fb.textContent = 'Ainda não. Confira de novo no sistema (a dica ajuda).';
    };
    b.onclick = conferir;
    inpR.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); conferir(); } });
  });
}
function concluirMissao(m) {
  app.db.progresso.missoes[m.id] = true;
  salvarDB(app.db);
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<b>Missão concluída: ${esc(m.titulo)}</b><br>${MISSOES.filter(x => app.db.progresso.missoes[x.id]).length} de ${MISSOES.length} na trilha.`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4200);
  renderGuia();
}
function checarMissoes() {
  MISSOES.forEach(m => { if (m.tipo === 'acao' && !app.db.progresso.missoes[m.id] && m.checar(app.db)) concluirMissao(m); });
}

/* ---------- menu suspenso ---------- */
function restaurarBase() {
  confirmar('Restaurar base de dados', 'Isso apaga tudo o que você lançou e o progresso das missões, e volta a empresa ao estado original de 20.10.2026. Continuar?', () => {
    app.db = novaBase(); abrirTx('MENU'); msg('S', 'A base de dados foi restaurada ao estado original.');
  }, 'Restaurar');
}
function statusSistema() {
  const ctx = app.ctx;
  popup({
    titulo: 'Status do sistema', largura: 520,
    html: `<table class="grid"><tbody>
      <tr><td>Usuário</td><td>${SIM.usuario}</td></tr><tr><td>Mandante</td><td>100</td></tr><tr><td>Sistema</td><td>EDU (simulador)</td></tr>
      <tr><td>Transação</td><td>${esc(ctx.tcode === 'MENU' ? 'SMEN' : ctx.tcode)}</td></tr><tr><td>Programa</td><td>${esc(ctx.tx.prog || '-')}</td></tr>
      <tr><td>Data do sistema</td><td>${hojeBR()}</td></tr><tr><td>Documentos na base</td><td>${app.db.docs.length}</td></tr></tbody></table>
      <p class="nota">No SAP real, Sistema → Status é o jeito de descobrir o código da transação e o programa de qualquer tela.</p>`,
    botoes: [{ txt: 'OK', ic: 'ok', padrao: true }]
  });
}
function menuSuspenso(el, itens) {
  fecharSuspenso();
  const r = el.getBoundingClientRect();
  const dd = document.createElement('div');
  dd.className = 'dd'; dd.id = 'dd';
  dd.style.left = r.left + 'px'; dd.style.top = r.bottom + 'px';
  dd.innerHTML = itens.map((it, i) => it ? `<div data-i="${i}">${esc(it[0])}</div>` : '<hr>').join('');
  document.body.appendChild(dd);
  el.classList.add('ativo');
  dd.onclick = e => { const d = e.target.closest('[data-i]'); if (!d) return; fecharSuspenso(); itens[+d.dataset.i][1](); };
  setTimeout(() => document.addEventListener('click', fecharSuspenso, { once: true }), 0);
}
function fecharSuspenso() { const d = $('#dd'); if (d) d.remove(); $$('.mb-item.ativo').forEach(x => x.classList.remove('ativo')); }
const MENUS_BARRA = {
  menu: () => [['Menu Easy Access (/n)', () => abrirTx('MENU')], ['Lista de transações (F4)', () => abrirF4($('#cmd'))]],
  editar: () => [['Cancelar (Esc)', () => voltar()], ['Voltar (F3)', () => voltar()], ['Sair da transação (Shift+F3)', () => sairTx()]],
  favoritos: () => MENU[0].f.map(tc => [`${tc}  ${TX[tc].nome}`, () => abrirTx(tc)]),
  sistema: () => [['Status...', () => statusSistema()], null, ['Exportar base de dados (JSON)', () => baixarArquivo('simulador-fi-base.json', JSON.stringify(app.db, null, 1), 'application/json')], ['Restaurar base de dados', () => restaurarBase()]],
  ajuda: () => [['Guia do aluno', () => { app.guiaAberta = true; app.abaGuia = 'tx'; renderGuia(); }], ['Trilha de missões', () => { app.guiaAberta = true; app.abaGuia = 'missoes'; renderGuia(); }], ['Ajuda do campo (F1)', () => ajudaF1(document.activeElement)]]
};

/* ---------- teclado ---------- */
document.addEventListener('keydown', e => {
  const k = e.key;
  if (popupAtual) {
    if (k === 'Escape') { e.preventDefault(); fecharPopup(); }
    else if (k === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); popupPadrao(); }
    else if (k === 'F1' || k === 'F3' || k === 'F4' || k === 'F8' || k === 'F12') e.preventDefault();
    return;
  }
  if (e.target.closest && e.target.closest('#guia')) return;
  if (k === 'F1') { e.preventDefault(); ajudaF1(document.activeElement); return; }
  if (k === 'F4') { e.preventDefault(); const a = document.activeElement; if (a && a.dataset && a.dataset.f4) abrirF4(a); else msg('W', 'Este campo não tem ajuda de pesquisa (F4).'); return; }
  if (k === 'F3' && e.shiftKey) { e.preventDefault(); limparMsg(); sairTx(); return; }
  if (k === 'F3' || k === 'F12' || k === 'Escape') { e.preventDefault(); limparMsg(); voltar(); return; }
  if (k === 'F8') { e.preventDefault(); acaoTx('f8'); return; }
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's') { e.preventDefault(); acaoTx('gravar'); return; }
  if (e.ctrlKey && k === '/') { e.preventDefault(); $('#cmd').focus(); return; }
  if (k === 'Enter') {
    if (e.target.id === 'cmd') { e.preventDefault(); executarComando(e.target.value); return; }
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault(); acaoTx('enter');
  }
});

/* ---------- início ---------- */
function iniciar() {
  app.db = carregarDB();
  try { const g = localStorage.getItem('simulador-fi-guia'); if (g === '0') app.guiaAberta = false; } catch (e) { /* sem armazenamento */ }
  $('#btnEnter').onclick = () => executarComando($('#cmd').value);
  $('#btnSave').onclick = () => acaoTx('gravar');
  $('#btnBack').onclick = () => { limparMsg(); voltar(); };
  $('#btnExit').onclick = () => { limparMsg(); sairTx(); };
  $('#btnCancel').onclick = () => { limparMsg(); voltar(); };
  $('#btnF8').onclick = () => acaoTx('f8');
  $('#btnGuia').onclick = () => { app.guiaAberta = !app.guiaAberta; try { localStorage.setItem('simulador-fi-guia', app.guiaAberta ? '1' : '0'); } catch (e) { /* ignora */ } renderGuia(); };
  $$('.mb-item[data-m]').forEach(el => el.onclick = e => { e.stopPropagation(); menuSuspenso(el, MENUS_BARRA[el.dataset.m]()); });
  const ini = decodeURIComponent(location.hash.slice(1)).toUpperCase();
  abrirTx(TX[ini] ? ini : 'MENU');
}
document.addEventListener('DOMContentLoaded', iniciar);
