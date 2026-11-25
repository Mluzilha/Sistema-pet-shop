/* ==========================================================================
   produtos.js - filtro de produtos por categoria (página produtos.html).
   Os botões têm data-filtro="racao|brinquedos|higiene|todos" e cada cartão
   tem data-categoria com o mesmo valor. Também lê ?categoria=... da URL,
   para que os botões do carrossel já abram a página filtrada.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const botoes = document.querySelectorAll('[data-filtro]');
  const produtos = document.querySelectorAll('.produto');
  const contagem = document.getElementById('contagem-produtos');

  /** Mostra só os produtos da categoria escolhida e atualiza os botões. */
  function filtrar(categoria) {
    let visiveis = 0;
    produtos.forEach((item) => {
      const mostrar = categoria === 'todos' || item.dataset.categoria === categoria;
      item.classList.toggle('d-none', !mostrar);
      if (mostrar) visiveis++;
    });

    botoes.forEach((botao) => {
      const ativo = botao.dataset.filtro === categoria;
      botao.setAttribute('aria-pressed', String(ativo));
      botao.classList.toggle('btn-primary', ativo);
      botao.classList.toggle('btn-outline-primary', !ativo);
    });

    // Texto lido por leitores de tela (aria-live) quando o filtro muda
    contagem.textContent = visiveis === 1 ? 'Mostrando 1 produto.' : `Mostrando ${visiveis} produtos.`;
  }

  botoes.forEach((botao) => botao.addEventListener('click', () => filtrar(botao.dataset.filtro)));

  // Filtro inicial vindo da URL (ex.: produtos.html?categoria=higiene)
  const inicial = new URLSearchParams(window.location.search).get('categoria');
  const validas = ['racao', 'brinquedos', 'higiene'];
  filtrar(validas.includes(inicial) ? inicial : 'todos');
});
