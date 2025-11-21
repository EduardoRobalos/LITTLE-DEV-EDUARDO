const cadastroForm = document.querySelector('#formCadastro');

cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const numero = document.querySelector('#numero').value.trim();
    const andar = document.querySelector('#andar').value.trim();
    const capacidade = document.querySelector('#capacidade').value.trim();
    const bloco = document.querySelector('#bloco').value.trim();
    const mensagem = document.querySelector('#mensagem');

    if (!numero || !andar || !capacidade || !bloco) {
        mensagem.textContent = "Preencha todos os campos!";
        mensagem.className = "mensagem erro";
        return;
    }

    try {
        const response = await fetch('/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero, andar, capacidade, bloco })
        });

        const result = await response.json();

        if (response.ok) {
            mensagem.textContent = "Sala cadastrada com sucesso!";
            mensagem.className = "mensagem sucesso";

            cadastroForm.reset();

            setTimeout(() => {
                mensagem.textContent = "";
            }, 3000);
        } else {
            mensagem.textContent = `Erro: ${result.error || 'Falha ao cadastrar.'}`;
            mensagem.className = "mensagem erro";
        }

    } catch (err) {
        console.error("Erro ao cadastrar sala:", err);
        mensagem.textContent = "Erro ao conectar com o servidor.";
        mensagem.className = "mensagem erro";
    }
});

