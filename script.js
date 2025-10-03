
const formUpload = document.getElementById('formUpload');
const resultadoDiv = document.getElementById('resultado');
const tabelaBody = document.querySelector('#tabelaArquivos tbody');
const loadingDiv = document.getElementById('loading');

function formatarData(dataString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

formUpload.addEventListener('submit', async function(event) {
    event.preventDefault();

    resultadoDiv.className = '';
    resultadoDiv.textContent = 'Enviando arquivo para o servidor...';
    
    const formData = new FormData(this);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData 
        });

        const data = await response.json();

        if (response.ok && data.success) {
            resultadoDiv.textContent = `Sucesso! Arquivo salvo com ID: ${data.id}.`;
            resultadoDiv.classList.add('success');

            listarArquivos(); 
        } else {
            resultadoDiv.textContent = `Erro ao salvar: ${data.message || 'Erro de rede ou servidor.'}`;
            resultadoDiv.classList.add('error');
        }
    } catch (error) {
        resultadoDiv.textContent = `Erro de conexão: ${error.message}`;
        resultadoDiv.classList.add('error');
        console.error('Erro no fetch de upload:', error);
    }
});

async function listarArquivos() {
    loadingDiv.style.display = 'block';
    tabelaBody.innerHTML = ''; 

    try {
        const response = await fetch('/arquivos');
        const data = await response.json();

        if (response.ok && data.success) {
            if (data.arquivos.length === 0) {
                tabelaBody.innerHTML = '<tr><td colspan="5">Nenhum arquivo encontrado.</td></tr>';
                return;
            }

            data.arquivos.forEach(arquivo => {
                const row = tabelaBody.insertRow();
                row.insertCell().textContent = arquivo.id;
                row.insertCell().textContent = arquivo.nome;
                row.insertCell().textContent = arquivo.tipo_mime;
                row.insertCell().textContent = formatarData(arquivo.data_upload);
                
                const acaoCell = row.insertCell();
                const downloadLink = document.createElement('a');
                downloadLink.href = `/arquivo/${arquivo.id}`; 
                downloadLink.textContent = 'Baixar';
                downloadLink.setAttribute('download', arquivo.nome); 
                acaoCell.appendChild(downloadLink);
            });

        } else {
            tabelaBody.innerHTML = `<tr><td colspan="5" class="error">Erro ao carregar a lista: ${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Erro no fetch de listagem:', error);
        tabelaBody.innerHTML = `<tr><td colspan="5" class="error">Erro de conexão com o servidor.</td></tr>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', listarArquivos);