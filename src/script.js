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
    
    // Filtra as salas. O status é definido pelo backend: 'Reservada' ou 'Disponível'
    const filteredSalas = salas.filter((sala) => (sala.status || 'Disponível') === statusFilter); 

    if (!filteredSalas || filteredSalas.length === 0) {
        // ... (Mensagens de "Nenhuma sala disponível/reservada")
        container.innerHTML = `<p class="no-rooms">Nenhuma sala ${statusFilter === 'Disponível' ? 'disponível' : 'reservada'} no momento.</p>`;
        return;
    }

    filteredSalas.forEach((sala) => {
        const card = document.createElement("div");
        card.classList.add("room-card");
        
        const isReserved = sala.status === "Reservada";
        
        // --- HTML dos Botões de Ação ---
        let actionButtonsHTML = '';
        
        if (isReserved) {
            // Botão para Cancelar Reserva (para salas no container 'Salas Reservadas')
            // O ID da reserva (sala.reservaID) é CRÍTICO para esta ação
            actionButtonsHTML = `
                <button class="btn small btn-cancelar-reserva" data-reserva-id="${sala.reservaID || ''}">
                    Cancelar Reserva
                </button>
            `;
        } else {
            // Botão/Ícone para Excluir Sala (para salas no container 'Salas Disponíveis')
            // Requer a biblioteca Font Awesome linkada no salas.html
            actionButtonsHTML = `
                <button class="btn-excluir" title="Excluir Sala" data-sala-id="${sala.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        }

        // --- Montagem do Card ---
        card.innerHTML = `
            <div class="card-header">
                SALA ${sala.numero} - Bloco ${sala.bloco || 'A'}
                
                ${!isReserved ? actionButtonsHTML : ''} </div>
            <p><strong>Andar:</strong> ${sala.andar}º</p>
            <p><strong>Capacidade:</strong> ${sala.capacidade} Alunos</p>
            <p><strong>Período:</strong> ${sala.periodo || 'Indefinido'}</p>
            
            ${isReserved ? actionButtonsHTML : ''} <button class="btn small ${isReserved ? "ghost btn-detalhes" : "btn-reservar"}" 
                    data-sala-id="${sala.id}" 
                    data-reserva-id="${sala.reservaID || ''}" 
                    data-is-reserved="${isReserved}">
                ${isReserved ? "Ver mais" : "Reservar"}
            </button>
            
        `;
        container.appendChild(card);
    });
    
    // 2. Adiciona Listeners para Reservar (Se já não estiver)
    container.querySelectorAll(".btn-reservar").forEach((btn) => {
        btn.addEventListener("click", function () {
            abrirModalReserva(this.dataset.salaId);
        });
    });

    // 3. Adiciona Listener para Excluir Sala
    container.querySelectorAll(".btn-excluir").forEach((btn) => {
        btn.addEventListener("click", function () {
            const salaId = this.dataset.salaId;
            if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a Sala ID ${salaId}?`)) {
                excluirSala(salaId);
            }
        });
    });

    // 4. Adiciona Listener para Cancelar Reserva
    container.querySelectorAll(".btn-cancelar-reserva").forEach((btn) => {
        btn.addEventListener("click", function () {
            const reservaId = this.dataset.reservaId;
            if (confirm(`Tem certeza que deseja CANCELAR a reserva ID ${reservaId}? A sala voltará a ser DISPONÍVEL.`)) {
                cancelarReserva(reservaId);
            }
        });
    });
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
const elDisponiveis   = document.getElementById("countDisponiveis");
const elReservadas    = document.getElementById("countReservadas");
const elCapacidade    = document.getElementById("capacidadeTotal");
const elSemana        = document.getElementById("reservasSemana");

// Se a página não tiver os cards (ex: salas.html), não faz nada → evita erro
if (elDisponiveis && elReservadas && elCapacidade && elSemana) {
    elDisponiveis.textContent = `${salasDisponiveis} Salas`;
    elReservadas.textContent = `${salasReservadas} Salas`;
    elCapacidade.textContent = `${capacidadeTotal} Alunos`;
    elSemana.textContent = `${reservasSemana} Agendamentos`;
}


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
    carregarProximasReservas();
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

