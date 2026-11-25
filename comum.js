/* ==========================================================================
   comum.js - funções usadas em TODAS as páginas da Monacopet Store.
   - Armazenamento seguro (localStorage com proteção contra falhas)
   - Funções temporais: saudação, relógio, "aberto agora", promoção do dia
   - Acessibilidade: tamanho da fonte e modo de alto contraste
   - Rodapé: ano atual
   Este arquivo deve ser carregado ANTES dos scripts específicos de cada página.
   ========================================================================== */

'use strict';

/* ---------- Configurações da loja (altere aqui se mudar o horário) ---------- */
const LOJA = {
  abre: 9,            // abre às 9h
  fecha: 19,          // fecha às 19h
  diasFechado: [0],   // 0 = domingo
};

/* ---------- 1. Armazenamento seguro ----------
   O localStorage pode estar bloqueado (aba anônima, por exemplo).
   Estas funções evitam que o site quebre nesses casos. */
function lerArmazenado(chave, padrao) {
  try {
    const texto = localStorage.getItem(chave);
    return texto === null ? padrao : JSON.parse(texto);
  } catch (erro) {
    return padrao;
  }
}

function salvarArmazenado(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    return false;
  }
}

/* ---------- 2. Funções temporais ---------- */

/** Retorna "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora do visitante. */
function obterSaudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Diz se a loja está aberta no momento informado. */
function lojaEstaAberta(data = new Date()) {
  const dia = data.getDay();
  const hora = data.getHours() + data.getMinutes() / 60;
  return !LOJA.diasFechado.includes(dia) && hora >= LOJA.abre && hora < LOJA.fecha;
}

/** Texto do status da loja, ex.: "Aberto agora · fechamos às 19h". */
function textoStatusLoja(data = new Date()) {
  if (lojaEstaAberta(data)) {
    return { aberto: true, texto: `Aberto agora · fechamos às ${LOJA.fecha}h` };
  }
  // Procura o próximo dia em que a loja abre
  const nomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const hora = data.getHours() + data.getMinutes() / 60;
  if (!LOJA.diasFechado.includes(data.getDay()) && hora < LOJA.abre) {
    return { aberto: false, texto: `Fechado · abrimos hoje às ${LOJA.abre}h` };
  }
  for (let i = 1; i <= 7; i++) {
    const proximo = new Date(data.getFullYear(), data.getMonth(), data.getDate() + i);
    if (!LOJA.diasFechado.includes(proximo.getDay())) {
      const quando = i === 1 ? 'amanhã' : nomes[proximo.getDay()];
      return { aberto: false, texto: `Fechado · abrimos ${quando} às ${LOJA.abre}h` };
    }
  }
  return { aberto: false, texto: 'Fechado' };
}

/** Promoção que muda de acordo com o dia da semana (função temporal). */
function promocaoDoDia(data = new Date()) {
  const promocoes = {
    0: 'Domingo: estamos fechados, mas você já pode agendar para a semana!',
    1: 'Segunda: 5% de desconto em rações para gatos.',
    2: 'Terça: 10% de desconto no banho.',
    3: 'Quarta: tele-busca com taxa reduzida na primeira vez.',
    4: 'Quinta: 10% de desconto na tosa.',
    5: 'Sexta: brinquedos com 15% de desconto.',
    6: 'Sábado: banho + tosa com horário especial. Agende já!',
  };
  return promocoes[data.getDay()];
}

/** Formata data e hora por extenso, ex.: "terça-feira, 17 de novembro de 2026 · 20:10". */
function formatarDataHora(data = new Date()) {
  const dia = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

/** Atualiza saudação, relógio, status da loja e promoção (cada um só se existir na página). */
function atualizarTemporais() {
  const agora = new Date();

  const saudacao = document.getElementById('saudacao');
  if (saudacao) saudacao.textContent = `${obterSaudacao(agora)}! Seja bem-vindo(a) à Monacopet Store.`;

  const relogio = document.getElementById('data-hora');
  if (relogio) relogio.textContent = formatarDataHora(agora);

  const selo = document.getElementById('status-loja');
  if (selo) {
    const status = textoStatusLoja(agora);
    selo.textContent = status.texto;
    selo.classList.toggle('aberto', status.aberto);
    selo.classList.toggle('fechado', !status.aberto);
  }

  const promo = document.getElementById('promocao-dia');
  if (promo) promo.textContent = promocaoDoDia(agora);
}

/* ---------- 3. Acessibilidade ---------- */
const TAMANHOS_FONTE = [100, 112.5, 125, 150];   // porcentagens do tamanho padrão

/** Aplica o tamanho de fonte escolhido (índice da lista acima) e lembra a escolha. */
function aplicarTamanhoFonte(indice) {
  const i = Math.max(0, Math.min(TAMANHOS_FONTE.length - 1, indice));
  document.documentElement.style.fontSize = TAMANHOS_FONTE[i] + '%';
  salvarArmazenado('monacopet_fonte', i);
  return i;
}

/** Liga/desliga o alto contraste e lembra a escolha. */
function aplicarContraste(ativo) {
  document.body.classList.toggle('alto-contraste', ativo);
  const botao = document.getElementById('btn-contraste');
  if (botao) botao.setAttribute('aria-pressed', String(ativo));
  salvarArmazenado('monacopet_contraste', ativo);
}

function iniciarAcessibilidade() {
  let indiceFonte = aplicarTamanhoFonte(lerArmazenado('monacopet_fonte', 0));
  aplicarContraste(lerArmazenado('monacopet_contraste', false));

  const mais = document.getElementById('btn-fonte-mais');
  const menos = document.getElementById('btn-fonte-menos');
  const contraste = document.getElementById('btn-contraste');

  if (mais) mais.addEventListener('click', () => { indiceFonte = aplicarTamanhoFonte(indiceFonte + 1); });
  if (menos) menos.addEventListener('click', () => { indiceFonte = aplicarTamanhoFonte(indiceFonte - 1); });
  if (contraste) contraste.addEventListener('click', () => {
    aplicarContraste(!document.body.classList.contains('alto-contraste'));
  });
}

/* ---------- 4. Carrossel: respeita quem prefere menos movimento ---------- */
function iniciarCarrossel() {
  const carrossel = document.getElementById('carrosselMonacopet');
  const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (carrossel && reduzido && window.bootstrap) {
    bootstrap.Carousel.getOrCreateInstance(carrossel).pause();
  }
}

/* ---------- 5. Inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  iniciarAcessibilidade();
  iniciarCarrossel();
  atualizarTemporais();
  setInterval(atualizarTemporais, 30000);       // atualiza a cada 30 segundos

  const ano = document.getElementById('ano-atual');
  if (ano) ano.textContent = new Date().getFullYear();
});
