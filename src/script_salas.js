// Cadastro de salas
const cadastroForm = document.querySelector('#formCadastro');
cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const numero = cadastroForm.querySelector('#numero').value;
    const andar = cadastroForm.querySelector('#andar').value;
    const capacidade = cadastroForm.querySelector('#capacidade').value;
    const bloco = cadastroForm.querySelector('#bloco').value;
    try{
        await fetch('/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({numero, andar, capacidade, bloco})
        });
        window.load = '/';
    }
    catch(err){
        console.error("Erro ao carregar salas:", err)
    }
});

const result = response.json();

      if (response.ok) {
        // Adiciona a sala localmente (se necessário)
        salas.push({ numero, andar, capacidade, bloco });
        $('#mensagem', cadastroForm).textContent = "Sala cadastrada com sucesso!";
        $('#mensagem', cadastroForm).className = "mensagem sucesso";

        // Exibe os dados na tela (exemplo: em um elemento específico)
        const displayElement = document.createElement('div');
        displayElement.innerHTML = `
          <p>Número: ${numero}</p>
          <p>Andar: ${andar}</p>
          <p>Capacidade: ${capacidade}</p>
          <p>Bloco: ${bloco}</p>
        `;
        document.querySelector('.content-area').appendChild(displayElement);

        // Re-renderiza as seções
        renderSalas("salasDisponiveis", "Disponível");
        renderSalas("salasReservadas", "Reservada");

        cadastroForm.reset();
        setTimeout(() => {
          $('#mensagem', cadastroForm).textContent = "";
          displayElement.remove(); // Remove a exibição após 3 segundos
        }, 3000);
      } else {
        $('#mensagem', cadastroForm).textContent = `Erro: ${result.error || 'Falha ao cadastrar.'}`;
        $('#mensagem', cadastroForm).className = "mensagem erro";
      }