async function carregarProximasReservas() {
  const container = document.getElementById("listaProximasReservas");
  if (!container) return;

  container.innerHTML = `<p class="loading-message">Carregando reservas...</p>`;

  try {
    const response = await fetch("/api/proximas-reservas");
    const data = await response.json();

    if (!data.success || data.reservas.length === 0) {
      container.innerHTML = `<p class="no-rooms">Nenhuma reserva futura.</p>`;
      return;
    }

    container.innerHTML = "";

    data.reservas.forEach(r => {
      const dataObj = new Date(r.data);
      const dia = dataObj.getDate();
      const mes = dataObj.toLocaleString("pt-BR", { month: "short" });

      container.innerHTML += `
        <div class="reserva-card">
          <div class="reserva-data">
            <div class="dia">${dia}</div>
            <div class="mes">${mes}</div>
          </div>

          <div class="reserva-info">
            <h4>Sala ${r.numero} - Bloco ${r.bloco}</h4>
            <p><strong>Horário:</strong> ${r.horario}</p>
            <p><strong>Responsável:</strong> ${r.solicitante}</p>
          </div>
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = `<p class="no-rooms">Erro ao carregar reservas.</p>`;
  }
}

async function excluirSala(salaId) {
    try {
        const response = await fetch(`/api/salas/${salaId}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Falha ao excluir sala.');
        }

        alert(`✅ Sala ID ${salaId} excluída com sucesso!`);
        await carregarDadosIniciais(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao excluir sala:", error);
        alert(`❌ Erro ao excluir sala. Detalhes: ${error.message}`);
    }
}

async function cancelarReserva(reservaId) {
    try {
        const response = await fetch(`/api/reservas/cancelar/${reservaId}`, {
            method: 'PUT', // Usa PUT ou POST para atualizar o status
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Falha ao cancelar reserva.');
        }

        alert(`✅ Reserva ID ${reservaId} cancelada. Sala agora disponível!`);
        await carregarDadosIniciais(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao cancelar reserva:", error);
        alert(`❌ Erro ao cancelar reserva. Detalhes: ${error.message}`);
    }
}

// script.js (Adicione após a declaração das suas variáveis DOM)

// ... (seus 'const' e 'let' globais)

// Funções para Dark Mode
function toggleDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');

    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        toggleDarkMode(true);
        if (themeToggle) themeToggle.checked = true;
    } else {
        if (themeToggle) themeToggle.checked = false;
    }

    // 2. Listener para o botão de alternância
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            toggleDarkMode(this.checked);
        });
    }
});

function applyTheme() {
    const body = document.body;
    const themeToggle = document.getElementById("theme-toggle");

    // Tenta obter a preferência do usuário, assume "false" (tema claro) se não houver
    let isDarkMode = localStorage.getItem('darkMode') === 'true';

    // Sincroniza o estado do switch (checkbox)
    if (themeToggle) {
        themeToggle.checked = isDarkMode;
    }

    // Aplica ou remove a classe 'dark-mode'
    if (isDarkMode) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

function setupThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const isDarkMode = themeToggle.checked;
            // Salva a preferência no armazenamento local (localStorage)
            localStorage.setItem('darkMode', isDarkMode);
            // Aplica o tema imediatamente
            applyTheme();
        });
    }
}

 // Abre/fecha modal e alternância de abas
document.addEventListener("DOMContentLoaded", () => {
 const configButtons = document.querySelectorAll("#configButton");
  const modal = $("#configModal");
  const closeBtn = $("#closeConfig");

  // open handlers
  configButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (modal) modal.style.display = "flex";
    });
  });

  // close X
  if (closeBtn)
    closeBtn.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
    });

  // close ao clicar fora
  if (modal)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

  // abas do modal
  const tabs = document.querySelectorAll(".config-sidebar li");
  const configContent = $("#configContent");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      if (configContent) {
        if (name === "geral") {
          configContent.querySelector("h2").textContent =
            "Configurações — Geral";
        } else {
          configContent.querySelector("h2").textContent =
            "Configurações — Personalizar";
        }
      }
    });
  });

  // Tema
  const themeToggle = $("#theme-toggle");
  const root = document.documentElement;
  const saved = localStorage.getItem("site-theme") || "light";
  applyTheme();
    setupThemeToggle();(saved);

  if (themeToggle) {
    themeToggle.checked = saved === "dark";
    themeToggle.addEventListener("change", (e) => {
      const v = e.target.checked ? "dark" : "light";
      applyTheme(v);
      localStorage.setItem("site-theme", v);
    });
  }// Abre/fecha modal e alternância de abas
