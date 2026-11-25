/* ==========================================================================
   cadastro.js - formulário de cadastro do cliente e do pet (cadastro.html).
   - Máscaras automáticas de CPF, telefone e CEP
   - Validação do CPF (dígitos verificadores), da idade do cliente e da idade do pet
   - Validação do Bootstrap (classe "was-validated") e mensagens de erro
   - Guarda o cadastro no navegador (localStorage) para o agendamento reaproveitar
   Depende de comum.js (lerArmazenado / salvarArmazenado).
   ========================================================================== */

'use strict';

/* ---------- Máscaras ---------- */

/** Mantém só os dígitos de um texto. */
const apenasDigitos = (texto) => texto.replace(/\D/g, '');

/** 12345678909 -> 123.456.789-09 */
function mascaraCPF(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** 51999990000 -> (51) 99999-0000 (aceita fixo de 8 dígitos também) */
function mascaraTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 90619900 -> 90619-900 */
function mascaraCEP(valor) {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/* ---------- Validações ---------- */

/** Confere os dois dígitos verificadores do CPF. */
function cpfValido(cpf) {
  const d = apenasDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;   // 11 dígitos e não todos iguais

  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/** Calcula a idade em anos completos a partir de "AAAA-MM-DD". */
function calcularIdade(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCadastro');
  const msg = document.getElementById('msg-cadastro');
  const cpf = document.getElementById('cpf');
  const telefone = document.getElementById('telefone');
  const cep = document.getElementById('cep');
  const nascimento = document.getElementById('dataNascimento');
  const idade = document.getElementById('idade');
  const unidade = document.getElementById('unidadeIdade');
  const erroIdade = document.getElementById('erro-idade');

  // A data de nascimento não pode ser no futuro (limite do calendário)
  const hoje = new Date();
  nascimento.max = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  /* ----- Máscaras enquanto digita ----- */
  cpf.addEventListener('input', () => { cpf.value = mascaraCPF(cpf.value); validarCampos(); });
  telefone.addEventListener('input', () => { telefone.value = mascaraTelefone(telefone.value); });
  cep.addEventListener('input', () => { cep.value = mascaraCEP(cep.value); });

  /* ----- Regras que o HTML sozinho não consegue conferir ----- */
  function validarCampos() {
    // CPF: dígitos verificadores
    cpf.setCustomValidity(cpf.value && !cpfValido(cpf.value) ? 'CPF inválido' : '');

    // Cliente maior de idade
    if (nascimento.value) {
      const anos = calcularIdade(nascimento.value);
      nascimento.setCustomValidity(anos < 18 || anos > 120 ? 'Cliente deve ter 18 anos ou mais' : '');
    } else {
      nascimento.setCustomValidity('');
    }

    // Idade do pet: limite muda conforme a unidade (anos ou meses)
    const limite = unidade.value === 'meses' ? 24 : 30;
    idade.max = limite;
    erroIdade.textContent = `Informe a idade (0 a ${limite} ${unidade.value}).`;
  }

  [nascimento, unidade, idade].forEach((campo) => campo.addEventListener('input', validarCampos));
  unidade.addEventListener('change', validarCampos);
  validarCampos();

  /* ----- Envio ----- */
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    validarCampos();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      // Leva o foco ao primeiro campo com erro, para quem usa teclado ou leitor de tela
      const invalido = form.querySelector(':invalid');
      if (invalido) invalido.focus();
      return;
    }

    const dados = new FormData(form);
    const cadastro = {
      cliente: {
        nome: dados.get('nomeCliente').trim(),
        cpf: dados.get('cpf'),
        nascimento: dados.get('dataNascimento'),
        sexo: dados.get('sexo'),
        telefone: dados.get('telefone'),
        email: dados.get('email').trim(),
        cep: dados.get('cep'),
        endereco: `${dados.get('endereco').trim()} - ${dados.get('bairro').trim()}, ${dados.get('cidade').trim()}/${dados.get('uf')}`,
        contato: dados.getAll('contato'),
        promocoes: dados.get('promocoes') === 'on',
      },
      pet: {
        nome: dados.get('nomePet').trim(),
        especie: dados.get('especie'),
        raca: dados.get('raca').trim(),
        idade: `${dados.get('idade')} ${dados.get('unidadeIdade')}`,
        porte: dados.get('porte'),
        peso: dados.get('peso'),
        observacoes: dados.get('observacoes').trim(),
      },
      cadastradoEm: new Date().toISOString(),
    };

    // Guarda o último cadastro (usado no agendamento) e a lista de clientes por CPF
    const salvou = salvarArmazenado('monacopet_cadastro', cadastro);
    const clientes = lerArmazenado('monacopet_clientes', []).filter((c) => c.cliente.cpf !== cadastro.cliente.cpf);
    clientes.push(cadastro);
    salvarArmazenado('monacopet_clientes', clientes);

    // Mensagem de sucesso (textContent evita inserir HTML digitado pelo usuário)
    msg.textContent = '';
    const titulo = document.createElement('strong');
    titulo.textContent = 'Cadastro realizado com sucesso!';
    msg.append(titulo, ` ${cadastro.cliente.nome} e ${cadastro.pet.nome} já estão cadastrados. `);
    if (!salvou) msg.append('(Seu navegador bloqueou o armazenamento; os dados não ficarão salvos neste aparelho.) ');
    const link = document.createElement('a');
    link.href = 'agendamento.html';
    link.className = 'alert-link';
    link.textContent = 'Agendar um serviço agora';
    msg.append(link, '.');
    msg.classList.remove('d-none');
    msg.focus();
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });

    form.reset();
    form.classList.remove('was-validated');
    validarCampos();
  });

  // Botão "Limpar": remove também as marcas de validação
  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    msg.classList.add('d-none');
    setTimeout(validarCampos, 0);
  });
});
