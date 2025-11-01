// Helper: query selector safe
const $ = (sel, ctx = document) => ctx.querySelector(sel);

// Variáveis de Elementos DOM
const modalReserva = document.getElementById("reservaModal");
const modalDetalhes = document.getElementById("detalhesModal");
// Seleciona todos os botões de fechar
const closeButtons = document.querySelectorAll(".close-modal, .close-reserva, .close-config, .close"); 
const dataInput = document.getElementById("dataReserva");
const horarios = document.getElementById("horarioReserva");
const reservaForm = document.getElementById("reservaForm");
const salaTituloModal = document.getElementById("salaTituloModal"); // Elemento para o título

// VARIÁVEIS GLOBAIS
let salas = []; 
let salaSelecionadaId = null; // CRÍTICO: Variável para armazenar o ID da sala selecionada

// --- Funções Auxiliares ---

// Função para fechar qualquer modal
function fecharModal(modalElement) {
    if (modalElement && modalElement.style.display === "flex") {
        modalElement.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

// Abre o modal de reserva e armazena o ID da sala
function abrirModalReserva(salaId) {
    const sala = salas.find((s) => s.id == salaId);
    if (!sala) return;
    
    // CRÍTICO: Armazena o ID da sala na variável global e no dataset do formulário
    salaSelecionadaId = sala.id;
    if (reservaForm) reservaForm.dataset.salaId = sala.id;

    if (salaTituloModal) {
      salaTituloModal.textContent = `Sala ${sala.numero} - Bloco ${sala.bloco}`;
    }

    modalReserva.style.display = "flex";
    document.body.style.overflow = "hidden";
}

// Função de conversão de data
// Converte DD/MM/YYYY para YYYY-MM-DD
function convertToISO(dateString) {
    if (!dateString) return '';
    // Verifica se já está no formato ISO (YYYY-MM-DD)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;

    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; 
    }
    return ''; 
}

// --- Lógica de Carregamento e Renderização ---

function renderSalas(containerId, statusFilter) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    if (!salas || salas.length === 0) {
        container.innerHTML = `<p class="no-rooms">Nenhuma sala cadastrada ou erro no carregamento.</p>`;
        return;
    }

    // Filtra as salas pelo status (Disponível ou Reservada)
    const filteredSalas = salas.filter((sala) => (sala.status || 'Disponível') === statusFilter); 

    if (filteredSalas.length === 0) {
        const message = statusFilter === "Disponível" ? "Nenhuma sala disponível no momento." : "Nenhuma sala reservada no momento.";
        container.innerHTML = `<p class="no-rooms">${message}</p>`;
        return;
    }

    filteredSalas.forEach((sala) => {
        const card = document.createElement("div");
        card.classList.add("room-card");
        
        const isReserved = sala.status === "Reservada";
        const buttonClass = isReserved ? "ghost btn-detalhes" : "btn-reservar";
        const buttonText = isReserved ? "Ver mais" : "Reservar";

        // Aqui usamos sala.id 
        card.innerHTML = `
            <div class="card-header">SALA ${sala.numero} - Bloco ${sala.bloco || 'A'}</div>
            <p><strong>Andar:</strong> ${sala.andar}º</p>
            <p><strong>Capacidade:</strong> ${sala.capacidade} Alunos</p>
            <p><strong>Período:</strong> ${sala.periodo || 'Indefinido'}</p>
            
            <button class="btn small ${buttonClass}" data-sala-id="${sala.id}">
                ${buttonText}
            </button>
        `;
        container.appendChild(card);
    });
    
    // Adiciona listeners aos botões de reserva
    container.querySelectorAll(".btn-reservar").forEach((btn) => {
        btn.addEventListener("click", function () {
            const salaId = this.dataset.salaId;
            abrirModalReserva(salaId);
        });
    });

    // ... (Lógica para btn-detalhes se necessário)
}

