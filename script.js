const $ = (sel, ctx = document) => ctx.querySelector(sel);
const modalReserva = document.getElementById("reservaModal");
const modalDetalhes = document.getElementById("detalhesModal");
const closeButtons = document.querySelectorAll(".close-modal, .close-reserva, .close-config, .close"); 
const dataInput = document.getElementById("dataReserva");
const horarios = document.getElementById("horarioReserva");
const reservaForm = document.getElementById("reservaForm");
const salaTituloModal = document.getElementById("salaTituloModal"); 
let salas = []; 
let salaSelecionadaId = null; 

function fecharModal(modalElement) {
    if (modalElement && modalElement.style.display === "flex") {
        modalElement.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function abrirModalReserva(salaId) {
    const sala = salas.find((s) => s.id == salaId);
    if (!sala) return;
    
    salaSelecionadaId = sala.id;
    if (reservaForm) reservaForm.dataset.salaId = sala.id;

    if (salaTituloModal) {
      salaTituloModal.textContent = `Sala ${sala.numero} - Bloco ${sala.bloco}`;
    }

    modalReserva.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function convertToISO(dateString) {
    if (!dateString) return '';

    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;

    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; 
    }
    return ''; 
}

async function carregarProximasReservas() {
  const container = document.getElementById("listaProximasReservas");
  if (!container) return;

  container.innerHTML = `<p>Carregando reservas...</p>`;

  try {
    const res = await fetch("/api/proximas-reservas");
    const data = await res.json();

    if (!data.success || !data.reservas.length) {
      container.innerHTML = `<p>Nenhuma reserva futura.</p>`;
      return;
    }

    container.innerHTML = "";
    data.reservas.forEach(r => {
      const dataObj = new Date(r.dataInicio);
      const dia = dataObj.getDate();
      const mes = dataObj.toLocaleString("pt-BR", { month: "short" });

      const card = `
        <div class="reserva-card">
          <div class="reserva-data">
            <div class="dia">${dia}</div>
            <div class="mes">${mes}</div>
          </div>
          <div class="reserva-info">
            <h4>Sala ${r.numero} - Bloco ${r.bloco}</h4>
            <p><strong>Período:</strong> ${r.periodo || "-"}</p>
            <p><strong>Responsável:</strong> ${r.solicitante || "-"}</p>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Erro ao carregar reservas.</p>`;
  }
}

function renderSalas(containerId, statusFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  
  const filteredSalas = salas.filter((sala) => (sala.status || 'Disponível') === statusFilter); 

  if (!filteredSalas || filteredSalas.length === 0) {
      container.innerHTML = `<p class="no-rooms">Nenhuma sala ${statusFilter === 'Disponível' ? 'disponível' : 'reservada'} no momento.</p>`;
      return;
  }

  filteredSalas.forEach((sala) => {
      const card = document.createElement("div");
      card.classList.add("room-card");
      
      const isReserved = sala.status === "Reservada";
      
      let actionButtonsHTML = '';
      
      if (isReserved) {
  
      } else {
          actionButtonsHTML = `
              <button class="btn-editar" title="Editar Sala" data-sala-id="${sala.id}">
                  <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="btn-excluir" title="Excluir Sala" data-sala-id="${sala.id}">
                  <i class="fas fa-trash-alt"></i>
              </button>
          `;
      }

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
  
  container.querySelectorAll(".btn-reservar").forEach((btn) => {
      btn.addEventListener("click", function () {
          abrirModalReserva(this.dataset.salaId);
      });
  });

  container.querySelectorAll(".btn-excluir").forEach((btn) => {
      btn.addEventListener("click", function () {
          const salaId = this.dataset.salaId;
          if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a Sala ID ${salaId}?`)) {
              excluirSala(salaId);
          }
      });
  });

  container.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", function () {
          const salaId = this.dataset.salaId;
          editarSala(salaId); 
      });
  });
}

function editarSala(salaId) {
  const sala = salas.find(s => s.id == salaId);
  if (!sala) return alert("Sala não encontrada.");

  abrirModalEditar(sala);
  document.getElementById("formEditar").addEventListener("submit", async function(e) {
  e.preventDefault();

  const id = document.getElementById("editSalaID").value;

  const payload = {
    numero: document.getElementById("editNumero").value,
    andar: document.getElementById("editAndar").value,
    bloco: document.getElementById("editBloco").value,
    capacidade: document.getElementById("editCapacidade").value
  };

  const response = await fetch(`/api/salas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.message || "Erro ao atualizar sala");
    return;
  }

  alert("Sala atualizada com sucesso!");
  document.getElementById("editarModal").style.display = "none";
  carregarDadosIniciais();
});
}

async function carregarDadosIniciais() {
  const containerDisponiveis = document.getElementById("listaSalas"); 
  const containerReservadas = document.getElementById("salasReservadas"); 

  if (!containerDisponiveis) return;

  containerDisponiveis.innerHTML = `<p class="loading-message">Carregando salas...</p>`;
  if (containerReservadas) containerReservadas.innerHTML = `<p class="loading-message">Carregando salas reservadas...</p>`;

  try {
    const responseSalas = await fetch("/api/salas");
    const dataSalas = await responseSalas.json();

    if (!responseSalas.ok || !dataSalas.success) {
      throw new Error(dataSalas.message || `Falha ao buscar salas: Status ${responseSalas.status}`);
    }

    salas = dataSalas.salas.map(s => ({
      id: s.id || s.salasID,
      numero: s.numero,
      andar: s.andar,
      capacidade: s.capacidade,
      bloco: s.bloco,
      status: s.status || 'Disponível',
      periodo: s.periodo || 'Indefinido',
      reservaID: s.reservaID || null,
      dataInicio: s.dataInicio || null,
      dataTermino: s.dataTermino || null
    }));

    const salasDisponiveis = salas.filter(s => s.status === "Disponível").length;
    const salasReservadas = salas.filter(s => s.status === "Reservada").length;
    const capacidadeTotal = salas.reduce((sum, s) => sum + (parseInt(s.capacidade) || 0), 0);
    const reservasSemana = salasReservadas;

    const elDisponiveis = document.getElementById("countDisponiveis");
    const elReservadas = document.getElementById("countReservadas");
    const elCapacidade = document.getElementById("capacidadeTotal");
    const elSemana = document.getElementById("reservasSemana");

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
  renderSalas("listaSalas", "Disponível");
  if (containerReservadas) renderSalas("salasReservadas", "Reservada");
}

async function carregarProximasReservas() {
  const container = document.getElementById("listaProximasReservas");
  if (!container) return;

  container.innerHTML = `<p class="loading-message">Carregando reservas...</p>`;

  try {
    const response = await fetch("/api/proximas-reservas");
    const data = await response.json();

    if (!data.success || !data.reservas || data.reservas.length === 0) {
      container.innerHTML = `<p class="no-rooms">Nenhuma reserva futura.</p>`;
      return;
    }

    container.innerHTML = "";

    data.reservas.forEach(r => {
      const dataObj = r.dataInicio ? new Date(r.dataInicio) : null;
      const dia = dataObj ? dataObj.getDate() : '';
      const mes = dataObj ? dataObj.toLocaleString("pt-BR", { month: "short" }) : '';

      const horario = r.periodo || '';

      const html = `
        <div class="reserva-card">
          <div class="reserva-data">
            <div class="dia">${dia}</div>
            <div class="mes">${mes}</div>
          </div>

          <div class="reserva-info">
            <h4>Sala ${r.numero} - Bloco ${r.bloco || ''}</h4>
            <p><strong>Horário:</strong> ${horario}</p>
            <p><strong>Responsável:</strong> ${r.solicitante || ''}</p>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="no-rooms">Erro ao carregar reservas.</p>`;
  }
}

if (reservaForm) {
  reservaForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const salaID = this.dataset.salaId || salaSelecionadaId; 
    
    if (!salaID || isNaN(parseInt(salaID))) {
        alert("Erro: ID da sala inválido ou ausente.");
        return;
    }

    const solicitante = $("#solicitante").value.trim();
    const dataDisplay = $("#dataReserva").value;
    const horario = $("#horarioReserva").value;

    if (!solicitante || !dataDisplay || !horario) {
      alert("Por favor, preencha todos os campos do formulário de reserva.");
      return;
    }

    const dataBackend = convertToISO(dataDisplay);
    if (!dataBackend || dataBackend.split('-').length !== 3) {
      alert("Erro de formato de data. Por favor, selecione uma data válida.");
      return;
    }
    
    const horarioInicio = horario.split(' - ')[0]; 

    const dadosReserva = {
      salaID: parseInt(salaID), 
      data: dataBackend, 
      horario: horarioInicio, 
      periodo: horario.split(' - ')[0] + ' - ' + horario.split(' - ')[1],
      solicitante: solicitante
    };
    
    try {
      const response = await fetch('/api/reservar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosReserva)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Status: ${response.status} ${response.statusText}`);
      }
      alert(`✅ Reserva confirmada! Sala ${salaID} reservada por ${solicitante}.`);
      await carregarDadosIniciais(); 

    } catch (error) {
      console.error("Erro fatal na reserva:", error);
      alert(`❌ Erro ao confirmar a reserva. Detalhes: ${error.message}.`);
      return; 
    }
    
    fecharModal(modalReserva);
    reservaForm.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
    if (dataInput && dataInput.type === 'date') {
        const today = new Date().toISOString().split("T")[0];
        dataInput.setAttribute("min", today);
    }
    
    carregarDadosIniciais();
    carregarProximasReservas();
    closeButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            const modal = this.closest(".reserva-modal") || this.closest("#reservaModal") || this.closest("#detalhesModal");
            fecharModal(modal);
        });
    });
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
          method: "DELETE", 
          headers: { "Content-Type": "application/json" }
      });

      let result = {};
      try {
          result = await response.json(); 
      } catch (e) {
          result = {}; 
      }

      if (!response.ok) {
          throw new Error(result.message || `Erro ao excluir a sala (status ${response.status})`);
      }

      alert(`✅ Sala ID ${salaId} excluída com sucesso!`);

      await carregarDadosIniciais(); 

  } catch (error) {
      console.error("Erro ao excluir sala:", error);
      alert(`❌ Erro ao excluir sala. Detalhes: ${error.message}`);
  }
}
const btnExportar = document.getElementById("exportarPDF");

if (btnExportar) {
  btnExportar.addEventListener("click", () => {
    const textoOriginal = btnExportar.innerHTML;
    btnExportar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btnExportar.disabled = true;

    fetch("/api/exportar-pdf")
      .then(response => {
        if (!response.ok) throw new Error("Erro ao gerar PDF no servidor");
        return response.blob(); 
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio_salas.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove(); 
        window.URL.revokeObjectURL(url); 
      })
      .catch(err => {
        console.error("Erro ao baixar PDF:", err);
        alert("Erro ao gerar PDF. Verifique o console para mais detalhes.");
      })
      .finally(() => {
        btnExportar.innerHTML = textoOriginal;
        btnExportar.disabled = false;
      });
  });
}

if (reservaForm) {
    reservaForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const salaID = this.dataset.salaId || salaSelecionadaId;
        const solicitante = $("#solicitante").value.trim();
        
        const data = $("#dataReserva").value; 
        const horario = $("#horarioReserva").value; 

        if (!solicitante || !data || !horario) return alert("Preencha todos os campos.");
        
        const hoje = new Date().toISOString().split("T")[0];
        if (data < hoje) return alert("Não é possível reservar datas anteriores.");

        const payload = { salaID, data, horario, solicitante }; 

      
    });
}

function abrirModalEditar(sala) {
  const modal = document.getElementById("editarModal");

  document.getElementById("editSalaID").value = sala.id;
  document.getElementById("editNumero").value = sala.numero;
  document.getElementById("editAndar").value = sala.andar;
  document.getElementById("editBloco").value = sala.bloco;
  document.getElementById("editCapacidade").value = sala.capacidade;

  modal.style.display = "flex";
}

document.getElementById("closeEditar").addEventListener("click", () => {
  document.getElementById("editarModal").style.display = "none";
});
