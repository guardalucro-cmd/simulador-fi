'use strict';
/* Transações de FI. Cada uma tem passos (telas): 'ini' é a tela de seleção. */

const hojeBR = () => fmtData(SIM.hoje);
const nomeEmpresa = () => app.db.empresa.nome;
function exigir(ctx, campos) {
  for (const [k, rot] of campos) {
    if (!String(ctx.v[k] ?? '').trim()) { msg('E', `Preencha o campo obrigatório "${rot}".`); marcarErro(k); return false; }
  }
  return true;
}
function dataCampo(ctx, k, rot) {
  const d = parseData(ctx.v[k]);
  if (!d) { msg('E', `${rot}: data inválida. Use o formato DD.MM.AAAA (ex.: ${hojeBR()}).`); marcarErro(k); return null; }
  return d;
}
function sucessoDoc(belnr, gjahr, extra = '') {
  msg('S', `Documento ${belnr} foi lançado na empresa ${app.db.empresa.bukrs}${extra}`, { acao: () => app.chamar('FB03', { belnr, gjahr: String(gjahr), auto: true }), dicaAcao: 'Clique para abrir o documento no FB03' });
}

/* =================== Itens editáveis (FB50, FB60, FB70) =================== */
function novasLinhas(n, dc) { return Array.from({ length: n }, () => ({ hkont: '', dc, valor: '', sgtxt: '', zuonr: '' })); }
function stLinha(l) {
  const preenchida = String(l.hkont).trim() || String(l.valor).trim();
  if (!preenchida) return '';
  const ok = acharConta(app.db, l.hkont) && parseValor(l.valor) > 0;
  return ok ? icone('luzVerde') : icone('luzVermelha');
}
function gradeHTML(ctx) {
  return `<table class="grid edit" id="grade"><thead><tr><th>St</th><th>Conta do Razão</th><th>Descrição breve</th><th>D/C</th><th class="num">Montante em moeda doc.</th><th>Texto do item</th><th>Atribuição</th></tr></thead><tbody>${ctx.s.linhas.map((l, i) => `<tr data-l="${i}">
    <td class="st">${stLinha(l)}</td>
    <td><span class="inpw temf4"><input data-c="hkont" data-f4="conta" data-f1="hkont" value="${esc(l.hkont)}" style="width:12ch" maxlength="10" autocomplete="off"><button class="f4btn" tabindex="-1" title="F4">${icone('f4')}</button></span></td>
    <td class="dsc">${esc(descDe('conta', l.hkont))}</td>
    <td><select data-c="dc" data-f1="dc"><option value="S" ${l.dc === 'S' ? 'selected' : ''}>Débito</option><option value="H" ${l.dc === 'H' ? 'selected' : ''}>Crédito</option></select></td>
    <td><input data-c="valor" data-tipo="valor" data-f1="wrbtr" value="${esc(l.valor)}" style="width:17ch;text-align:right" autocomplete="off"></td>
    <td><input data-c="sgtxt" data-f1="sgtxt" value="${esc(l.sgtxt)}" style="width:30ch" maxlength="50" autocomplete="off"></td>
    <td><input data-c="zuonr" data-f1="zuonr" value="${esc(l.zuonr)}" style="width:15ch" maxlength="18" autocomplete="off"></td></tr>`).join('')}</tbody></table>
    <div class="gradebts"><button class="btn" data-g="mais">${icone('mais')}Inserir linhas</button><button class="btn" data-g="limpar">${icone('menos')}Apagar linhas vazias</button></div>`;
}
function lerGrade(ctx) {
  $$('#grade tbody tr').forEach(tr => { const l = ctx.s.linhas[+tr.dataset.l]; $$('[data-c]', tr).forEach(i => { l[i.dataset.c] = i.value; }); });
}
function totaisGrade(ctx) {
  let d = 0, c = 0;
  for (const l of ctx.s.linhas) { const v = parseValor(l.valor); if (isNaN(v)) continue; if (l.dc === 'S') d += v; else c += v; }
  return { d: r2(d), c: r2(c) };
}
function linhasPreenchidas(ctx) {
  return ctx.s.linhas.map((l, i) => ({ ...l, n: i + 1 })).filter(l => String(l.hkont).trim() || String(l.valor).trim());
}
function ligarGrade(ctx, atualizar) {
  const g = $('#grade');
  if (!g) return;
  g.addEventListener('input', () => { lerGrade(ctx); atualizar(); });
  g.addEventListener('change', e => {
    lerGrade(ctx);
    const tr = e.target.closest('tr');
    if (tr) { const l = ctx.s.linhas[+tr.dataset.l]; $('.dsc', tr).textContent = descDe('conta', l.hkont); $('.st', tr).innerHTML = stLinha(l); }
    atualizar();
  });
  $$('[data-g]').forEach(b => b.onclick = () => {
    lerGrade(ctx);
    if (b.dataset.g === 'mais') ctx.s.linhas.push(...novasLinhas(4, ctx.s.dcPadrao || 'S'));
    else { ctx.s.linhas = ctx.s.linhas.filter(l => String(l.hkont).trim() || String(l.valor).trim()); while (ctx.s.linhas.length < 2) ctx.s.linhas.push(...novasLinhas(1, ctx.s.dcPadrao || 'S')); }
    render();
  });
}
function itensDaGrade(ctx, erros) {
  return linhasPreenchidas(ctx).map(l => {
    const v = parseValor(l.valor);
    if (!String(l.hkont).trim()) erros.push(`Item ${l.n}: informe a conta do Razão.`);
    if (isNaN(v)) erros.push(`Item ${l.n}: montante inválido. Use o formato 1.234,56.`);
    return { bschl: l.dc === 'S' ? '40' : '50', hkont: String(l.hkont).trim(), valor: v, sgtxt: l.sgtxt, zuonr: l.zuonr };
  });
}
function quadroSaldo(id, deb, cred, saldo, rotulos = ['Débitos', 'Créditos']) {
  const ok = Math.abs(saldo) < 0.005;
  return `<div class="saldo" id="${id}"><div><span>${rotulos[0]}</span><span class="r">${fmtValor(deb)}</span></div><div><span>${rotulos[1]}</span><span class="r">${fmtValor(cred)}</span></div><div class="linha-sld"><span>${ok ? icone('luzVerde') : icone('luzVermelha')} Saldo</span><span class="r">${fmtValor(saldo)}</span></div></div>`;
}
function previaDocumento(itens, titulo) {
  const db = app.db;
  popup({
    titulo, largura: 820,
    html: `<p>Assim o documento será gravado. Repare na chave de lançamento (CL): é ela que diz ao sistema o tipo de conta e o lado.</p>
      <table class="grid"><thead><tr><th>Itm</th><th>CL</th><th>Tipo</th><th>Conta</th><th>Descrição</th><th>D/C</th><th class="num">Montante</th><th>Texto</th></tr></thead><tbody>
      ${itens.map(it => `<tr><td>${pad(it.buzei, 3)}</td><td>${it.bschl}</td><td>${TIPOS_CONTA[it.koart]}</td><td>${esc(contaDoItem(it))}${it.koart !== 'S' ? ` <span class="desc">(Razão ${esc(it.hkont)})</span>` : ''}</td><td>${esc(nomeParceiro(db, it))}</td><td>${it.shkzg === 'S' ? 'Débito' : 'Crédito'}</td><td class="num">${fmtValor(it.shkzg === 'S' ? it.valor : -it.valor)}</td><td>${esc(it.sgtxt)}</td></tr>`).join('')}
      <tr class="tot"><td colspan="6">Σ Saldo</td><td class="num">${fmtValor(r2(itens.reduce((s, it) => s + (it.shkzg === 'S' ? it.valor : -it.valor), 0)))}</td><td></td></tr></tbody></table>`,
    botoes: [{ txt: 'Voltar à entrada', ic: 'voltar', padrao: true }]
  });
}

/* =================== FB50 =================== */
defTx('FB50', {
  nome: 'Entrar documento de conta do Razão', prog: 'SAPMF05A',
  titulo: 'Entrar documento de conta do Razão: Empresa 1000',
  padrao: () => ({ bldat: hojeBR(), budat: hojeBR(), xblnr: '', bktxt: '' }),
  iniciar(ctx) { ctx.s.linhas = novasLinhas(6, 'S'); ctx.s.dcPadrao = 'S'; },
  render(ctx) {
    const t = totaisGrade(ctx);
    return `<div class="lado">${grupo('Dados básicos',
      campo('bldat', 'Data do documento', ctx, { larg: 10, obrig: true }) +
      campo('budat', 'Data de lançamento', ctx, { larg: 10, obrig: true }) +
      campo('xblnr', 'Referência', ctx, { larg: 16, max: 16 }) +
      campo('bktxt', 'Texto de cabeçalho', ctx, { larg: 25, max: 25 }) +
      campoFixo('Empresa', '1000', nomeEmpresa()) + campoFixo('Moeda', 'BRL', 'Real brasileiro') + campoFixo('Tipo de documento', 'SA', TIPOS_DOC.SA))}
      ${quadroSaldo('qsaldo', t.d, t.c, r2(t.d - t.c))}</div>
      ${grupo('Itens', gradeHTML(ctx))}`;
  },
  depois(ctx) {
    ligarGrade(ctx, () => { const t = totaisGrade(ctx); $('#qsaldo').outerHTML = quadroSaldo('qsaldo', t.d, t.c, r2(t.d - t.c)); });
  },
  botoes: () => [
    { txt: 'Simular', ic: 'simular', acao: ctx => fb50Montar(ctx, true) },
    { txt: 'Gravar', ic: 'gravar', tecla: 'Ctrl+S', acao: ctx => fb50Montar(ctx, false) },
    { txt: 'Reiniciar', ic: 'novo', acao: ctx => { ctx.s.linhas = novasLinhas(6, 'S'); ctx.v.xblnr = ''; ctx.v.bktxt = ''; render(); } }
  ],
  enter(ctx) { lerGrade(ctx); render(); },
  gravar(ctx) { fb50Montar(ctx, false); }
});
function fb50Montar(ctx, simular) {
  lerGrade(ctx);
  const bldat = dataCampo(ctx, 'bldat', 'Data do documento'); if (!bldat) return;
  const budat = dataCampo(ctx, 'budat', 'Data de lançamento'); if (!budat) return;
  const erros = [];
  const linhas = itensDaGrade(ctx, erros);
  if (erros.length) { msgErros(erros); return; }
  linhas.forEach(l => { if (!l.sgtxt) l.sgtxt = ctx.v.bktxt; });
  const cab = { blart: 'SA', bldat, budat, xblnr: ctx.v.xblnr, bktxt: ctx.v.bktxt };
  const r = lancarDoc(app.db, cab, linhas, { simular });
  if (!r.ok) { msgErros(r.erros); return; }
  if (simular) { previaDocumento(r.itens, 'Simulação do documento SA'); msg('I', 'Simulação sem erros. O documento ainda não foi gravado.'); return; }
  salvarDB(app.db);
  ctx.s.linhas = novasLinhas(6, 'S'); ctx.v.xblnr = ''; ctx.v.bktxt = '';
  render();
  sucessoDoc(r.belnr, r.doc.gjahr);
  app.depoisDeGravar();
}