async function carregarDadosIniciais() {
    const containerDisponiveis = document.getElementById("listaSalas"); // Container para disponíveis
    const containerReservadas = document.getElementById("salasReservadas"); // Container para reservadas
    
    if (!containerDisponiveis) return;
    
    containerDisponiveis.innerHTML = `<p class="loading-message">Carregando salas...</p>`;
    if (containerReservadas) containerReservadas.innerHTML = `<p class="loading-message">Carregando salas reservadas...</p>`;

    try {
        // 1. Busca as Salas
        const responseSalas = await fetch("/api/salas"); 
        const dataSalas = await responseSalas.json();

        if (!responseSalas.ok || !dataSalas.success) {
            throw new Error(dataSalas.message || `Falha ao buscar salas: Status ${responseSalas.status}`);
        }
        
        // Adaptação dos dados
        salas = dataSalas.salas.map(s => ({
            id: s.salasID || s.id, // Suporte para 'salasID' ou 'id'
            numero: s.numero,
            andar: s.andar,
            capacidade: s.capacidade,
            bloco: s.bloco,
            // O status deve vir do backend
            status: s.status || 'Disponível', 
            periodo: s.periodo 
        }));
       const salasDisponiveis = salas.filter(s => s.status === "Disponível").length;
const salasReservadas = salas.filter(s => s.status === "Reservada").length;
const capacidadeTotal = salas.reduce((sum, s) => sum + (parseInt(s.capacidade) || 0), 0);
const reservasSemana = salasReservadas; // Se você tiver API de reservas da semana, trocamos depois.

// Atualiza no DOM
$("#countDisponiveis").textContent = `${salasDisponiveis} Salas`;
$("#countReservadas").textContent = `${salasReservadas} Salas`;
$("#capacidadeTotal").textContent = `${capacidadeTotal} Alunos`;
$("#reservasSemana").textContent = `${reservasSemana} Agendamentos`;

    } catch (error) {
        console.error("Erro fatal ao carregar dados iniciais da API:", error);
        containerDisponiveis.innerHTML = `<p class="no-rooms">Erro ao carregar dados: ${error.message}.</p>`;
        if (containerReservadas) containerReservadas.innerHTML = "";
        salas = [];
        return;
    }
    
    // CRÍTICO: Renderiza em containers separados
    renderSalas("listaSalas", "Disponível"); 
    if (containerReservadas) {
        renderSalas("salasReservadas", "Reservada"); 
    }
}


// --- Lógica de Submissão da Reserva (CORRIGIDA E COMPLETA) ---

if (reservaForm) {
  reservaForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 1. Coleta e Valida ID da Sala
    const salaID = this.dataset.salaId || salaSelecionadaId; 
    
    if (!salaID || isNaN(parseInt(salaID))) {
        alert("Erro: ID da sala inválido ou ausente.");
        return;
    }

    // 2. Coleta dados do formulário
    const solicitante = $("#solicitante").value.trim();
    const dataDisplay = $("#dataReserva").value; // Em DD/MM/YYYY (se for Flatpickr) ou YYYY-MM-DD
    const horario = $("#horarioReserva").value; // Ex: "08:00 - 10:00"

    if (!solicitante || !dataDisplay || !horario) {
      alert("Por favor, preencha todos os campos do formulário de reserva.");
      return;
    }

    // 3. Converte a data para o formato seguro (YYYY-MM-DD)
    const dataBackend = convertToISO(dataDisplay);
    if (!dataBackend || dataBackend.split('-').length !== 3) {
      alert("Erro de formato de data. Por favor, selecione uma data válida.");
      return;
    }
    
    // 4. Extrai a hora de início para o backend
    const horarioInicio = horario.split(' - ')[0]; // Pega "08:00" de "08:00 - 10:00"

    const dadosReserva = {
      salaID: parseInt(salaID), 
      data: dataBackend, // YYYY-MM-DD
      horario: horarioInicio, // HH:MM
      periodo: horario.split(' - ')[0] + ' - ' + horario.split(' - ')[1], // Ex: '08:00 - 10:00'
      solicitante: solicitante
    };
    
    try {
      // 5. REQUISIÇÃO PARA O BACKEND
      const response = await fetch('/api/reservar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosReserva)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Status: ${response.status} ${response.statusText}`);
      }

      // SUCESSO
      alert(`✅ Reserva confirmada! Sala ${salaID} reservada por ${solicitante}.`);
      await carregarDadosIniciais(); // Recarrega os dados

    } catch (error) {
      console.error("Erro fatal na reserva:", error);
      alert(`❌ Erro ao confirmar a reserva. Detalhes: ${error.message}.`);
      return; 
    }
    
    // FECHA MODAL E LIMPA
    fecharModal(modalReserva);
    reservaForm.reset();
  });
}


// --- Inicialização ---

document.addEventListener("DOMContentLoaded", () => {
    // Definir data mínima como hoje (útil para input type="date")
    if (dataInput && dataInput.type === 'date') {
        const today = new Date().toISOString().split("T")[0];
        dataInput.setAttribute("min", today);
    }
    
    carregarDadosIniciais();

    // Lógica para fechar modais
    closeButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            const modal = this.closest(".reserva-modal") || this.closest("#reservaModal") || this.closest("#detalhesModal");
            fecharModal(modal);
        });
    });
    
    // Se você estiver usando Flatpickr (descomente e adicione o script do flatpickr no seu HTML)
    // if (typeof flatpickr !== 'undefined') {
    //     flatpickr("#dataReserva", {
    //         dateFormat: "d/m/Y",
    //         locale: "pt", 
    //         minDate: "today"
    //     });
    // }
    
});