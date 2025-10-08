
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
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup dos botões de download (código que você já tinha)
    setupDownloadButtons();
    
    // 2. Lógica de pesquisa
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    // Previne o envio do formulário (que recarregaria a página) e aplica o filtro
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        filterRooms(searchInput.value);
    });

    // Filtra em tempo real enquanto o usuário digita
    searchInput.addEventListener('keyup', function() {
        filterRooms(this.value);
    });
    
    // ... o restante do seu código DOMContentLoaded (como listarArquivos)
});

function createRoomCard(room) {
    const isReserved = room.status === 'Reservada';
    
    // Constrói o HTML do card com base no status
    const cardClass = isReserved ? 'room-card reserved-card' : 'room-card';
    const content = `
        <div class="card-header">SALA ${room.numero}</div>
        <p>Andar: ${room.andar}º</p>
        <p>Capacidade: ${room.capacidade} Alunos</p>
        ${isReserved && room.reservation ? 
            `<p>Período: ${room.reservation.periodo}</p>` : 
            `<p>Período: Manhã E Tarde</p>` // Valor estático se a sala estiver disponível
        }
        ${!isReserved ? 
            // Usa o ID da sala como data-file-id para o download (simulando que o material está associado à sala)
            `<button class="download-icon" data-file-id="${room.id}"><i class="fas fa-download"></i></button>` : 
            ''
        }
    `;

    const cardElement = document.createElement('div');
    cardElement.className = cardClass;
    cardElement.innerHTML = content;
    return cardElement;
}

// Função para buscar e carregar os dados das salas do banco
async function loadRooms() {
    const availableGrid = document.getElementById('availableRoomsGrid');
    const reservedList = document.getElementById('reservedRoomsList');
    
    // Limpa o conteúdo existente, mantendo os botões de navegação na seção Disponíveis
    const navigationButtons = availableGrid.querySelector('.room-navigation');
    availableGrid.innerHTML = '';
    availableGrid.appendChild(navigationButtons); 

    reservedList.innerHTML = ''; 

    try {
        const response = await fetch('/rooms');
        const data = await response.json();

        if (response.ok && data.success) {
            data.rooms.forEach(room => {
                const card = createRoomCard(room);
                if (room.status === 'Reservada') {
                    reservedList.appendChild(card);
                } else {
                    // Insere os cards disponíveis antes dos botões de navegação
                    availableGrid.insertBefore(card, navigationButtons);
                }
            });
            
            // Re-aplica a lógica de download aos novos cards
            setupDownloadButtons();

        } else {
            availableGrid.innerHTML = `<p class="error">Erro ao carregar salas: ${data.message}</p>`;
            reservedList.innerHTML = '';
        }
    } catch (error) {
        console.error('Erro no fetch de salas:', error);
        availableGrid.innerHTML = `<p class="error">Erro de conexão com o servidor.</p>`;
        reservedList.innerHTML = '';
    }
}


// NOVO BLOCO DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carregar as salas do banco de dados (NOVO)
    loadRooms(); 

    // 2. Lógica de pesquisa (mantida e agora funciona com cards dinâmicos)
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    searchForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        filterRooms(searchInput.value);
    });

    searchInput.addEventListener('keyup', function() {
        filterRooms(this.value);
    });
    
    // Nota: A função listarArquivos() original não está sendo chamada aqui, 
    // mas pode ser reinserida se você tiver a parte de upload na mesma página.
});