/* =================== FB60 / FB70 =================== */
function txFatura(tcode, tipo) {
  const K = tipo === 'K';
  defTx(tcode, {
    nome: K ? 'Entrar fatura de fornecedor' : 'Entrar fatura de cliente', prog: 'SAPMF05A',
    titulo: `${K ? 'Entrar fatura de fornecedor' : 'Entrar fatura de cliente'}: Empresa 1000`,
    padrao: () => ({ conta: '', bldat: hojeBR(), budat: hojeBR(), xblnr: '', wrbtr: '', sgtxt: '' }),
    iniciar(ctx) { ctx.s.dcPadrao = K ? 'S' : 'H'; ctx.s.linhas = novasLinhas(5, ctx.s.dcPadrao); },
    render(ctx) {
      const s = fatSaldo(ctx);
      return `<div class="lado">${grupo('Dados básicos',
        campo('conta', K ? 'Fornecedor' : 'Cliente', ctx, { larg: 10, obrig: true, f4: K ? 'fornecedor' : 'cliente', desc: K ? 'fornecedor' : 'cliente', f1: 'conta' }) +
        campo('bldat', 'Data da fatura', ctx, { larg: 10, obrig: true }) +
        campo('budat', 'Data de lançamento', ctx, { larg: 10, obrig: true }) +
        campo('xblnr', 'Referência (nº da nota)', ctx, { larg: 16, max: 16, obrig: K }) +
        campo('wrbtr', 'Montante', ctx, { larg: 16, obrig: true, tipo: 'valor' }) +
        campo('sgtxt', 'Texto', ctx, { larg: 40, max: 50 }) +
        `<div class="campo"><span class="rot">Vencimento</span><span id="infoVenc" class="desc">${esc(fatVenc(ctx, K))}</span></div>` +
        campoFixo('Tipo de documento', K ? 'KR' : 'DR', TIPOS_DOC[K ? 'KR' : 'DR']))}
        ${quadroSaldo('qsaldo', s.fat, s.itens, s.saldo, ['Montante da fatura', 'Distribuído nos itens'])}</div>
        ${grupo('Itens: contas do Razão', gradeHTML(ctx))}`;
    },
    depois(ctx) {
      const atu = () => { lerCamposSilencioso(ctx); const s = fatSaldo(ctx); $('#qsaldo').outerHTML = quadroSaldo('qsaldo', s.fat, s.itens, s.saldo, ['Montante da fatura', 'Distribuído nos itens']); $('#infoVenc').textContent = fatVenc(ctx, K); };
      ligarGrade(ctx, atu);
      ['conta', 'bldat', 'wrbtr'].forEach(k => { const i = $(`#f_${k}`); if (i) { i.addEventListener('input', atu); i.addEventListener('change', atu); } });
    },
    botoes: () => [
      { txt: 'Simular', ic: 'simular', acao: ctx => fatMontar(ctx, K, true) },
      { txt: 'Gravar', ic: 'gravar', tecla: 'Ctrl+S', acao: ctx => fatMontar(ctx, K, false) },
      { txt: 'Reiniciar', ic: 'novo', acao: ctx => { Object.assign(ctx.v, { conta: '', xblnr: '', wrbtr: '', sgtxt: '' }); ctx.s.linhas = novasLinhas(5, ctx.s.dcPadrao); render(); } }
    ],
    enter(ctx) { lerGrade(ctx); render(); },
    gravar(ctx) { fatMontar(ctx, K, false); }
  });
}
function lerCamposSilencioso(ctx) { lerCampos(ctx); }
function fatSaldo(ctx) {
  const fat = parseValor(ctx.v.wrbtr) || 0, t = totaisGrade(ctx);
  const K = ctx.s.dcPadrao === 'S';
  const itens = K ? r2(t.d - t.c) : r2(t.c - t.d);
  return { fat: r2(fat), itens, saldo: r2(itens - fat) };
}
function fatVenc(ctx, K) {
  const p = K ? acharFornecedor(app.db, ctx.v.conta) : acharCliente(app.db, ctx.v.conta);
  const d = parseData(ctx.v.bldat);
  if (!p) return 'Informe o parceiro para calcular';
  const c = COND_PGTO[p.zterm] || { dias: 0, txt: '' };
  return d ? `${fmtData(somarDias(d, c.dias))}  (condição ${p.zterm}: ${c.txt})` : `condição ${p.zterm}: ${c.txt}`;
}
function fatMontar(ctx, K, simular) {
  lerGrade(ctx);
  if (!exigir(ctx, [['conta', K ? 'Fornecedor' : 'Cliente'], ['wrbtr', 'Montante']].concat(K ? [['xblnr', 'Referência']] : []))) return;
  const bldat = dataCampo(ctx, 'bldat', 'Data da fatura'); if (!bldat) return;
  const budat = dataCampo(ctx, 'budat', 'Data de lançamento'); if (!budat) return;
  const valor = parseValor(ctx.v.wrbtr);
  if (!(valor > 0)) { msg('E', 'Montante inválido. Use o formato 1.234,56.'); marcarErro('wrbtr'); return; }
  const erros = [];
  const itens = itensDaGrade(ctx, erros);
  if (!itens.length) erros.push('Informe pelo menos um item com a conta de ' + (K ? 'despesa ou estoque.' : 'receita.'));
  if (erros.length) { msgErros(erros); return; }
  itens.forEach(i => { if (!i.sgtxt) i.sgtxt = ctx.v.sgtxt; });
  const conta = String(ctx.v.conta).trim();
  const linha1 = K ? { bschl: '31', lifnr: conta, valor, sgtxt: ctx.v.sgtxt } : { bschl: '01', kunnr: conta, valor, sgtxt: ctx.v.sgtxt };
  const cab = { blart: K ? 'KR' : 'DR', bldat, budat, xblnr: ctx.v.xblnr, bktxt: ctx.v.sgtxt.slice(0, 25) };
  const r = lancarDoc(app.db, cab, [linha1, ...itens], { simular: true });
  if (!r.ok) { msgErros(r.erros); return; }
  if (simular) { previaDocumento(r.itens, `Simulação do documento ${cab.blart}`); msg('I', 'Simulação sem erros. O documento ainda não foi gravado.'); return; }
  if (K) {
    const ref = String(ctx.v.xblnr).trim().toUpperCase();
    const dup = app.db.docs.find(d => d.blart === 'KR' && docAtivo(d) && d.xblnr.toUpperCase() === ref && d.itens.some(i => i.lifnr === conta));
    const chaveAviso = conta + '|' + ref;
    if (dup && ctx.s.avisoDup !== chaveAviso) {
      ctx.s.avisoDup = chaveAviso;
      msg('W', `Verifique se a fatura já foi lançada: o documento ${dup.belnr} tem a mesma referência ${ref} para este fornecedor. Grave de novo para confirmar.`);
      return;
    }
  }
  ctx.s.avisoDup = null;
  const real = lancarDoc(app.db, cab, [linha1, ...itens]);
  if (!real.ok) { msgErros(real.erros); return; }
  salvarDB(app.db);
  Object.assign(ctx.v, { conta: '', xblnr: '', wrbtr: '', sgtxt: '' });
  ctx.s.linhas = novasLinhas(5, ctx.s.dcPadrao);
  render();
  sucessoDoc(real.belnr, real.doc.gjahr);
  app.depoisDeGravar();
}
txFatura('FB60', 'K');
txFatura('FB70', 'D');

/* =================== F-53 / F-28 =================== */
function txPagamento(tcode, tipo) {
  const K = tipo === 'K';
  const parc = K ? 'fornecedor' : 'cliente';
  defTx(tcode, {
    nome: K ? 'Lançar saída de pagamento' : 'Lançar entrada de pagamento', prog: 'SAPMF05A',
    titulo: ctx => ctx.passo === 'ini' ? `Lançar ${K ? 'saída' : 'entrada'} de pagamento: dados do cabeçalho` : `Lançar ${K ? 'saída' : 'entrada'} de pagamento: processar partidas em aberto`,
    padrao: () => ({ bldat: hojeBR(), budat: hojeBR(), xblnr: '', bktxt: '', banco: '111100', valor: '', conta: '' }),
    render(ctx) {
      if (ctx.passo === 'ini') {
        return `<div class="colunas"><div>${grupo('Dados do cabeçalho',
          campo('bldat', 'Data do documento', ctx, { larg: 10, obrig: true }) +
          campo('budat', 'Data de lançamento', ctx, { larg: 10, obrig: true }) +
          campoFixo('Tipo de documento', K ? 'KZ' : 'DZ', TIPOS_DOC[K ? 'KZ' : 'DZ']) + campoFixo('Empresa', '1000', nomeEmpresa()) + campoFixo('Moeda', 'BRL') +
          campo('xblnr', 'Referência', ctx, { larg: 16, max: 16 }) +
          campo('bktxt', 'Texto de cabeçalho', ctx, { larg: 25, max: 25 }))}</div><div>${grupo('Dados do banco',
          campo('banco', 'Conta', ctx, { larg: 10, obrig: true, f4: 'conta', desc: 'conta' }) +
          campo('valor', 'Montante', ctx, { larg: 16, obrig: true, tipo: 'valor' }))}
          ${grupo('Seleção de partidas em aberto',
          campo('conta', K ? 'Conta (fornecedor)' : 'Conta (cliente)', ctx, { larg: 10, obrig: true, f4: parc, desc: parc, f1: 'conta' }) +
          campoFixo('Tipo de conta', tipo, TIPOS_CONTA[tipo]) +
          '<p class="nota">Depois de preencher, clique em Processar PA para escolher as partidas que este ' + (K ? 'pagamento quita.' : 'recebimento quita.') + '</p>')}</div></div>`;
      }
      const t = paTotais(ctx, K);
      return `<div class="cabobj"><span>${K ? 'Fornecedor' : 'Cliente'}</span><b>${esc(ctx.v.conta)}</b> ${esc(descDe(parc, ctx.v.conta))} <span>Banco</span><b>${esc(ctx.v.banco)}</b> <span>Data de lançamento</span><b>${esc(ctx.v.budat)}</b></div>
        <div class="lado"><fieldset class="grupo"><legend>Partidas em aberto (marque as que serão compensadas)</legend>
        <table class="grid" id="tabPA"><thead><tr><th></th><th>Documento</th><th>Tp</th><th>Data lçto.</th><th>Referência</th><th>Venc. líquido</th><th class="num">Atraso</th><th>CL</th><th class="num">Montante</th><th>Texto</th></tr></thead><tbody>
        ${ctx.s.pa.map((p, i) => `<tr data-i="${i}" class="${p.sel ? 'sel' : ''}"><td><input type="checkbox" data-pa="${i}" ${p.sel ? 'checked' : ''}></td><td>${p.belnr}</td><td>${p.blart}</td><td>${fmtData(p.budat)}</td><td>${esc(p.zuonr)}</td><td>${fmtData(p.venc)}</td><td class="num">${p.atraso}</td><td>${p.bschl}</td><td class="num">${fmtValor(p.valor)}</td><td>${esc(p.sgtxt)}</td></tr>`).join('')}
        </tbody></table><p class="nota">Dica: duplo clique numa linha também marca ou desmarca a partida.</p></fieldset>
        ${quadroSaldo('qpa', t.inf, t.atr, t.dif, ['Montante informado', 'Atribuído (marcado)'])}</div>
        <p class="nota">Neste simulador a diferença precisa ser zero. No SAP real dá para lançar pagamento parcial ou deixar a diferença como resíduo.</p>`;
    },
    depois(ctx) {
      if (ctx.passo !== 'pa') return;
      const atu = () => { const t = paTotais(ctx, K); $('#qpa').outerHTML = quadroSaldo('qpa', t.inf, t.atr, t.dif, ['Montante informado', 'Atribuído (marcado)']); };
      $('#tabPA').addEventListener('change', e => { const i = e.target.dataset.pa; if (i === undefined) return; ctx.s.pa[+i].sel = e.target.checked; e.target.closest('tr').classList.toggle('sel', e.target.checked); atu(); });
      $('#tabPA').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-i]'); if (!tr || e.target.type === 'checkbox') return; const cb = $('input', tr); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); });
    },
    botoes: ctx => ctx.passo === 'ini'
      ? [{ txt: 'Processar PA', ic: 'exec', acao: c => pagProcessar(c, K) }]
      : [{ txt: 'Ativar todas', ic: 'marcar', acao: c => { c.s.pa.forEach(p => p.sel = true); render(); } },
        { txt: 'Desativar todas', ic: 'desmarcar', acao: c => { c.s.pa.forEach(p => p.sel = false); render(); } },
        { txt: 'Gravar', ic: 'gravar', tecla: 'Ctrl+S', acao: c => pagGravar(c, K) }],
    enter(ctx) { if (ctx.passo === 'ini') pagProcessar(ctx, K); else render(); },
    gravar(ctx) { if (ctx.passo === 'ini') { msg('W', 'Antes de gravar, clique em Processar PA e marque as partidas.'); return; } pagGravar(ctx, K); }
  });
}
function paTotais(ctx, K) {
  const inf = r2(parseValor(ctx.v.valor) || 0);
  const soma = ctx.s.pa.filter(p => p.sel).reduce((s, p) => s + p.valor, 0);
  const atr = r2(K ? -soma : soma);
  return { inf, atr, dif: r2(inf - atr) };
}
function pagProcessar(ctx, K) {
  if (!exigir(ctx, [['banco', 'Conta do banco'], ['valor', 'Montante'], ['conta', K ? 'Fornecedor' : 'Cliente']])) return;
  if (!dataCampo(ctx, 'bldat', 'Data do documento') || !dataCampo(ctx, 'budat', 'Data de lançamento')) return;
  const b = acharConta(app.db, ctx.v.banco);
  if (!b || b.recon) { msg('E', `A conta ${ctx.v.banco} não serve como conta do banco. Use a 111100.`); marcarErro('banco'); return; }
  if (!(parseValor(ctx.v.valor) > 0)) { msg('E', 'Montante inválido. Use o formato 1.234,56.'); marcarErro('valor'); return; }
  const conta = String(ctx.v.conta).trim();
  const p = K ? acharFornecedor(app.db, conta) : acharCliente(app.db, conta);
  if (!p) { msg('E', `O ${K ? 'fornecedor' : 'cliente'} ${conta} não existe na empresa 1000.`); marcarErro('conta'); return; }
  const ab = partidas(app.db, K ? 'K' : 'D', { de: conta, status: 'ab', chave: '9999-12-31' }).sort((a, b) => cmp(a.budat, b.budat));
  if (!ab.length) { msg('E', `Não há partidas em aberto para o ${K ? 'fornecedor' : 'cliente'} ${conta}.`); return; }
  ab.forEach(x => { x.sel = false; x.atraso = x.venc ? diasEntre(x.venc, SIM.hoje) : ''; });
  ctx.s.pa = ab;
  ctx.ir('pa');
  msg('I', `${ab.length} partida(s) em aberto. Marque as que este ${K ? 'pagamento' : 'recebimento'} quita até a diferença ficar 0,00.`);
}
function pagGravar(ctx, K) {
  const refs = ctx.s.pa.filter(p => p.sel).map(p => ({ belnr: p.belnr, gjahr: p.gjahr, buzei: p.buzei }));
  const r = pagarPartidas(app.db, {
    tipo: K ? 'K' : 'D', conta: String(ctx.v.conta).trim(), banco: String(ctx.v.banco).trim(), valor: parseValor(ctx.v.valor),
    bldat: parseData(ctx.v.bldat), budat: parseData(ctx.v.budat), xblnr: ctx.v.xblnr, bktxt: ctx.v.bktxt, refs
  });
  if (!r.ok) { msgErros(r.erros); return; }
  salvarDB(app.db);
  Object.assign(ctx.v, { valor: '', conta: '', xblnr: '', bktxt: '' });
  ctx.passos = []; ctx.passo = 'ini'; ctx.s.pa = [];
  render();
  sucessoDoc(r.belnr, r.doc.gjahr, ` e compensou ${refs.length} partida(s)`);
  app.depoisDeGravar();
}
txPagamento('F-53', 'K');
txPagamento('F-28', 'D');

