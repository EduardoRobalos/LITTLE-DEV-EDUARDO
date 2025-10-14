
const formUpload = document.getElementById('formUpload');
const resultadoDiv = document.getElementById('resultado');
const tabelaBody = document.querySelector('#tabelaArquivos tbody');
const loadingDiv = document.getElementById('loading');

function formatarData(dataString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

const routes = {
    '/': 'home.html',
    '/configuracoes': 'configuracoes.html'
  };
  
  async function navigateTo(path) {
    const html = await fetch(routes[path]).then(res => res.text());
    document.getElementById('mainContent').innerHTML = html;
    window.history.pushState({}, '', path);
  }
  
  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname);
  });
  

async function listarSalasDeCadastro() {
    // 1. Seleciona o corpo da tabela no HTML. 
    // Certifique-se de que a tabela com o ID 'tabelaCadastroSalas' existe no seu index.html (veja o Passo 2).
    const tabelaCorpo = document.querySelector('#tabelaCadastroSalas tbody');

    try {
        const response = await fetch('/api/cadastro-salas');
        const data = await response.json();

        if (response.ok && data.success) {
            console.log('Salas de cadastro (sucesso):', data.salas);

            if (tabelaCorpo) {
                tabelaCorpo.innerHTML = ''; // Limpa qualquer conteúdo existente na tabela
                
                // 2. Itera sobre os dados e cria uma linha (<tr>) para cada sala
                data.salas.forEach(sala => {
                    const row = document.createElement('tr');
                    
                    // Os campos 'numero', 'andar', 'bloco', 'tipo' vêm da sua query no index.js
                    row.innerHTML = `
                        <td>${sala.numero}</td>
                        <td>${sala.andar}</td>
                        <td>${sala.bloco}</td>
                        <td>${sala.tipo}</td>
                    `;
                    tabelaCorpo.appendChild(row);
                });
            }

        } else {
            console.error('Erro ao carregar cadastro de salas:', data.message);
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar cadastro de salas:', error);
    }
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

// ... (mantenha todo o código existente, incluindo setupDownloadButtons) ...

// Função para filtrar os cards de salas (Disponíveis e Reservadas)
function filterRooms(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    // Seleciona todos os cards de salas (Disponíveis e Reservadas)
    const roomCards = document.querySelectorAll('.rooms-section .room-card');

    roomCards.forEach(card => {
        // Pega todo o texto do card (título e parágrafos)
        const cardText = card.textContent.toLowerCase();
        
        if (cardText.includes(term) || term === '') {
            card.style.display = 'block'; // Mostra o card
        } else {
            card.style.display = 'none'; // Oculta o card
        }
    });
}

// Event Listeners para a nova barra de pesquisa
function setupDownloadButtons() {
    // ... (coloque o código da sua função setupDownloadButtons aqui se ela existir)
    // Se não existir, a chamada em loadRooms() dará erro. Por enquanto, vamos deixá-la vazia.
}

// ... (Mantenha as funções createRoomCard, filterRooms, etc., que já existem) ...

async function loadRooms() {
    const availableGrid = document.getElementById('availableRoomsGrid');
    const reservedList = document.getElementById('reservedRoomsList');
    
    // Verificação para garantir que os elementos existem na página atual
    if (!availableGrid || !reservedList) {
        console.log("Elementos de salas não encontrados nesta página. Ignorando o carregamento de salas.");
        return;
    }

    const navigationButtons = availableGrid.querySelector('.room-navigation');
    availableGrid.innerHTML = ''; // Limpa, mas mantém a referência dos botões
    if(navigationButtons) availableGrid.appendChild(navigationButtons);
    reservedList.innerHTML = ''; 

    try {
        const response = await fetch('/rooms');
        const data = await response.json();

        if (response.ok && data.success) {
            console.log('DADOS RECEBIDOS PELO FRONT-END:', data.rooms.length, 'salas.');

            if (data.rooms.length === 0) {
                availableGrid.insertAdjacentHTML('afterbegin', '<p>Nenhuma sala disponível encontrada.</p>');
            }

            data.rooms.forEach(room => {
                const card = createRoomCard(room); // Sua função createRoomCard
                if (room.status === 'Reservada') {
                    reservedList.appendChild(card);
                } else {
                    if(navigationButtons) availableGrid.insertBefore(card, navigationButtons);
                    else availableGrid.appendChild(card);
                }
            });
            
            // setupDownloadButtons(); // Ativa os botões de download nos novos cards
        } else {
             console.error('Erro de API no Front-end:', data.message);
             availableGrid.innerHTML = `<p class="error">Erro ao carregar salas: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Erro crítico no fetch de salas:', error);
        availableGrid.innerHTML = `<p class="error">Não foi possível conectar ao servidor para buscar as salas.</p>`;
    }
}


// VERSÃO CORRIGIDA E UNIFICADA
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega as salas do banco de dados na página principal
    loadRooms(); 

    // 2. Carrega a lista de arquivos de cadastro (se estiver na página correta)
    listarSalasDeCadastro();
    listarArquivos(); // Se a tabela de arquivos também estiver na mesma página

    // 3. Configura a lógica de pesquisa
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            filterRooms(searchInput.value);
        });

        searchInput.addEventListener('keyup', function() {
            filterRooms(this.value);
        });
    }
});