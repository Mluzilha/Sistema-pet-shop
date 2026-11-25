'use strict';

/* ---------- Configurações do agendamento ---------- */
const SERVICOS = {
  banho: { nome: 'Banho', preco: 60 },
  tosa: { nome: 'Tosa', preco: 80 },
};
const TAXA_TELEBUSCA = 10;
const METODOS = { telebusca: 'Tele-busca', entrega: 'Entrega no local' };
const HORARIOS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const DIAS_ANTECEDENCIA = 60;      // até quantos dias à frente é possível agendar
const CHAVE = 'monacopet_agendamentos';

/* ---------- Funções de data (sempre no fuso local, nunca em UTC) ---------- */

/** Date -> "AAAA-MM-DD" usando a data local do visitante. */
function paraIso(data) {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

/** "AAAA-MM-DD" -> Date local (meia-noite). */
function deIso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** "2026-11-18" -> "quarta-feira, 18/11/2026" */
function formatarData(iso) {
  const data = deIso(iso);
  const semana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${semana}, ${data.toLocaleDateString('pt-BR')}`;
}

const formatarReais = (valor) => 'R$ ' + valor.toFixed(2).replace('.', ',');

/* ---------- Dados salvos ---------- */
const lerAgendamentos = () => lerArmazenado(CHAVE, []);

/** Horários já reservados em um dia. */
function horariosOcupados(iso) {
  return lerAgendamentos().filter((a) => a.data === iso).map((a) => a.hora);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formAgendamento');
  const msg = document.getElementById('msg-agendamento');
  const nomeTutor = document.getElementById('nomeTutor');
  const telefone = document.getElementById('telefoneTutor');
  const nomePet = document.getElementById('nomePetAg');
  const campoData = document.getElementById('dataAgendamento');
  const campoHora = document.getElementById('horario');
  const enderecoBusca = document.getElementById('enderecoBusca');
  const blocoTele = document.getElementById('bloco-telebusca');
  const blocoLocal = document.getElementById('bloco-local');
  const lista = document.getElementById('lista-agendamentos');
  const semAgendamentos = document.getElementById('sem-agendamentos');

  const servicoEscolhido = () => (form.querySelector('input[name="servico"]:checked') || {}).value;
  const metodoEscolhido = () => (form.querySelector('input[name="metodo"]:checked') || {}).value;

  /* ----- Calendário: limites do campo de data ----- */
  const hoje = new Date();
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + DIAS_ANTECEDENCIA);
  campoData.min = paraIso(hoje);
  campoData.max = paraIso(limite);

  /* ----- Preenchimento automático com o cadastro (se houver) ----- */
  const cadastro = lerArmazenado('monacopet_cadastro', null);
  if (cadastro) {
    nomeTutor.value = cadastro.cliente.nome;
    telefone.value = cadastro.cliente.telefone;
    nomePet.value = cadastro.pet.nome;
    enderecoBusca.value = cadastro.cliente.endereco;
  }

  /* ----- Serviço vindo da URL (servicos.html?servico=tosa) ----- */
  const doLink = new URLSearchParams(window.location.search).get('servico');
  if (doLink === 'banho' || doLink === 'tosa') {
    document.getElementById(doLink === 'banho' ? 'servicoBanho' : 'servicoTosa').checked = true;
  }

  /* ----- Máscara simples do telefone (mesma regra do cadastro) ----- */
  telefone.addEventListener('input', () => {
    const d = telefone.value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) telefone.value = d.length ? `(${d}` : '';
    else if (d.length <= 6) telefone.value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length <= 10) telefone.value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else telefone.value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  });

  /* ----- Método: mostra o campo certo ----- */
  function atualizarMetodo() {
    const tele = metodoEscolhido() === 'telebusca';
    blocoTele.classList.toggle('d-none', !tele);
    blocoLocal.classList.toggle('d-none', metodoEscolhido() !== 'entrega');
    enderecoBusca.required = tele;        // só é obrigatório na tele-busca
  }

  /* ----- Dia: valida e recria a lista de horários ----- */
  function validarData() {
    campoData.setCustomValidity('');
    if (!campoData.value) return;
    const data = deIso(campoData.value);
    if (LOJA.diasFechado.includes(data.getDay())) {
      campoData.setCustomValidity('Não atendemos aos domingos');
    } else if (campoData.value < campoData.min || campoData.value > campoData.max) {
      campoData.setCustomValidity('Data fora do período de agendamento');
    }
  }

  function montarHorarios() {
    const anterior = campoHora.value;
    campoHora.innerHTML = '';

    const dataOk = campoData.value && campoData.checkValidity();
    const primeira = new Option(dataOk ? 'Selecione um horário...' : 'Escolha primeiro um dia válido', '', true, true);
    primeira.disabled = true;
    campoHora.add(primeira);
    if (!dataOk) return;

    const ocupados = horariosOcupados(campoData.value);
    const ehHoje = campoData.value === paraIso(new Date());
    const agora = new Date();
    let livres = 0;

    HORARIOS.forEach((hora) => {
      const horaNumero = Number(hora.slice(0, 2));
      // Se for hoje, só vale horário com pelo menos 1 hora de antecedência
      const passou = ehHoje && horaNumero * 60 < agora.getHours() * 60 + agora.getMinutes() + 60;
      const ocupado = ocupados.includes(hora);
      const opcao = new Option(ocupado ? `${hora} (ocupado)` : passou ? `${hora} (indisponível)` : hora, hora);
      opcao.disabled = ocupado || passou;
      if (!opcao.disabled) livres++;
      campoHora.add(opcao);
    });

    // Mantém o horário escolhido antes, se ele ainda estiver livre
    const manter = [...campoHora.options].find((o) => o.value === anterior && !o.disabled);
    if (manter) manter.selected = true;
    if (livres === 0) campoHora.options[0].text = 'Sem horários neste dia, escolha outro';
  }

  /* ----- Resumo ao vivo ----- */
  function atualizarResumo() {
    const s = servicoEscolhido();
    const m = metodoEscolhido();
    document.getElementById('resumo-servico').textContent = s ? `${SERVICOS[s].nome} (${formatarReais(SERVICOS[s].preco)})` : '-';
    document.getElementById('resumo-metodo').textContent = m ? `${METODOS[m]}${m === 'telebusca' ? ` (taxa ${formatarReais(TAXA_TELEBUSCA)})` : ''}` : '-';
    document.getElementById('resumo-data').textContent = campoData.value && campoData.checkValidity() ? formatarData(campoData.value) : '-';
    document.getElementById('resumo-horario').textContent = campoHora.value || '-';
    const total = (s ? SERVICOS[s].preco : 0) + (m === 'telebusca' ? TAXA_TELEBUSCA : 0);
    document.getElementById('resumo-total').textContent = formatarReais(total);
  }

  function atualizarTudo() {
    atualizarMetodo();
    validarData();
    atualizarResumo();
  }

  form.querySelectorAll('input[name="servico"], input[name="metodo"]').forEach((r) => r.addEventListener('change', atualizarTudo));
  campoData.addEventListener('change', () => { validarData(); montarHorarios(); atualizarResumo(); });
  campoHora.addEventListener('change', atualizarResumo);

  /* ----- Lista "Meus agendamentos" ----- */
  function mostrarAgendamentos() {
    const todos = lerAgendamentos().sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    lista.innerHTML = '';
    semAgendamentos.classList.toggle('d-none', todos.length > 0);

    todos.forEach((ag) => {
      const item = document.createElement('li');
      item.className = 'list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2';

      const texto = document.createElement('div');
      const titulo = document.createElement('strong');
      titulo.textContent = `${SERVICOS[ag.servico].nome} de ${ag.pet}`;
      texto.append(titulo, document.createElement('br'),
        `${formatarData(ag.data)} às ${ag.hora} · ${METODOS[ag.metodo]} · ${formatarReais(ag.total)}`);
      if (ag.metodo === 'telebusca') texto.append(document.createElement('br'), `Buscar em: ${ag.endereco}`);

      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'btn btn-sm btn-outline-danger';
      cancelar.textContent = 'Cancelar';
      cancelar.setAttribute('aria-label', `Cancelar ${SERVICOS[ag.servico].nome.toLowerCase()} de ${ag.pet} em ${ag.data.split('-').reverse().join('/')} às ${ag.hora}`);
      cancelar.addEventListener('click', () => {
        if (!window.confirm('Deseja cancelar este agendamento?')) return;
        salvarArmazenado(CHAVE, lerAgendamentos().filter((a) => a.id !== ag.id));
        mostrarAgendamentos();
        montarHorarios();
        atualizarResumo();
      });

      item.append(texto, cancelar);
      lista.append(item);
    });
  }

  /* ----- Envio ----- */
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    atualizarTudo();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      const invalido = form.querySelector(':invalid');
      if (invalido) invalido.focus();
      return;
    }

    // Confere de novo se o horário continua livre (outra aba pode ter reservado)
    if (horariosOcupados(campoData.value).includes(campoHora.value)) {
      montarHorarios();
      campoHora.setCustomValidity('Horário ocupado');
      campoHora.focus();
      return;
    }
    campoHora.setCustomValidity('');

    const s = servicoEscolhido();
    const m = metodoEscolhido();
    const agendamento = {
      id: Date.now(),
      servico: s,
      metodo: m,
      data: campoData.value,
      hora: campoHora.value,
      tutor: nomeTutor.value.trim(),
      telefone: telefone.value,
      pet: nomePet.value.trim(),
      endereco: m === 'telebusca' ? enderecoBusca.value.trim() : '',
      total: SERVICOS[s].preco + (m === 'telebusca' ? TAXA_TELEBUSCA : 0),
    };

    const lista2 = lerAgendamentos();
    lista2.push(agendamento);
    const salvou = salvarArmazenado(CHAVE, lista2);

    msg.textContent = '';
    const titulo = document.createElement('strong');
    titulo.textContent = 'Agendamento confirmado!';
    msg.append(titulo,
      ` ${SERVICOS[s].nome} de ${agendamento.pet}, ${formatarData(agendamento.data)} às ${agendamento.hora}, ` +
      `${m === 'telebusca' ? 'com tele-busca' : 'com entrega no local'}. Total: ${formatarReais(agendamento.total)}.`);
    if (!salvou) msg.append(' (Seu navegador bloqueou o armazenamento; o agendamento não ficará salvo neste aparelho.)');
    msg.classList.remove('d-none');
    msg.focus();
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });

    form.classList.remove('was-validated');
    campoData.value = '';
    campoHora.value = '';
    document.querySelectorAll('input[name="servico"], input[name="metodo"]').forEach((r) => { r.checked = false; });
    montarHorarios();
    atualizarTudo();
    mostrarAgendamentos();
  });

  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    msg.classList.add('d-none');
    setTimeout(() => { atualizarTudo(); montarHorarios(); }, 0);
  });

  /* ----- Início ----- */
  atualizarTudo();
  montarHorarios();
  mostrarAgendamentos();
});