/* =================== FB03 =================== */
defTx('FB03', {
  nome: 'Exibir documento', prog: 'SAPMF05L',
  titulo: ctx => ctx.passo === 'ini' ? 'Exibir documento: tela inicial' : 'Exibir documento: visão de entrada de dados',
  padrao: () => ({ belnr: '', bukrs: '1000', gjahr: '2026' }),
  iniciar(ctx, p) { if (p.auto && acharDoc(app.db, p.belnr, p.gjahr)) ctx.passo = 'det'; },
  render(ctx) {
    if (ctx.passo === 'ini') return grupo('Chave do documento',
      campo('belnr', 'Nº documento', ctx, { larg: 10, obrig: true, f4: 'doc' }) +
      campoFixo('Empresa', '1000', nomeEmpresa()) +
      campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true })) +
      '<p class="nota">Não sabe o número? Tecle F4 no campo Nº documento para ver a lista de documentos.</p>';
    const d = acharDoc(app.db, ctx.v.belnr, ctx.v.gjahr);
    const alerta = d.stblg ? `<div class="alerta">${icone('aviso')} Este documento foi estornado pelo documento <a data-doc="${d.stblg}">${d.stblg}</a> (motivo ${d.stgrd || '01'}).</div>`
      : d.estornoDe ? `<div class="alerta">${icone('info')} Este documento é o estorno do documento <a data-doc="${d.estornoDe}">${d.estornoDe}</a>.</div>` : '';
    return `${alerta}<div class="colunas"><div>${grupo('Cabeçalho do documento',
      campoFixo('Nº documento', d.belnr) + campoFixo('Empresa', d.bukrs, nomeEmpresa()) + campoFixo('Exercício', String(d.gjahr)) +
      campoFixo('Tipo de documento', d.blart, TIPOS_DOC[d.blart]) + campoFixo('Data do documento', fmtData(d.bldat)) +
      campoFixo('Data de lançamento', fmtData(d.budat)) + campoFixo('Período', pad(d.monat)))}</div><div>${grupo('Dados adicionais',
      campoFixo('Referência', d.xblnr || ' ') + campoFixo('Texto de cabeçalho', d.bktxt || ' ') + campoFixo('Moeda', 'BRL') +
      campoFixo('Usuário', d.usnam) + campoFixo('Data de entrada', fmtData(d.cpudt)))}</div></div><div id="alvItens"></div>`;
  },
  depois(ctx) {
    if (ctx.passo !== 'det') return;
    const d = acharDoc(app.db, ctx.v.belnr, ctx.v.gjahr);
    $$('[data-doc]').forEach(a => a.onclick = () => app.chamar('FB03', { belnr: a.dataset.doc, gjahr: String(d.gjahr), auto: true }));
    const linhas = d.itens.map(it => ({ ...it, conta: contaDoItem(it), nome: nomeParceiro(app.db, it), tipo: TIPOS_CONTA[it.koart], mont: it.shkzg === 'S' ? it.valor : -it.valor, venc: vencimento(it), moeda: 'BRL' }));
    new ALV($('#alvItens'), {
      colunas: [
        { k: 'buzei', t: 'Itm', tec: 'BUZEI', fmt: v => pad(v, 3) }, { k: 'bschl', t: 'CL', tec: 'BSCHL', desc: 'Chave de lançamento' }, { k: 'tipo', t: 'Tipo conta', tec: 'KOART' },
        { k: 'conta', t: 'Conta', tec: 'HKONT/LIFNR/KUNNR' }, { k: 'nome', t: 'Descrição' }, { k: 'hkont', t: 'Conta Razão', tec: 'HKONT' },
        { k: 'mont', t: 'Montante', tipo: 'valor', soma: true, tec: 'DMBTR' }, { k: 'moeda', t: 'Moeda' }, { k: 'sgtxt', t: 'Texto', tec: 'SGTXT' },
        { k: 'zuonr', t: 'Atribuição', tec: 'ZUONR' }, { k: 'venc', t: 'Vencimento', tipo: 'data' }, { k: 'augbl', t: 'Doc. compensação', tec: 'AUGBL' }, { k: 'augdt', t: 'Data comp.', tipo: 'data', tec: 'AUGDT' }
      ],
      linhas, temTecnico: true, arquivo: `documento_${d.belnr}.csv`,
      duplo: l => fb03Detalhe(d, l)
    }, ctx.s.alv = ctx.s.alv || {});
  },
  botoes: ctx => ctx.passo === 'ini'
    ? [{ txt: 'Exibir', ic: 'exibir', acao: c => fb03Abrir(c) }]
    : [{ txt: 'Outro documento', ic: 'novo', acao: c => { c.passos = []; c.passo = 'ini'; render(); } },
      { txt: 'Estornar', ic: 'estornar', acao: c => app.chamar('FB08', { belnr: c.v.belnr, gjahr: c.v.gjahr }) },
      { txt: 'Partidas da 1ª conta', ic: 'lista', acao: c => { const d = acharDoc(app.db, c.v.belnr, c.v.gjahr); const it = d.itens[0]; const t = it.koart === 'K' ? 'FBL1N' : it.koart === 'D' ? 'FBL5N' : 'FBL3N'; app.chamar(t, { de: contaDoItem(it), status: 'todas', auto: true }); } }],
  enter(ctx) { if (ctx.passo === 'ini') fb03Abrir(ctx); }
});
function fb03Abrir(ctx) {
  if (!exigir(ctx, [['belnr', 'Nº documento'], ['gjahr', 'Exercício']])) return;
  const d = acharDoc(app.db, ctx.v.belnr, ctx.v.gjahr);
  if (!d) { msg('E', `O documento ${ctx.v.belnr} não existe na empresa 1000 no exercício ${ctx.v.gjahr}.`); marcarErro('belnr'); return; }
  ctx.v.belnr = d.belnr;
  ctx.ir('det');
}
function fb03Detalhe(d, it) {
  const campos = [['BUKRS', 'Empresa', d.bukrs], ['BELNR', 'Nº documento', d.belnr], ['GJAHR', 'Exercício', d.gjahr], ['BUZEI', 'Item', pad(it.buzei, 3)],
    ['BSCHL', 'Chave de lançamento', `${it.bschl} (${CHAVES[it.bschl].txt})`], ['KOART', 'Tipo de conta', `${it.koart} (${TIPOS_CONTA[it.koart]})`],
    ['SHKZG', 'Débito/crédito', `${it.shkzg} (${it.shkzg === 'S' ? 'débito' : 'crédito'})`], ['DMBTR', 'Montante em moeda interna', fmtValor(it.valor)],
    ['HKONT', 'Conta do Razão', it.hkont], ['LIFNR', 'Fornecedor', it.lifnr], ['KUNNR', 'Cliente', it.kunnr], ['ZUONR', 'Atribuição', it.zuonr],
    ['SGTXT', 'Texto do item', it.sgtxt], ['ZFBDT', 'Data base p/ vencimento', fmtData(it.zfbdt)], ['ZBD1T', 'Dias de prazo', it.koart === 'S' ? '' : it.dias],
    ['AUGBL', 'Doc. de compensação', it.augbl], ['AUGDT', 'Data de compensação', fmtData(it.augdt)]];
  popup({
    titulo: `Item ${pad(it.buzei, 3)} do documento ${d.belnr}: campos da BSEG`, largura: 640,
    html: `<table class="grid"><thead><tr><th>Campo técnico</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${campos.map(([t, n, v]) => `<tr><td class="tec">${t}</td><td>${esc(n)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
      <p class="nota">Esses são os mesmos campos que você vê na tabela BSEG pelo SE16N. O montante fica sempre positivo; o lado vem do SHKZG.</p>`,
    botoes: [{ txt: 'OK', ic: 'ok', padrao: true }]
  });
}

/* =================== FB08 =================== */
defTx('FB08', {
  nome: 'Estornar documento', prog: 'SAPMF05A',
  titulo: 'Estornar documento: dados do cabeçalho',
  padrao: () => ({ belnr: '', bukrs: '1000', gjahr: '2026', stgrd: '01', budat: '' }),
  render(ctx) {
    return grupo('Detalhes do documento',
      campo('belnr', 'Nº documento', ctx, { larg: 10, obrig: true, f4: 'doc' }) + campoFixo('Empresa', '1000', nomeEmpresa()) +
      campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true })) +
      grupo('Especificações para o lançamento do estorno',
        campo('stgrd', 'Motivo do estorno', ctx, { larg: 2, obrig: true, f4: 'motivo', desc: 'motivo' }) +
        campo('budat', 'Data de lançamento', ctx, { larg: 10, f1: 'budat' }) +
        '<p class="nota">Com motivo 01 a data fica igual à do documento original. Com motivo 02, informe a data do estorno.</p>');
  },
  botoes: () => [
    { txt: 'Exibir antes do estorno', ic: 'exibir', acao: c => { if (!acharDoc(app.db, c.v.belnr, c.v.gjahr)) { msg('E', `O documento ${c.v.belnr || '(vazio)'} não existe.`); return; } app.chamar('FB03', { belnr: c.v.belnr, gjahr: c.v.gjahr, auto: true }); } },
    { txt: 'Gravar', ic: 'gravar', tecla: 'Ctrl+S', acao: c => fb08Gravar(c) }
  ],
  enter(ctx) {
    const d = acharDoc(app.db, ctx.v.belnr, ctx.v.gjahr);
    if (d) msg('I', `Documento ${d.belnr}: ${TIPOS_DOC[d.blart]} de ${fmtData(d.budat)}. Grave (Ctrl+S) para estornar.`);
    else if (ctx.v.belnr) msg('E', `O documento ${ctx.v.belnr} não existe no exercício ${ctx.v.gjahr}.`);
    render();
  },
  gravar(ctx) { fb08Gravar(ctx); }
});
function fb08Gravar(ctx) {
  if (!exigir(ctx, [['belnr', 'Nº documento'], ['gjahr', 'Exercício'], ['stgrd', 'Motivo do estorno']])) return;
  const budat = String(ctx.v.budat).trim() ? parseData(ctx.v.budat) : null;
  if (String(ctx.v.budat).trim() && !budat) { msg('E', 'Data de lançamento inválida. Use DD.MM.AAAA.'); marcarErro('budat'); return; }
  const r = estornarDoc(app.db, ctx.v.belnr, ctx.v.gjahr, { motivo: String(ctx.v.stgrd).trim(), budat });
  if (!r.ok) { msgErros(r.erros); return; }
  salvarDB(app.db);
  const orig = ctx.v.belnr;
  ctx.v.belnr = ''; ctx.v.budat = '';
  render();
  msg('S', `O documento ${orig} foi estornado pelo documento ${r.belnr}`, { acao: () => app.chamar('FB03', { belnr: r.belnr, gjahr: String(r.doc.gjahr), auto: true }), dicaAcao: 'Clique para abrir o documento de estorno' });
  app.depoisDeGravar();
}

/* =================== FBRA =================== */
defTx('FBRA', {
  nome: 'Anular compensação', prog: 'SAPMF05R',
  titulo: 'Anular compensação de documentos',
  padrao: () => ({ belnr: '', bukrs: '1000', gjahr: '2026' }),
  render(ctx) {
    return grupo('Documento de compensação',
      campo('belnr', 'Doc. de compensação', ctx, { larg: 10, obrig: true, f4: 'doc', f1: 'augbl' }) + campoFixo('Empresa', '1000', nomeEmpresa()) +
      campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true })) +
      '<p class="nota">O documento de compensação aparece na coluna "Doc. compensação" do FBL1N e do FBL5N. Num pagamento, é o próprio número do pagamento (KZ começa com 15, DZ com 14).</p>';
  },
  botoes: () => [{ txt: 'Gravar', ic: 'gravar', tecla: 'Ctrl+S', acao: c => fbraGravar(c) }],
  gravar(ctx) { fbraGravar(ctx); }
});
function fbraGravar(ctx) {
  if (!exigir(ctx, [['belnr', 'Doc. de compensação'], ['gjahr', 'Exercício']])) return;
  const k = String(ctx.v.belnr).trim(), g = ctx.v.gjahr;
  const qtd = app.db.docs.reduce((s, d) => s + d.itens.filter(i => i.augbl === k).length, 0);
  if (!qtd) { msg('E', `O documento ${k} não compensou nenhuma partida.`); marcarErro('belnr'); return; }
  const doc = acharDoc(app.db, k, g);
  const podeEstornar = doc && (doc.blart === 'KZ' || doc.blart === 'DZ') && docAtivo(doc);
  const executar = estornar => {
    const r = anularCompensacao(app.db, k, g);
    if (!r.ok) { msgErros(r.erros); return; }
    if (estornar) {
      const e = estornarDoc(app.db, k, g, { motivo: '01' });
      if (!e.ok) { salvarDB(app.db); render(); msgErros(['A compensação foi anulada, mas o estorno falhou: ' + e.erros[0]]); return; }
      app.db.progresso.eventos.fbraEstorno = true;
      salvarDB(app.db); render();
      msg('S', `Compensação ${k} anulada (${r.qtd} partidas) e documento estornado pelo ${e.belnr}`, { acao: () => app.chamar('FB03', { belnr: e.belnr, gjahr: String(e.doc.gjahr), auto: true }) });
    } else {
      salvarDB(app.db); render();
      msg('S', `Compensação ${k} anulada: ${r.qtd} partidas voltaram a ficar em aberto.`);
    }
    app.depoisDeGravar();
  };
  popup({
    titulo: 'Anular compensação', largura: 520,
    html: `<p>O documento ${esc(k)} compensa ${qtd} partidas.</p><p>${podeEstornar ? 'O que você quer fazer?' : 'Este documento não é um pagamento ativo; só é possível anular a compensação.'}</p>`,
    botoes: [{ txt: 'Só anular a compensação', ic: 'ok', padrao: !podeEstornar, acao: () => executar(false) }]
      .concat(podeEstornar ? [{ txt: 'Anular e estornar', ic: 'estornar', padrao: true, acao: () => executar(true) }] : [])
      .concat([{ txt: 'Cancelar', ic: 'cancelar' }])
  });
}

/* =================== FS00 =================== */
defTx('FS00', {
  nome: 'Processamento central de contas do Razão', prog: 'SAPLGL_ACCOUNT_MASTER_MAINTAIN',
  titulo: ctx => ctx.passo === 'ini' ? 'Processar conta do Razão: tela inicial' : `${{ exibir: 'Exibir', modificar: 'Modificar', criar: 'Criar' }[ctx.s.modo]} conta do Razão: dados da empresa`,
  padrao: () => ({ saknr: '', bukrs: '1000' }),
  render(ctx) {
    if (ctx.passo === 'ini') return grupo('Conta', campo('saknr', 'Conta do Razão', ctx, { larg: 10, obrig: true, f4: 'conta', desc: 'conta' }) + campoFixo('Empresa', '1000', nomeEmpresa())) +
      '<p class="nota">Exibir e Modificar usam uma conta existente. Para Criar, digite um número de 6 dígitos que ainda não existe (ex.: 418000).</p>';
    const dis = ctx.s.modo === 'exibir', v = ctx.v, aba = ctx.s.aba || 'tipo';
    const tipoTxt = String(v.c_no).startsWith('4') ? 'Conta de resultado (P&L)' : 'Conta do balanço patrimonial';
    let corpo = '';
    if (aba === 'tipo') corpo = grupo('Controle no plano de contas',
      campoFixo('Plano de contas', 'PCBR', 'Plano de contas Brasil (simulador)') +
      sel('c_no', 'Item da estrutura de balanço', NOS_FOLHA.map(n => [n, `${n} ${ESTRUTURA_BAL.find(e => e.no === n).txt}`]), ctx, { dis, obrig: true }) +
      campoFixo('Tipo de conta', tipoTxt)) +
      grupo('Descrição', campo('c_txt', 'Texto breve', ctx, { larg: 20, max: 20, obrig: true, dis }) + campo('c_longo', 'Texto descritivo', ctx, { larg: 50, max: 50, dis }));
    if (aba === 'controle') corpo = grupo('Gestão de contas na empresa',
      campoFixo('Moeda da conta', 'BRL', 'Real brasileiro') +
      sel('c_recon', 'Conta de reconciliação p/ tipo de conta', [['', '(nenhum: lançamento direto)'], ['K', 'K Fornecedores'], ['D', 'D Clientes']], ctx, { dis }) +
      chk('c_xopvw', 'Administração de partidas em aberto', ctx, { dis }) +
      chk('c_lin', 'Exibição de partidas individuais', ctx, { dis: true }) +
      campo('c_zuawa', 'Chave de ordenação', ctx, { larg: 3, max: 3, dis }));
    if (aba === 'criacao') corpo = grupo('Controle da entrada de documentos',
      campoFixo('Grupo de status de campo', 'G001', 'Contas gerais') +
      chk('c_xspeb', 'Bloqueado para lançamento', ctx, { dis }) +
      '<p class="nota">Uma conta bloqueada continua com o histórico e o saldo; só não aceita novos lançamentos.</p>');
    return `<div class="cabobj"><span>Conta do Razão</span><b>${esc(v.saknr)}</b> ${esc(v.c_txt)} <span>Empresa</span><b>1000</b> ${esc(nomeEmpresa())} ${dis ? '' : `<span style="color:var(--warn)">Modo de ${ctx.s.modo === 'criar' ? 'criação' : 'modificação'}: grave com Ctrl+S</span>`}</div>
      ${abasHTML(ctx, [['tipo', 'Tipo/descrição'], ['controle', 'Dados de controle'], ['criacao', 'Criação/banco/juros']])}<div class="abacorpo">${corpo}</div>`;
  },
  depois(ctx) { $$('[data-aba]').forEach(a => a.onclick = () => { lerCampos(ctx); ctx.s.aba = a.dataset.aba; render(); }); },
  botoes: ctx => ctx.passo === 'ini'
    ? [{ txt: 'Exibir', ic: 'exibir', acao: c => fs00Abrir(c, 'exibir') }, { txt: 'Modificar', ic: 'modificar', acao: c => fs00Abrir(c, 'modificar') }, { txt: 'Criar', ic: 'criar', acao: c => fs00Abrir(c, 'criar') }]
    : [{ txt: ctx.s.modo === 'exibir' ? 'Exibir ↔ Modificar' : 'Modificar ↔ Exibir', ic: 'modificar', acao: c => { if (c.s.modo === 'criar') return; c.s.modo = c.s.modo === 'exibir' ? 'modificar' : 'exibir'; fs00Carregar(c); render(); } },
      { txt: 'Saldos (FS10N)', ic: 'lista', acao: c => { if (c.s.modo === 'criar') return; app.chamar('FS10N', { saknr: c.v.saknr, gjahr: '2026', auto: true }); } }],
  enter(ctx) { if (ctx.passo === 'ini') fs00Abrir(ctx, 'exibir'); },
  gravar(ctx) { fs00Gravar(ctx); }
});
function fs00Carregar(ctx) {
  const c = acharConta(app.db, ctx.v.saknr);
  Object.assign(ctx.v, { c_txt: c.txt, c_longo: c.longo, c_no: c.no, c_recon: c.recon, c_xopvw: c.xopvw, c_lin: true, c_zuawa: c.zuawa, c_xspeb: c.bloqueada });
}
function fs00Abrir(ctx, modo) {
  const s = String(ctx.v.saknr || '').trim();
  if (modo === 'criar') {
    if (!/^\d{6}$/.test(s)) { msg('E', 'Para criar, informe um número de conta com 6 dígitos (ex.: 418000).'); marcarErro('saknr'); return; }
    if (acharConta(app.db, s)) { msg('E', `A conta ${s} já existe na empresa 1000. Use Exibir ou Modificar.`); marcarErro('saknr'); return; }
    Object.assign(ctx.v, { c_txt: '', c_longo: '', c_no: s.startsWith('1') ? '1.1' : s.startsWith('2') ? '2.1' : s.startsWith('3') ? '4.1' : '4.4', c_recon: '', c_xopvw: false, c_lin: true, c_zuawa: '001', c_xspeb: false });
  } else {
    if (!s) { msg('E', 'Preencha o campo obrigatório "Conta do Razão".'); marcarErro('saknr'); return; }
    if (!acharConta(app.db, s)) { msg('E', `A conta ${s} não existe na empresa 1000.`); marcarErro('saknr'); return; }
    ctx.v.saknr = s; fs00Carregar(ctx);
    if (modo === 'exibir' && s === '111100') app.evento('FS00:111100');
  }
  ctx.s.modo = modo; ctx.s.aba = 'tipo';
  ctx.ir('det');
}
function fs00Gravar(ctx) {
  if (ctx.passo !== 'det' || ctx.s.modo === 'exibir') { msg('W', 'Não há nada para gravar. Entre em Modificar ou Criar.'); return; }
  const v = ctx.v, s = v.saknr;
  if (!String(v.c_txt || '').trim()) { ctx.s.aba = 'tipo'; render(); msg('E', 'Preencha o campo obrigatório "Texto breve".'); marcarErro('c_txt'); return; }
  const temLanc = app.db.docs.some(d => d.itens.some(i => i.hkont === s));
  const dados = { txt: v.c_txt.trim(), longo: (v.c_longo || v.c_txt).trim(), no: v.c_no, recon: v.c_recon || '', xopvw: !!v.c_xopvw, zuawa: v.c_zuawa || '001', bloqueada: !!v.c_xspeb };
  if (ctx.s.modo === 'modificar') {
    const c = acharConta(app.db, s);
    if (temLanc && c.recon !== dados.recon) { msg('E', `A conta ${s} já tem lançamentos: não dá para mudar o tipo de reconciliação.`); return; }
    if (temLanc && contaResultado(c) !== String(dados.no).startsWith('4')) { msg('E', `A conta ${s} já tem lançamentos: não dá para trocar de balanço para resultado (ou o contrário).`); return; }
    Object.assign(c, dados);
    msg('S', `A conta ${s} foi modificada na empresa 1000.`);
  } else {
    app.db.contas.push({ saknr: s, ...dados });
    app.db.contas.sort((a, b) => cmp(a.saknr, b.saknr));
    msg('S', `A conta ${s} foi criada na empresa 1000.`);
  }
  salvarDB(app.db);
  ctx.s.modo = 'exibir';
  const m = $('#msg').innerHTML;
  render(); $('#msg').innerHTML = m;
}

/* =================== FK01-03 / FD01-03 =================== */
function txMestre(tcode, tipo, modo) {
  const K = tipo === 'K', nomeObj = K ? 'fornecedor' : 'cliente';
  const verbo = { criar: 'Criar', modificar: 'Modificar', exibir: 'Exibir' }[modo];
  const lista = () => K ? app.db.fornecedores : app.db.clientes;
  const chave = K ? 'lifnr' : 'kunnr';
  const abas = [['end', 'Endereço'], ['ctl', 'Controle'], ['gc', 'Gestão de conta'], ['pg', 'Pagamentos']];
  defTx(tcode, {
    nome: `${verbo} ${nomeObj} (contabilidade)`, prog: K ? 'SAPMF02K' : 'SAPMF02D',
    titulo: ctx => ctx.passo === 'ini' ? `${verbo} ${nomeObj}: tela inicial` : `${verbo} ${nomeObj}: ${abas.find(a => a[0] === (ctx.s.aba || 'end'))[1]}`,
    padrao: () => ({ obj: '', bukrs: '1000' }),
    render(ctx) {
      if (ctx.passo === 'ini') return grupo(K ? 'Fornecedor' : 'Cliente',
        campo('obj', K ? 'Fornecedor' : 'Cliente', ctx, modo === 'criar' ? { larg: 10, f1: 'obj' } : { larg: 10, obrig: true, f4: nomeObj, desc: nomeObj, f1: 'obj' }) +
        campoFixo('Empresa', '1000', nomeEmpresa()) + campoFixo('Grupo de contas', K ? 'KRED' : 'DEBI', K ? 'Fornecedores nacionais' : 'Clientes nacionais')) +
        (modo === 'criar' ? '<p class="nota">Deixe o código vazio para o sistema dar o próximo número (numeração interna). Tecle Enter.</p>' : '<p class="nota">Tecle Enter para abrir o cadastro.</p>');
      const dis = modo === 'exibir', aba = ctx.s.aba || 'end';
      let corpo = '';
      if (aba === 'end') corpo = grupo('Nome e endereço', campo('m_nome', 'Nome', ctx, { larg: 40, max: 40, obrig: true, dis }) + campo('m_rua', 'Rua e número', ctx, { larg: 40, max: 40, dis }) + campo('m_cidade', 'Cidade', ctx, { larg: 25, dis }) + campo('m_uf', 'Região (UF)', ctx, { larg: 2, max: 2, dis }) + campo('m_cep', 'Código postal', ctx, { larg: 9, max: 9, dis }) + campoFixo('País', 'BR', 'Brasil'));
      if (aba === 'ctl') corpo = grupo('Números de identificação fiscal', campo('m_cnpj', 'CNPJ (nº ID fiscal 1)', ctx, { larg: 18, max: 18, dis }));
      if (aba === 'gc') corpo = grupo('Gestão de conta', campo('m_conta', 'Conta de reconciliação', ctx, { larg: 10, obrig: true, f4: 'conta', desc: 'conta', dis }) + campoFixo('Chave de ordenação', '012', 'Referência do documento'));
      if (aba === 'pg') corpo = grupo('Dados de pagamento', campo('m_zterm', 'Condição de pagamento', ctx, { larg: 4, max: 4, obrig: true, f4: 'zterm', desc: 'zterm', dis }) + campoFixo('Formas de pagamento', K ? 'T' : 'B', K ? 'Transferência bancária' : 'Boleto'));
      return `<div class="cabobj"><span>${K ? 'Fornecedor' : 'Cliente'}</span><b>${esc(ctx.v.obj || '(novo)')}</b> ${esc(ctx.v.m_nome || '')} <span>Empresa</span><b>1000</b></div>${abasHTML(ctx, abas)}<div class="abacorpo">${corpo}</div>`;
    },
    depois(ctx) { $$('[data-aba]').forEach(a => a.onclick = () => { lerCampos(ctx); ctx.s.aba = a.dataset.aba; render(); }); },
    botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Continuar', ic: 'ok', acao: c => mestreAbrir(c) }]
      : [{ txt: 'Saldos', ic: 'lista', acao: c => { if (modo === 'criar') return; app.chamar(K ? 'FK10N' : 'FD10N', { [chave]: c.v.obj, gjahr: '2026', auto: true }); } },
        { txt: 'Partidas', ic: 'lista', acao: c => { if (modo === 'criar') return; app.chamar(K ? 'FBL1N' : 'FBL5N', { de: c.v.obj, status: 'todas', auto: true }); } }],
    enter(ctx) { if (ctx.passo === 'ini') mestreAbrir(ctx); else render(); },
    gravar(ctx) {
      if (ctx.passo !== 'det' || modo === 'exibir') { msg('W', `Não há nada para gravar. Use ${K ? 'FK02' : 'FD02'} para modificar.`); return; }
      const v = ctx.v;
      if (!String(v.m_nome || '').trim()) { ctx.s.aba = 'end'; render(); msg('E', 'Preencha o campo obrigatório "Nome".'); marcarErro('m_nome'); return; }
      const c = acharConta(app.db, v.m_conta);
      if (!c || c.recon !== tipo) { ctx.s.aba = 'gc'; render(); msg('E', `A conta ${v.m_conta || '(vazia)'} não é conta de reconciliação para ${K ? 'fornecedores (use 211000)' : 'clientes (use 112000)'}.`); marcarErro('m_conta'); return; }
      const zt = String(v.m_zterm || '').trim().toUpperCase();
      if (!COND_PGTO[zt]) { ctx.s.aba = 'pg'; render(); msg('E', 'Condição de pagamento inválida. Use F4 no campo.'); marcarErro('m_zterm'); return; }
      const dados = { nome: v.m_nome.trim(), rua: v.m_rua || '', cidade: v.m_cidade || '', uf: (v.m_uf || '').toUpperCase(), cep: v.m_cep || '', cnpj: v.m_cnpj || '', conta: c.saknr, zterm: zt };
      if (modo === 'criar') {
        const novo = { [chave]: v.obj, ...dados };
        lista().push(novo);
        salvarDB(app.db);
        ctx.passos = []; ctx.passo = 'ini'; ctx.v.obj = '';
        render();
        msg('S', `O ${nomeObj} ${novo[chave]} foi criado na empresa 1000.`);
      } else {
        Object.assign(lista().find(p => p[chave] === v.obj), dados);
        salvarDB(app.db); render();
        msg('S', `As modificações do ${nomeObj} ${v.obj} foram gravadas.`);
      }
    }
  });
  function mestreAbrir(ctx) {
    const s = String(ctx.v.obj || '').trim();
    if (modo === 'criar') {
      if (s && lista().some(p => p[chave] === s)) { msg('E', `O ${nomeObj} ${s} já existe. Use ${K ? 'FK03' : 'FD03'} para exibir.`); marcarErro('obj'); return; }
      if (s && !/^\d{6}$/.test(s)) { msg('E', 'Use um código de 6 dígitos ou deixe vazio.'); marcarErro('obj'); return; }
      const prox = s || String(Math.max(...lista().map(p => +p[chave])) + 1);
      Object.assign(ctx.v, { obj: prox, m_nome: '', m_rua: '', m_cidade: '', m_uf: 'SP', m_cep: '', m_cnpj: '', m_conta: K ? '211000' : '112000', m_zterm: 'Z030' });
    } else {
      const p = lista().find(x => x[chave] === s);
      if (!s) { msg('E', `Preencha o campo obrigatório "${K ? 'Fornecedor' : 'Cliente'}".`); marcarErro('obj'); return; }
      if (!p) { msg('E', `O ${nomeObj} ${s} não existe na empresa 1000.`); marcarErro('obj'); return; }
      Object.assign(ctx.v, { obj: s, m_nome: p.nome, m_rua: p.rua, m_cidade: p.cidade, m_uf: p.uf, m_cep: p.cep, m_cnpj: p.cnpj, m_conta: p.conta, m_zterm: p.zterm });
    }
    ctx.s.aba = 'end';
    ctx.ir('det');
  }
}
txMestre('FK01', 'K', 'criar'); txMestre('FK02', 'K', 'modificar'); txMestre('FK03', 'K', 'exibir');
txMestre('FD01', 'D', 'criar'); txMestre('FD02', 'D', 'modificar'); txMestre('FD03', 'D', 'exibir');

/* =================== FS10N / FK10N / FD10N =================== */
function txSaldos(tcode, tipo) {
  const C = {
    S: { k: 'saknr', rot: 'Número da conta', f4: 'conta', nome: 'Exibir saldos de contas do Razão', lista: 'FBL3N', pred: v => it => it.hkont === v },
    K: { k: 'lifnr', rot: 'Fornecedor', f4: 'fornecedor', nome: 'Exibir saldos de fornecedor', lista: 'FBL1N', pred: v => it => it.koart === 'K' && it.lifnr === v },
    D: { k: 'kunnr', rot: 'Cliente', f4: 'cliente', nome: 'Exibir saldos de cliente', lista: 'FBL5N', pred: v => it => it.koart === 'D' && it.kunnr === v }
  }[tipo];
  defTx(tcode, {
    nome: C.nome,
    titulo: ctx => ctx.passo === 'ini' ? C.nome : `Exibição de saldo: ${tipo === 'S' ? 'contas do Razão' : tipo === 'K' ? 'fornecedor' : 'cliente'}`,
    padrao: () => ({ [C.k]: '', bukrs: '1000', gjahr: '2026' }),
    iniciar(ctx, p) { if (p.auto && saldosValido(ctx, C, tipo, true)) ctx.passo = 'res'; },
    render(ctx) {
      if (ctx.passo === 'ini') return grupo('Seleção de contas', campo(C.k, C.rot, ctx, { larg: 10, obrig: true, f4: C.f4, desc: C.f4, f1: tipo === 'S' ? 'saknr' : C.k }) + campoFixo('Empresa', '1000', nomeEmpresa())) +
        grupo('Seleção de exercício', campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true }));
      const v = String(ctx.v[C.k]).trim(), g = +ctx.v.gjahr;
      const p = saldosPeriodo(app.db, C.pred(v), g);
      let ac = 0, td = 0, tc = 0;
      const nomes = ['Saldo transp.', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const linhas = p.map((x, m) => {
        ac = r2(ac + x.d - x.c); td += x.d; tc += x.c;
        return `<tr><td>${m === 0 ? '' : pad(m)}</td><td>${nomes[m]}</td><td class="num ${m ? 'lk' : ''}" data-per="${m}">${fmtValor(x.d)}</td><td class="num ${m ? 'lk' : ''}" data-per="${m}">${fmtValor(-x.c)}</td><td class="num ${m ? 'lk' : ''}" data-per="${m}">${fmtValor(r2(x.d - x.c))}</td><td class="num ${m ? 'lk' : ''}" data-per="${m}" data-ac="1">${fmtValor(ac)}</td></tr>`;
      }).join('');
      return `<div class="cabobj"><span>${C.rot}</span><b>${esc(v)}</b> ${esc(descDe(C.f4, v))} <span>Empresa</span><b>1000</b> <span>Exercício</span><b>${g}</b> <span>Moeda</span><b>BRL</b></div>
        <div class="alv"><div class="alv-wrap"><table class="grid" id="tabSaldo"><thead><tr><th>Período</th><th></th><th class="num">Débito</th><th class="num">Crédito</th><th class="num">Saldo</th><th class="num">Saldo acumulado</th></tr></thead><tbody>${linhas}
        <tr class="tot"><td colspan="2">Σ Total</td><td class="num">${fmtValor(r2(td))}</td><td class="num">${fmtValor(-r2(tc))}</td><td class="num">${fmtValor(r2(td - tc))}</td><td class="num">${fmtValor(ac)}</td></tr></tbody></table></div>
        <div class="alv-rod">Duplo clique num valor abre as partidas individuais que formam o número (${C.lista}). Saldo acumulado = desde o início do exercício.</div></div>`;
    },
    depois(ctx) {
      if (ctx.passo !== 'res') return;
      $('#tabSaldo').ondblclick = e => {
        const td = e.target.closest('td[data-per]'); if (!td) return;
        const m = +td.dataset.per; if (!m) return;
        const g = +ctx.v.gjahr;
        app.chamar(C.lista, { de: String(ctx.v[C.k]).trim(), ate: '', status: 'todas', budatDe: fmtData(td.dataset.ac ? dataISO(g, 1, 1) : dataISO(g, m, 1)), budatAte: fmtData(dataISO(g, m, ultimoDia(g, m))), auto: true });
      };
    },
    botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Executar', ic: 'exec', tecla: 'F8', acao: c => TX[tcode].f8(c) }]
      : [{ txt: 'Partidas individuais', ic: 'lista', acao: c => app.chamar(C.lista, { de: String(c.v[C.k]).trim(), status: 'todas', auto: true }) }],
    f8(ctx) { if (ctx.passo === 'ini' && saldosValido(ctx, C, tipo)) ctx.ir('res'); },
    enter(ctx) { if (ctx.passo === 'ini') TX[tcode].f8(ctx); }
  });
}
function saldosValido(ctx, C, tipo, silencioso) {
  const v = String(ctx.v[C.k] || '').trim();
  const existe = tipo === 'S' ? acharConta(app.db, v) : tipo === 'K' ? acharFornecedor(app.db, v) : acharCliente(app.db, v);
  if (silencioso) return !!existe && +ctx.v.gjahr > 0;
  if (!exigir(ctx, [[C.k, C.rot], ['gjahr', 'Exercício']])) return false;
  if (!existe) { msg('E', `${C.rot} ${v} não existe na empresa 1000.`); marcarErro(C.k); return false; }
  return true;
}
txSaldos('FS10N', 'S'); txSaldos('FK10N', 'K'); txSaldos('FD10N', 'D');

/* =================== FBL3N / FBL1N / FBL5N =================== */
function txLista(tcode, tipo) {
  const C = {
    S: { rot: 'Conta do Razão', f4: 'conta', nome: 'Exibir partidas individuais de contas do Razão', tit: 'Lista de partidas individuais de contas do Razão', prog: 'RFITEMGL' },
    K: { rot: 'Conta do fornecedor', f4: 'fornecedor', nome: 'Exibir partidas individuais de fornecedor', tit: 'Lista de partidas individuais de fornecedores', prog: 'RFITEMAP' },
    D: { rot: 'Conta do cliente', f4: 'cliente', nome: 'Exibir partidas individuais de cliente', tit: 'Lista de partidas individuais de clientes', prog: 'RFITEMAR' }
  }[tipo];
  defTx(tcode, {
    nome: C.nome, prog: C.prog,
    titulo: ctx => ctx.passo === 'ini' ? C.nome : C.tit,
    padrao: () => ({ de: '', ate: '', bukrs: '1000', status: tipo === 'S' ? 'todas' : 'ab', chave: hojeBR(), budatDe: '', budatAte: '' }),
    iniciar(ctx, p) { if (p.auto) ctx.passo = 'res'; },
    render(ctx) {
      if (ctx.passo === 'ini') {
        const sel = grupo('Seleção de contas', faixa('de', 'ate', C.rot, ctx, { larg: 10, f4: C.f4 }) + campoFixo('Empresa', '1000', nomeEmpresa()) +
          (tipo === 'S' ? '<p class="nota">Vazio = todas as contas. Só o primeiro campo = uma conta.</p>' : `<p class="nota">Vazio = todos os ${tipo === 'K' ? 'fornecedores' : 'clientes'}.</p>`));
        const status = tipo === 'S'
          ? grupo('Seleção de partidas', faixa('budatDe', 'budatAte', 'Data de lançamento', ctx, { larg: 10 }) + '<p class="nota">Deixe as datas vazias para ver tudo.</p>')
          : grupo('Status', rad('status', [['ab', 'Partidas em aberto na data fixada'], ['cp', 'Partidas compensadas'], ['todas', 'Todas as partidas']], ctx) + campo('chave', 'Abertas na data fixada', ctx, { larg: 10 }) + faixa('budatDe', 'budatAte', 'Data de lançamento', ctx, { larg: 10 }));
        return sel + status;
      }
      return `<div id="cabLista" class="cabobj"></div><div id="alvBox"></div>`;
    },
    depois(ctx) {
      if (ctx.passo !== 'res') return;
      const f = listaFiltro(ctx);
      const ls = partidas(app.db, tipo, f);
      const stTxt = { ab: `Partidas em aberto em ${fmtData(f.chave)}`, cp: 'Partidas compensadas', todas: 'Todas as partidas' }[f.status];
      $('#cabLista').innerHTML = `<span>Empresa</span><b>1000</b> ${esc(nomeEmpresa())} <span>Contas</span><b>${esc(f.de ? f.de + (f.ate ? ' a ' + f.ate : '') : 'todas')}</b> <span>Status</span><b>${esc(stTxt)}</b>${f.budatDe || f.budatAte ? ` <span>Lançamento</span><b>${fmtData(f.budatDe) || '...'} a ${fmtData(f.budatAte) || '...'}</b>` : ''}`;
      const colSt = { k: 'st', t: 'St', tipo: 'icone', fmt: v => v ? icone(v) : '', txt: v => v === 'ab' ? 'Em aberto' : v === 'cp' ? 'Compensada' : '', desc: 'Status: vermelho em aberto, verde compensada' };
      const cols = tipo === 'S'
        ? [colSt, { k: 'conta', t: 'Conta', tec: 'HKONT' }, { k: 'zuonr', t: 'Atribuição', tec: 'ZUONR' }, { k: 'belnr', t: 'Nº documento', tec: 'BELNR', lk: true }, { k: 'blart', t: 'Tp', tec: 'BLART' }, { k: 'bldat', t: 'Data doc.', tipo: 'data', tec: 'BLDAT' }, { k: 'budat', t: 'Data lçto.', tipo: 'data', tec: 'BUDAT' }, { k: 'bschl', t: 'CL', tec: 'BSCHL' }, { k: 'valor', t: 'Montante em MI', tipo: 'valor', soma: true, tec: 'DMSHB' }, { k: 'moeda', t: 'MI' }, { k: 'sgtxt', t: 'Texto', tec: 'SGTXT' }, { k: 'augbl', t: 'Doc. compensação', tec: 'AUGBL' }]
        : [colSt, { k: 'conta', t: tipo === 'K' ? 'Fornecedor' : 'Cliente', tec: tipo === 'K' ? 'LIFNR' : 'KUNNR' }, { k: 'zuonr', t: 'Atribuição', tec: 'ZUONR' }, { k: 'belnr', t: 'Nº documento', tec: 'BELNR', lk: true }, { k: 'blart', t: 'Tp', tec: 'BLART' }, { k: 'bldat', t: 'Data doc.', tipo: 'data', tec: 'BLDAT' }, { k: 'budat', t: 'Data lçto.', tipo: 'data', tec: 'BUDAT' }, { k: 'bschl', t: 'CL', tec: 'BSCHL' }, { k: 'venc', t: 'Venc. líquido', tipo: 'data', tec: 'FAEDT' }, { k: 'atraso', t: 'Atraso', tipo: 'num', tec: 'VERZN', desc: 'Dias de atraso na data fixada. Negativo = ainda vai vencer' }, { k: 'vc', t: 'Venc.', tipo: 'icone', fmt: (v, l) => l.st === 'ab' && l.venc ? icone(l.atraso > 0 ? 'vencido' : 'emdia') : '', txt: (v, l) => l.st === 'ab' && l.venc ? (l.atraso > 0 ? 'Vencida' : 'A vencer') : '' }, { k: 'valor', t: 'Montante em MI', tipo: 'valor', soma: true, tec: 'DMSHB' }, { k: 'moeda', t: 'MI' }, { k: 'sgtxt', t: 'Texto', tec: 'SGTXT' }, { k: 'augbl', t: 'Doc. compensação', tec: 'AUGBL' }];
      new ALV($('#alvBox'), {
        colunas: cols, linhas: ls, grupo: 'conta', rotGrupo: (g, l) => `Conta ${g} ${l.nome}`, temTecnico: true,
        arquivo: `${tcode}_partidas.csv`,
        duplo: l => app.chamar('FB03', { belnr: l.belnr, gjahr: String(l.gjahr), auto: true })
      }, ctx.s.alv = ctx.s.alv || {});
    },
    botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Executar', ic: 'exec', tecla: 'F8', acao: c => TX[tcode].f8(c) }] : [],
    f8(ctx) {
      if (ctx.passo !== 'ini') return;
      for (const [k, r] of [['chave', 'Data fixada'], ['budatDe', 'Data de lançamento'], ['budatAte', 'Data de lançamento']]) {
        if (String(ctx.v[k] || '').trim() && !parseData(ctx.v[k])) { msg('E', `${r}: data inválida. Use DD.MM.AAAA.`); marcarErro(k); return; }
      }
      ctx.s.alv = {};
      ctx.ir('res');
    },
    enter(ctx) { if (ctx.passo === 'ini') TX[tcode].f8(ctx); }
  });
}
function listaFiltro(ctx) {
  const v = ctx.v;
  return { de: String(v.de || '').trim(), ate: String(v.ate || '').trim(), status: v.status || 'todas', chave: parseData(v.chave) || SIM.hoje, budatDe: parseData(v.budatDe) || '', budatAte: parseData(v.budatAte) || '' };
}
txLista('FBL3N', 'S'); txLista('FBL1N', 'K'); txLista('FBL5N', 'D');

/* =================== OB52 =================== */
defTx('OB52', {
  nome: 'Períodos contábeis: abrir e fechar',
  titulo: ctx => `${ctx.s.mod ? 'Modificar' : 'Exibir'} visão "Períodos contábeis permitidos": síntese`,
  iniciar(ctx) { const p = app.db.periodos; Object.assign(ctx.v, { de: String(p.de), anoDe: String(p.anoDe), ate: String(p.ate), anoAte: String(p.anoAte) }); },
  render(ctx) {
    const dis = !ctx.s.mod;
    const c = (k, l) => inp(k, ctx, { larg: l, dis, f1: k.startsWith('ano') ? 'gjahr' : (k === 'de' ? 'perDe' : 'perAte') });
    return `<div class="alv"><div class="alv-wrap"><table class="grid"><thead><tr><th>Var.</th><th>Tp.cta.</th><th>Até conta</th><th>De per.1</th><th>Exerc.</th><th>Até per.1</th><th>Exerc.</th></tr></thead><tbody>
      <tr><td>1000</td><td>+</td><td>ZZZZZZZZZZ</td><td>${c('de', 2)}</td><td>${c('anoDe', 4)}</td><td>${c('ate', 2)}</td><td>${c('anoAte', 4)}</td></tr></tbody></table></div>
      <div class="alv-rod">Variante 1000, tipo de conta + (vale para todos os tipos). Períodos abertos hoje: ${pad(app.db.periodos.de)}/${app.db.periodos.anoDe} até ${pad(app.db.periodos.ate)}/${app.db.periodos.anoAte}.</div></div>
      ${dis ? '<p class="nota">Clique em "Exibir ↔ Modificar" para poder alterar. Grave com Ctrl+S.</p>' : '<p class="nota" style="color:var(--warn)">Modo de modificação: ajuste os períodos e grave com Ctrl+S.</p>'}`;
  },
  botoes: () => [{ txt: 'Exibir ↔ Modificar', ic: 'modificar', acao: c => { c.s.mod = !c.s.mod; render(); } }],
  gravar(ctx) {
    if (!ctx.s.mod) { msg('W', 'Entre no modo de modificação antes de gravar.'); return; }
    const n = k => parseInt(ctx.v[k], 10);
    const de = n('de'), ate = n('ate'), anoDe = n('anoDe'), anoAte = n('anoAte');
    if (![de, ate].every(x => x >= 1 && x <= 12)) { msg('E', 'Os períodos vão de 1 a 12.'); return; }
    if (![anoDe, anoAte].every(x => x >= 2020 && x <= 2030)) { msg('E', 'Informe exercícios entre 2020 e 2030.'); return; }
    if (anoDe * 100 + de > anoAte * 100 + ate) { msg('E', 'O período inicial não pode ser depois do período final.'); return; }
    app.db.periodos = { de, anoDe, ate, anoAte };
    salvarDB(app.db);
    ctx.s.mod = false; render();
    msg('S', `Os dados foram gravados. Lançamentos permitidos de ${pad(de)}/${anoDe} até ${pad(ate)}/${anoAte}.`);
    app.depoisDeGravar();
  }
});

/* =================== F.01 Balanço/DRE =================== */
defTx('F.01', {
  nome: 'Balanço/DRE', prog: 'RFBILA00',
  titulo: ctx => ctx.passo === 'ini' ? 'Balanço/DRE' : 'Balanço/DRE: lista',
  padrao: () => ({ gjahr: '2026', perDe: '1', perAte: String(Math.min(app.db.periodos.ate, 12)) }),
  render(ctx) {
    if (ctx.passo === 'ini') return grupo('Seleção de contas do Razão', campoFixo('Plano de contas', 'PCBR') + campoFixo('Empresa', '1000', nomeEmpresa())) +
      grupo('Seleção de dados', campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true }) + faixa('perDe', 'perAte', 'Períodos de relatório', ctx, { larg: 2 }) + campoFixo('Estrutura de balanço', 'BPBR', 'Estrutura Brasil (simulador)'));
    return f01HTML(app.db, +ctx.v.gjahr, +ctx.v.perDe, +ctx.v.perAte);
  },
  depois(ctx) {
    if (ctx.passo !== 'res') return;
    $$('[data-conta]').forEach(td => td.ondblclick = () => app.chamar('FS10N', { saknr: td.dataset.conta, gjahr: ctx.v.gjahr, auto: true }));
  },
  botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Executar', ic: 'exec', tecla: 'F8', acao: c => TX['F.01'].f8(c) }] : [],
  f8(ctx) {
    if (ctx.passo !== 'ini') return;
    const de = +ctx.v.perDe, ate = +ctx.v.perAte;
    if (!(+ctx.v.gjahr > 0)) { msg('E', 'Informe o exercício.'); marcarErro('gjahr'); return; }
    if (!(de >= 1 && ate <= 12 && de <= ate)) { msg('E', 'Períodos inválidos: use de 1 a 12, com o inicial menor ou igual ao final.'); marcarErro('perDe'); return; }
    ctx.ir('res');
  },
  enter(ctx) { if (ctx.passo === 'ini') TX['F.01'].f8(ctx); }
});
function f01HTML(db, g, de, ate) {
  const mapa = mapaSaldos(db, g);
  const saldo = (saknr, a, b) => { const p = mapa[saknr]; if (!p) return 0; let s = 0; for (let m = a; m <= b; m++) s += p[m].d - p[m].c; return r2(s); };
  const temMov = (saknr, a, b) => { const p = mapa[saknr]; if (!p) return false; for (let m = a; m <= b; m++) if (p[m].d || p[m].c) return true; return false; };
  const nome = no => ESTRUTURA_BAL.find(e => e.no === no).txt;
  const L = [];
  const folha = (no, a, b, extras = []) => {
    L.push({ c: 'n2', t: `${no}  ${nome(no)}` });
    let tot = 0;
    db.contas.filter(c => c.no === no).forEach(c => { if (!temMov(c.saknr, a, b)) return; const v = saldo(c.saknr, a, b); tot += v; L.push({ conta: c.saknr, t: c.txt, v }); });
    extras.forEach(x => { tot += x.v; L.push({ conta: '', t: x.t, v: x.v }); });
    tot = r2(tot);
    L.push({ c: 'sub', t: `Total ${nome(no)}`, v: tot });
    return tot;
  };
  const resAcum = resultadoPeriodo(db, g, 1, ate);
  L.push({ c: 'n1', t: '1  ATIVO' });
  const at = r2(folha('1.1', 1, ate) + folha('1.2', 1, ate));
  L.push({ c: 'tot', t: 'TOTAL DO ATIVO', v: at });
  L.push({ c: 'n1', t: '2  PASSIVO' });
  const pa = r2(folha('2.1', 1, ate) + folha('2.2', 1, ate));
  L.push({ c: 'tot', t: 'TOTAL DO PASSIVO', v: pa });
  const pl = folha('3', 1, ate, [{ t: `Resultado do exercício (períodos 01 a ${pad(ate)})`, v: resAcum }]);
  L.push({ c: 'tot', t: 'TOTAL DO PASSIVO + PATRIMÔNIO LÍQUIDO', v: r2(pa + pl) });
  const dif = r2(at + pa + pl);
  L.push({ c: Math.abs(dif) < 0.005 ? 'ok' : 'mau', t: Math.abs(dif) < 0.005 ? '✓ Ativo + passivo + PL = 0,00: o balanço fecha' : '✗ O balanço não fecha: diferença', v: dif });
  L.push({ c: 'n1', t: `4  DEMONSTRAÇÃO DO RESULTADO (períodos ${pad(de)} a ${pad(ate)})` });
  let res = 0;
  ['4.1', '4.2', '4.3', '4.4', '4.5'].forEach(no => { res += folha(no, de, ate); });
  res = r2(res);
  L.push({ c: 'tot', t: 'Resultado do período', v: res });
  L.push({ c: res <= 0 ? 'ok' : 'mau', t: res < 0 ? `Leitura: saldo credor = LUCRO de R$ ${fmtValor(-res)}` : res > 0 ? `Leitura: saldo devedor = PREJUÍZO de R$ ${fmtValor(res)}` : 'Leitura: resultado zero', v: '' });
  const cab = `${nomeEmpresa().padEnd(36)}Balanço/DRE                       Data ${hojeBR()}\nEmpresa 1000  Exercício ${g}  Períodos ${pad(de)} a ${pad(ate)}   Moeda BRL   Estrutura BPBR\nConvenção: saldo devedor sem sinal, saldo credor com - no fim. Duplo clique numa conta abre o FS10N.`;
  return `<div class="relat"><div class="cab">${esc(cab)}</div><table><tbody>${L.map(l => `<tr class="${l.c || ''}"><td style="padding-left:${l.conta !== undefined ? 34 : 8}px" ${l.conta ? `data-conta="${l.conta}" class="lk" title="Duplo clique: FS10N"` : ''}>${esc(l.conta || '')}${l.conta ? '  ' : ''}${esc(l.t)}</td><td class="num">${l.v === '' || l.v === undefined ? '' : fmtValor(l.v)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* =================== S_ALR_87012277 Balancete =================== */
defTx('S_ALR_87012277', {
  nome: 'Saldos de contas do Razão (balancete)', prog: 'RFSSLD00',
  titulo: ctx => ctx.passo === 'ini' ? 'Saldos de contas do Razão' : 'Saldos de contas do Razão: lista',
  padrao: () => ({ de: '', ate: '', gjahr: '2026', perDe: '1', perAte: String(Math.min(app.db.periodos.ate, 12)) }),
  iniciar(ctx, p) { if (p.auto) ctx.passo = 'res'; },
  render(ctx) {
    if (ctx.passo === 'ini') return grupo('Seleção de contas do Razão', faixa('de', 'ate', 'Conta do Razão', ctx, { larg: 10, f4: 'conta' }) + campoFixo('Empresa', '1000', nomeEmpresa())) +
      grupo('Seleção de dados', campo('gjahr', 'Exercício', ctx, { larg: 4, obrig: true }) + faixa('perDe', 'perAte', 'Período de relatório', ctx, { larg: 2 }));
    return '<div id="cabBal" class="cabobj"></div><div id="alvBal"></div>';
  },
  depois(ctx) {
    if (ctx.passo !== 'res') return;
    const g = +ctx.v.gjahr, de = +ctx.v.perDe, ate = +ctx.v.perAte;
    const fDe = String(ctx.v.de || '').trim(), fAte = String(ctx.v.ate || '').trim();
    const mapa = mapaSaldos(app.db, g);
    const linhas = [];
    app.db.contas.forEach(c => {
      if (fDe && !fAte && c.saknr !== fDe) return;
      if (fDe && fAte && (c.saknr < fDe || c.saknr > fAte)) return;
      const p = mapa[c.saknr]; if (!p) return;
      let ant = 0, d = 0, cr = 0;
      for (let m = 0; m < de; m++) ant += p[m].d - p[m].c;
      for (let m = de; m <= ate; m++) { d += p[m].d; cr += p[m].c; }
      if (!ant && !d && !cr) return;
      linhas.push({ saknr: c.saknr, txt: c.txt, ant: r2(ant), d: r2(d), c: r2(-cr), acum: r2(ant + d - cr) });
    });
    $('#cabBal').innerHTML = `<span>Empresa</span><b>1000</b> ${esc(nomeEmpresa())} <span>Exercício</span><b>${g}</b> <span>Períodos</span><b>${pad(de)} a ${pad(ate)}</b> <span>Moeda</span><b>BRL</b>`;
    new ALV($('#alvBal'), {
      colunas: [{ k: 'saknr', t: 'Conta', tec: 'RACCT', lk: true }, { k: 'txt', t: 'Texto breve' }, { k: 'ant', t: 'Saldo anterior', tipo: 'valor', soma: true }, { k: 'd', t: 'Débito período', tipo: 'valor', soma: true }, { k: 'c', t: 'Crédito período', tipo: 'valor', soma: true }, { k: 'acum', t: 'Saldo acumulado', tipo: 'valor', soma: true }],
      linhas, arquivo: `balancete_${g}_${pad(de)}-${pad(ate)}.csv`, rodape: 'o total do saldo acumulado tem que ser 0,00',
      duplo: l => app.chamar('FS10N', { saknr: l.saknr, gjahr: String(g), auto: true })
    }, ctx.s.alv = ctx.s.alv || {});
  },
  botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Executar', ic: 'exec', tecla: 'F8', acao: c => TX.S_ALR_87012277.f8(c) }] : [],
  f8(ctx) {
    if (ctx.passo !== 'ini') return;
    const de = +ctx.v.perDe, ate = +ctx.v.perAte;
    if (!(de >= 1 && ate <= 12 && de <= ate)) { msg('E', 'Períodos inválidos: use de 1 a 12.'); marcarErro('perDe'); return; }
    ctx.s.alv = {};
    ctx.ir('res');
  },
  enter(ctx) { if (ctx.passo === 'ini') TX.S_ALR_87012277.f8(ctx); }
});

/* =================== SE16N =================== */
const _bseg = (db, f) => { const out = []; db.docs.forEach(d => d.itens.forEach(it => { if (!f || f(it, d)) out.push({ d, it }); })); return out; };
const _linhaBseg = ({ d, it }) => ({ BUKRS: d.bukrs, BELNR: d.belnr, GJAHR: d.gjahr, BUZEI: pad(it.buzei, 3), BSCHL: it.bschl, KOART: it.koart, SHKZG: it.shkzg, DMBTR: it.valor, HKONT: it.hkont, LIFNR: it.lifnr, KUNNR: it.kunnr, ZUONR: it.zuonr, SGTXT: it.sgtxt, AUGBL: it.augbl, AUGDT: it.augdt, ZFBDT: it.zfbdt, ZBD1T: it.koart === 'S' ? '' : it.dias, BUDAT: d.budat, BLDAT: d.bldat, BLART: d.blart });
const TABELAS = {
  BKPF: { desc: 'Cabeçalho do documento contábil', campos: [['BUKRS', 'Empresa'], ['BELNR', 'Nº documento'], ['GJAHR', 'Exercício'], ['BLART', 'Tipo de documento'], ['BLDAT', 'Data do documento', 'd'], ['BUDAT', 'Data de lançamento', 'd'], ['MONAT', 'Período'], ['CPUDT', 'Data de entrada', 'd'], ['USNAM', 'Usuário'], ['XBLNR', 'Referência'], ['BKTXT', 'Texto de cabeçalho'], ['STBLG', 'Doc. de estorno'], ['STGRD', 'Motivo do estorno'], ['WAERS', 'Moeda']],
    linhas: db => db.docs.map(d => ({ BUKRS: d.bukrs, BELNR: d.belnr, GJAHR: d.gjahr, BLART: d.blart, BLDAT: d.bldat, BUDAT: d.budat, MONAT: pad(d.monat), CPUDT: d.cpudt, USNAM: d.usnam, XBLNR: d.xblnr, BKTXT: d.bktxt, STBLG: d.stblg || d.estornoDe, STGRD: d.stgrd, WAERS: 'BRL' })) },
  BSEG: { desc: 'Segmento do documento contábil (itens)', campos: [['BUKRS', 'Empresa'], ['BELNR', 'Nº documento'], ['GJAHR', 'Exercício'], ['BUZEI', 'Item'], ['BSCHL', 'Chave de lançamento'], ['KOART', 'Tipo de conta'], ['SHKZG', 'Débito/crédito (S/H)'], ['DMBTR', 'Montante em moeda interna', 'v'], ['HKONT', 'Conta do Razão'], ['LIFNR', 'Fornecedor'], ['KUNNR', 'Cliente'], ['ZUONR', 'Atribuição'], ['SGTXT', 'Texto do item'], ['AUGBL', 'Doc. de compensação'], ['AUGDT', 'Data de compensação', 'd'], ['ZFBDT', 'Data base p/ vencimento', 'd'], ['ZBD1T', 'Dias de prazo']],
    linhas: db => _bseg(db).map(_linhaBseg) },
  SKAT: { desc: 'Mestre de contas do Razão: denominação', campos: [['SPRAS', 'Idioma'], ['KTOPL', 'Plano de contas'], ['SAKNR', 'Conta do Razão'], ['TXT20', 'Texto breve'], ['TXT50', 'Texto descritivo']],
    linhas: db => db.contas.map(c => ({ SPRAS: 'PT', KTOPL: 'PCBR', SAKNR: c.saknr, TXT20: c.txt, TXT50: c.longo })) },
  SKB1: { desc: 'Mestre de contas do Razão: dados da empresa', campos: [['BUKRS', 'Empresa'], ['SAKNR', 'Conta do Razão'], ['WAERS', 'Moeda'], ['MITKZ', 'Conta de reconciliação p/ tipo'], ['XOPVW', 'Adm. partidas em aberto'], ['ZUAWA', 'Chave de ordenação'], ['XSPEB', 'Bloqueada p/ lançamento']],
    linhas: db => db.contas.map(c => ({ BUKRS: '1000', SAKNR: c.saknr, WAERS: 'BRL', MITKZ: c.recon, XOPVW: c.xopvw ? 'X' : '', ZUAWA: c.zuawa, XSPEB: c.bloqueada ? 'X' : '' })) },
  LFA1: { desc: 'Mestre de fornecedores: dados gerais', campos: [['LIFNR', 'Fornecedor'], ['NAME1', 'Nome'], ['STRAS', 'Rua'], ['ORT01', 'Cidade'], ['REGIO', 'Região'], ['PSTLZ', 'Código postal'], ['LAND1', 'País'], ['STCD1', 'CNPJ']],
    linhas: db => db.fornecedores.map(f => ({ LIFNR: f.lifnr, NAME1: f.nome, STRAS: f.rua, ORT01: f.cidade, REGIO: f.uf, PSTLZ: f.cep, LAND1: 'BR', STCD1: f.cnpj })) },
  LFB1: { desc: 'Mestre de fornecedores: dados da empresa', campos: [['LIFNR', 'Fornecedor'], ['BUKRS', 'Empresa'], ['AKONT', 'Conta de reconciliação'], ['ZTERM', 'Condição de pagamento'], ['ZUAWA', 'Chave de ordenação']],
    linhas: db => db.fornecedores.map(f => ({ LIFNR: f.lifnr, BUKRS: '1000', AKONT: f.conta, ZTERM: f.zterm, ZUAWA: '012' })) },
  KNA1: { desc: 'Mestre de clientes: dados gerais', campos: [['KUNNR', 'Cliente'], ['NAME1', 'Nome'], ['STRAS', 'Rua'], ['ORT01', 'Cidade'], ['REGIO', 'Região'], ['PSTLZ', 'Código postal'], ['LAND1', 'País'], ['STCD1', 'CNPJ']],
    linhas: db => db.clientes.map(c => ({ KUNNR: c.kunnr, NAME1: c.nome, STRAS: c.rua, ORT01: c.cidade, REGIO: c.uf, PSTLZ: c.cep, LAND1: 'BR', STCD1: c.cnpj })) },
  KNB1: { desc: 'Mestre de clientes: dados da empresa', campos: [['KUNNR', 'Cliente'], ['BUKRS', 'Empresa'], ['AKONT', 'Conta de reconciliação'], ['ZTERM', 'Condição de pagamento'], ['ZUAWA', 'Chave de ordenação']],
    linhas: db => db.clientes.map(c => ({ KUNNR: c.kunnr, BUKRS: '1000', AKONT: c.conta, ZTERM: c.zterm, ZUAWA: '012' })) },
  BSIK: { desc: 'Fornecedores: partidas em aberto', campos: [['BUKRS', 'Empresa'], ['LIFNR', 'Fornecedor'], ['ZUONR', 'Atribuição'], ['GJAHR', 'Exercício'], ['BELNR', 'Nº documento'], ['BUZEI', 'Item'], ['BUDAT', 'Data de lançamento', 'd'], ['BLDAT', 'Data do documento', 'd'], ['BLART', 'Tipo de documento'], ['BSCHL', 'Chave de lançamento'], ['SHKZG', 'Débito/crédito'], ['DMBTR', 'Montante em MI', 'v'], ['SGTXT', 'Texto'], ['ZFBDT', 'Data base vencimento', 'd'], ['ZBD1T', 'Dias']],
    linhas: db => _bseg(db, it => it.koart === 'K' && !it.augbl).map(_linhaBseg) },
  BSAK: { desc: 'Fornecedores: partidas compensadas', campos: [['BUKRS', 'Empresa'], ['LIFNR', 'Fornecedor'], ['AUGDT', 'Data de compensação', 'd'], ['AUGBL', 'Doc. de compensação'], ['ZUONR', 'Atribuição'], ['GJAHR', 'Exercício'], ['BELNR', 'Nº documento'], ['BUZEI', 'Item'], ['BUDAT', 'Data de lançamento', 'd'], ['BLART', 'Tipo de documento'], ['BSCHL', 'Chave de lançamento'], ['SHKZG', 'Débito/crédito'], ['DMBTR', 'Montante em MI', 'v'], ['SGTXT', 'Texto']],
    linhas: db => _bseg(db, it => it.koart === 'K' && it.augbl).map(_linhaBseg) },
  BSID: { desc: 'Clientes: partidas em aberto', campos: [['BUKRS', 'Empresa'], ['KUNNR', 'Cliente'], ['ZUONR', 'Atribuição'], ['GJAHR', 'Exercício'], ['BELNR', 'Nº documento'], ['BUZEI', 'Item'], ['BUDAT', 'Data de lançamento', 'd'], ['BLDAT', 'Data do documento', 'd'], ['BLART', 'Tipo de documento'], ['BSCHL', 'Chave de lançamento'], ['SHKZG', 'Débito/crédito'], ['DMBTR', 'Montante em MI', 'v'], ['SGTXT', 'Texto'], ['ZFBDT', 'Data base vencimento', 'd'], ['ZBD1T', 'Dias']],
    linhas: db => _bseg(db, it => it.koart === 'D' && !it.augbl).map(_linhaBseg) },
  BSAD: { desc: 'Clientes: partidas compensadas', campos: [['BUKRS', 'Empresa'], ['KUNNR', 'Cliente'], ['AUGDT', 'Data de compensação', 'd'], ['AUGBL', 'Doc. de compensação'], ['ZUONR', 'Atribuição'], ['GJAHR', 'Exercício'], ['BELNR', 'Nº documento'], ['BUZEI', 'Item'], ['BUDAT', 'Data de lançamento', 'd'], ['BLART', 'Tipo de documento'], ['BSCHL', 'Chave de lançamento'], ['SHKZG', 'Débito/crédito'], ['DMBTR', 'Montante em MI', 'v'], ['SGTXT', 'Texto']],
    linhas: db => _bseg(db, it => it.koart === 'D' && it.augbl).map(_linhaBseg) },
  T001B: { desc: 'Períodos contábeis permitidos', campos: [['BUKRS', 'Variante'], ['MKOAR', 'Tipo de conta'], ['FRPE1', 'De período'], ['FRYE1', 'De exercício'], ['TOPE1', 'Até período'], ['TOYE1', 'Até exercício']],
    linhas: db => [{ BUKRS: '1000', MKOAR: '+', FRPE1: pad(db.periodos.de, 3), FRYE1: db.periodos.anoDe, TOPE1: pad(db.periodos.ate, 3), TOYE1: db.periodos.anoAte }] }
};
function se16Valor(tipo, v) { return tipo === 'd' ? fmtData(v) : tipo === 'v' ? fmtValor(v) : String(v ?? ''); }
function se16Casa(filtro, texto) {
  const f = filtro.trim().toUpperCase(), t = String(texto).toUpperCase();
  if (!f) return true;
  if (f.includes('*')) return new RegExp('^' + f.split('*').map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(t);
  return t === f;
}
defTx('SE16N', {
  nome: 'Browser de dados (tabelas)', prog: 'SAPLSE16N',
  titulo: ctx => ctx.passo === 'ini' ? 'Visualização geral de tabelas' : `Visualização da tabela ${ctx.v.tabela.toUpperCase()}`,
  padrao: () => ({ tabela: '', max: '500' }),
  render(ctx) {
    if (ctx.passo === 'ini') {
      const t = TABELAS[String(ctx.v.tabela || '').trim().toUpperCase()];
      let crit = '';
      if (t) crit = grupo('Critérios de seleção', `<table class="grid"><thead><tr><th>Campo</th><th>Descrição</th><th>Valor (use * como curinga)</th></tr></thead><tbody>${t.campos.map(([c, d]) => `<tr><td class="tec">${c}</td><td>${esc(d)}</td><td>${inp('sel_' + c, ctx, { larg: 20 })}</td></tr>`).join('')}</tbody></table><p class="nota">Datas no formato DD.MM.AAAA. Montantes como aparecem na lista (ex.: 4.500,00). F8 executa.</p>`);
      return grupo('Tabela', campo('tabela', 'Tabela', ctx, { larg: 10, obrig: true, f4: 'tabela', desc: 'tabela' }) + campo('max', 'Nº máximo de ocorrências', ctx, { larg: 6 })) + crit +
        (t ? '' : '<p class="nota">Informe a tabela e tecle Enter para ver os campos. F4 lista as tabelas disponíveis no simulador.</p>');
    }
    return '<div id="alvSE16"></div>';
  },
  depois(ctx) {
    if (ctx.passo !== 'res') return;
    const nomeT = ctx.v.tabela.toUpperCase(), t = TABELAS[nomeT];
    const max = Math.max(1, parseInt(ctx.v.max, 10) || 500);
    const filtros = t.campos.map(([c, , tp]) => [c, tp, String(ctx.v['sel_' + c] || '')]).filter(f => f[2].trim());
    const todas = t.linhas(app.db).filter(l => filtros.every(([c, tp, f]) => se16Casa(f, se16Valor(tp, l[c]))));
    const ls = todas.slice(0, max);
    new ALV($('#alvSE16'), {
      colunas: t.campos.map(([c, d, tp]) => ({ k: c, t: d, tec: c, tipo: tp === 'v' ? 'valor' : tp === 'd' ? 'data' : undefined, desc: d })),
      linhas: ls, totais: false, temTecnico: true, tecnico: true, arquivo: `${nomeT}.csv`,
      rodape: `tabela ${nomeT}: ${todas.length} ocorrências encontradas${todas.length > max ? `, mostrando ${max}` : ''}`,
      duplo: ls.length && ls[0].BELNR !== undefined ? l => app.chamar('FB03', { belnr: l.BELNR, gjahr: String(l.GJAHR), auto: true }) : null
    }, ctx.s.alv = ctx.s.alv || {});
    msg('S', `Número de ocorrências: ${todas.length}`);
  },
  botoes: ctx => ctx.passo === 'ini' ? [{ txt: 'Executar', ic: 'exec', tecla: 'F8', acao: c => TX.SE16N.f8(c) }] : [],
  enter(ctx) {
    if (ctx.passo !== 'ini') return;
    const n = String(ctx.v.tabela || '').trim().toUpperCase();
    if (!n) { msg('E', 'Preencha o campo obrigatório "Tabela".'); marcarErro('tabela'); return; }
    if (!TABELAS[n]) { msg('E', `A tabela ${n} não está disponível no simulador. Use F4 para ver a lista.`); marcarErro('tabela'); return; }
    ctx.v.tabela = n; render();
  },
  f8(ctx) {
    if (ctx.passo !== 'ini') return;
    const n = String(ctx.v.tabela || '').trim().toUpperCase();
    if (!TABELAS[n]) { TX.SE16N.enter(ctx); return; }
    ctx.v.tabela = n; ctx.s.alv = {};
    ctx.ir('res');
  }
});