document.addEventListener("DOMContentLoaded", () => {
  const configButtons = document.querySelectorAll("#btnConfig");
  const modal = $("#configModal");
  const closeBtn = $("#closeConfig");
  configModal.removeAttribute("aria-hidden");

  // open handlers
  configButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (modal) modal.style.display = "flex";
    });
  });

  // close X
  if (closeBtn)
    closeBtn.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
    });

  // close ao clicar fora
  if (modal)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

  // abas do modal
  const tabs = document.querySelectorAll(".config-sidebar li");
  const configContent = $("#configContent");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      if (configContent) {
        if (name === "geral") {
          configContent.querySelector("h2").textContent =
            "Configurações — Geral";
        } else {
          configContent.querySelector("h2").textContent =
            "Configurações — Personalizar";
        }
      }
    });
  });

// Aplica tema
function applyTheme(mode) {
  if (mode === "dark") {
    document.documentElement.style.setProperty("--primary-color", "#0f274f");
    document.documentElement.style.setProperty("--secondary-color", "#3467f0");
    document.documentElement.style.setProperty("--background-color", "#0b0f1a");
    document.documentElement.style.setProperty("--card-bg", "#0f1724");
    document.documentElement.style.setProperty("--text-color", "#e6eef8");
    document.documentElement.style.setProperty("--light-text-color", "#97a3c1");
    document.documentElement.style.setProperty(
      "--sidebar-active-bg",
      "#0b1838"
    );
  } else {
    document.documentElement.style.setProperty("--primary-color", "#17307a");
    document.documentElement.style.setProperty("--secondary-color", "#3a86ff");
    document.documentElement.style.setProperty("--background-color", "#f6f7fb");
    document.documentElement.style.setProperty("--card-bg", "#ffffff");
    document.documentElement.style.setProperty("--text-color", "#222");
    document.documentElement.style.setProperty("--light-text-color", "#6f7785");
    document.documentElement.style.setProperty(
      "--sidebar-active-bg",
      "#e9eefc"
    );
  }}})});

  const btnExportarReservas = document.getElementById("btnExportarReservar"); // Corri o ID aqui

  // Função de exportação
  function exportarReservasParaPDF() {
      // 1. Clonar o elemento com as reservas para gerar o PDF
      const content = document.getElementById("listaReservadas"); // CRÍTICO: Substitua pelo ID REAL do container das suas salas reservadas
      if (!content) {
          alert("Erro: Container de reservas (ID: listaReservadas) não encontrado.");
          return;
      }
  
      // Clonar o conteúdo para aplicar estilos de impressão sem afetar a tela
      const clone = content.cloneNode(true);
      clone.classList.add('pdf-export'); // Adiciona uma classe para estilos específicos de PDF/Impressão
  
      // 2. Configurações do PDF (Tamanho A4, nome do arquivo, margens)
      const options = {
          margin: [10, 10, 10, 10], // Margens: Top, Left, Bottom, Right
          filename: 'reservas_salas.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 }, // Aumenta a resolução para maior qualidade
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
  
      // 3. Gerar e salvar o PDF
      html2pdf().from(clone).set(options).save();
  }
  
  // Inicialização: Vincular o evento ao botão
  document.addEventListener("DOMContentLoaded", () => {
      // ... Seu código de inicialização (carregarDadosIniciais, listeners de fechar modal) ...
  
      const btnExport = document.getElementById("btnExportarReservas");
      if (btnExport) {
          btnExport.addEventListener("click", exportarReservasParaPDF);
      }
  });
