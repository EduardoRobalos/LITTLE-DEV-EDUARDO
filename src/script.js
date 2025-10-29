// Helper: query selector safe
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const modalReserva = document.getElementById("reservaModal");
const modalDetalhes = document.getElementById("detalhesModal");
const closeButtons = document.querySelectorAll(".close-modal");
const dataInput = document.getElementById("dataReserva");
const horarios = document.getElementById("horarioReserva");

function renderSalas(containerId, statusFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const filteredSalas = salas.filter((sala) => sala.status === statusFilter);
  filteredSalas.forEach((sala) => {
    const card = document.createElement("div");
    card.classList.add("room-card");
    card.innerHTML = `
      <div class="card-header">SALA ${sala.numero}</div>
      <p><strong>Andar:</strong> ${sala.andar}º</p>
      <p><strong>Capacidade:</strong> ${sala.capacidade} Alunos</p>
      <p><strong>Período:</strong> ${sala.periodo}</p>
      <button class="btn small ${
        sala.status === "Reservada" ? "ghost btn-detalhes" : "btn-reservar"
      }">
        ${sala.status === "Reservada" ? "Ver mais" : "Reservar"}
      </button>
    `;
    container.appendChild(card);
  });
  updateCounts();
}

function renderReservas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  reservas.forEach((reserva) => {
    const card = document.createElement("div");
    card.classList.add("reservation-card");
    card.innerHTML = `
      <i class="fas fa-calendar-alt icon-left"></i>
      <div class="info">
        <p><strong>${reserva.sala} - ${reserva.descricao}</strong></p>
        <p>Início: ${reserva.inicio} | Término: ${reserva.termino}</p>
        <p>Solicitante: ${reserva.solicitante}</p>
      </div>
      <span class="status reserved">RESERVADA</span>
    `;
    container.appendChild(card);
  });
}

function updateCounts() {
  const disponiveis = salas.filter((s) => s.status === "Disponível").length;
  const reservadas = salas.filter((s) => s.status === "Reservada").length;
  document.getElementById(
    "salasDisponiveisCount"
  ).textContent = `${disponiveis} Salas`;
  document.getElementById(
    "salasReservadasCount"
  ).textContent = `${reservadas} Salas`;
}

// Abre/fecha modal e alternância de abas
document.addEventListener("DOMContentLoaded", () => {
  const configButtons = document.querySelectorAll("#btnConfig");
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
  applyTheme(saved);

  if (themeToggle) {
    themeToggle.checked = saved === "dark";
    themeToggle.addEventListener("change", (e) => {
      const v = e.target.checked ? "dark" : "light";
      applyTheme(v);
      localStorage.setItem("site-theme", v);
    });
  }

  // botão fechar modal ao pressionar Esc
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && modal && modal.style.display === "flex")
      modal.style.display = "none";
  });

  // Pesquisa (client-side para Página Inicial)
  const searchInputHome = $(
    "#searchInput",
    document
      .querySelector(".homepage-rooms")
      ?.closest(".content-area")
      ?.querySelector(".filters-bar")
      ?.querySelector("#searchForm")
  );
  const btnSearchHome = $(
    "#btnSearch",
    document
      .querySelector(".homepage-rooms")
      ?.closest(".content-area")
      ?.querySelector(".filters-bar")
      ?.querySelector("#searchForm")
  );
  if (btnSearchHome && searchInputHome) {
    btnSearchHome.addEventListener("click", () => {
      const term = searchInputHome.value.trim().toLowerCase();
      filterRooms(term, ".homepage-rooms");
    });
    searchInputHome.addEventListener("keyup", () => {
      const term = searchInputHome.value.trim().toLowerCase();
      filterRooms(term, ".homepage-rooms");
    });
  }

  // Pesquisa (client-side para Salas)
  const searchInputSalas = $(
    "#searchInput",
    document
      .querySelector("#salasDisponiveis")
      ?.closest(".content-area")
      ?.querySelector(".filters-bar")
      ?.querySelector("#searchInput")
  );
  const btnSearchSalas = $(
    "#btnSearch",
    document
      .querySelector("#salasDisponiveis")
      ?.closest(".content-area")
      ?.querySelector(".filters-bar")
      ?.querySelector("#btnSearch")
  );
  if (btnSearchSalas && searchInputSalas) {
    btnSearchSalas.addEventListener("click", () => {
      const term = searchInputSalas.value.trim().toLowerCase();
      filterRooms(term, "#salasDisponiveis, #salasReservadas");
    });
    searchInputSalas.addEventListener("keyup", () => {
      const term = searchInputSalas.value.trim().toLowerCase();
      filterRooms(term, "#salasDisponiveis, #salasReservadas");
    });
  }


  

  // Inicialização do Flatpickr
  flatpickr("#dataReserva", {
    dateFormat: "d/m/Y",
    locale: {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
        longhand: [
          "Domingo",
          "Segunda",
          "Terça",
          "Quarta",
          "Quinta",
          "Sexta",
          "Sábado",
        ],
      },
      months: {
        shorthand: [
          "Jan",
          "Fev",
          "Mar",
          "Abr",
          "Mai",
          "Jun",
          "Jul",
          "Ago",
          "Set",
          "Out",
          "Nov",
          "Dez",
        ],
        longhand: [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ],
      },
      weekAbbreviation: "Sem.",
      rangeSeparator: " a ",
      scrollTitle: "Rolar para alterar",
      toggleTitle: "Clicar para alternar",
      today: "Hoje",
      close: "Fechar",
    },
    minDate: "today",
    enableTime: false,
    onReady: function (selectedDates, dateStr, instance) {
      instance.calendarContainer.style.fontFamily = "Inter, sans-serif";
    },
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
  }
}

// Filtro de salas
function filterRooms(term, containerSelector) {
  if (!term) {
    document
      .querySelectorAll(containerSelector + " .room-card")
      .forEach((c) => (c.style.display = ""));
    return;
  }
  document.querySelectorAll(containerSelector + " .room-card").forEach((c) => {
    const txt = c.textContent.toLowerCase();
    c.style.display = txt.includes(term) ? "" : "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const configButton = document.getElementById("configButton");
  const configModal = document.getElementById("configModal");
  const closeButton = document.querySelector(".close-config");

  if (configButton && configModal && closeButton) {
    configButton.addEventListener("click", () => {
      configModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    });

    closeButton.addEventListener("click", () => {
      configModal.style.display = "none";
      document.body.style.overflow = "auto";
    });

    configModal.addEventListener("click", (e) => {
      if (e.target === configModal) {
        configModal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  }
});

// Modal de Reserva
document.addEventListener("DOMContentLoaded", () => {
  const reservaModal = document.getElementById("reservaModal");
  const detalhesModal = document.getElementById("detalhesModal");
  const closeReservaButtons = document.querySelectorAll(".close-reserva");
  const reservaForm = document.getElementById("reservaForm");
  let salaSelecionada = null;

  // Abre o modal ao clicar em "Reservar"
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-reservar")) {
      salaSelecionada =
        e.target.closest(".room-card")?.querySelector(".card-header, h3")
          ?.innerText || "Sala";
      reservaModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    } else if (e.target.classList.contains("btn-detalhes")) {
      const salaNome =
        e.target.closest(".room-card")?.querySelector(".card-header, h3")
          ?.innerText || "Sala";
      const reservante = "João Silva"; // Substitua por lógica real de fetch do DB se disponível
      document.getElementById(
        "detalhesInfo"
      ).innerText = `Reservado por: ${reservante} para ${salaNome}`;
      detalhesModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  });

  // Fecha modais ao clicar no X
  closeReservaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      reservaModal.style.display = "none";
      detalhesModal.style.display = "none";
      document.body.style.overflow = "auto";
    });
  });

  // Fecha ao clicar fora
  reservaModal.addEventListener("click", (e) => {
    if (e.target === reservaModal) {
      reservaModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });
  detalhesModal.addEventListener("click", (e) => {
    if (e.target === detalhesModal) {
      detalhesModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  // Submete o formulário de reserva
  reservaForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const solicitante = document.getElementById("solicitante").value.trim();
    const data = document.getElementById("dataReserva").value;
    const horario = document.getElementById("horarioReserva").value;

    if (!data || !horario) {
      alert("Por favor, preencha todos os campos antes de confirmar.");
      return;
    }

    // Extrai número da sala da string (ex.: "SALA 307" -> "307")
    const numeroSala = salaSelecionada.match(/\d+/)[0];
    // Atualiza o status da sala para "Reservada"
    const salaIndex = salas.findIndex((s) => s.numero === numeroSala);
    if (salaIndex !== -1) {
      salas[salaIndex].status = "Reservada";
    }

    // Adiciona a reserva
    const [inicio, termino] = horario.split(" - ");
    const dataCompleta = `${data} ${inicio}`;
    reservas.push({
      sala: salaSelecionada,
      descricao: "Reserva", // Pode ser dinâmico via input futuro
      inicio: dataCompleta,
      termino: `${data} ${termino}`,
      solicitante: "Usuário Atual", // Substitua por autenticação real
    });

    // Re-renderiza as seções
    renderSalas("salasDisponiveis", "Disponível");
    renderSalas("salasReservadas", "Reservada");
    renderReservas("proximasReservas");

    alert(
      `✅ Reserva confirmada!\n${salaSelecionada}\nData: ${data}\nHorário: ${horario}`
    );

    reservaModal.style.display = "none";
    document.body.style.overflow = "auto";
    reservaForm.reset();
  });
});

async function carregarSalas() {
  const disponiveisContainer = document.getElementById("listaSalas");
  const reservadasContainer = document.getElementById("salasReservadas");
  if (!disponiveisContainer || !reservadasContainer) return;

  try {
    const response = await fetch("/rooms");
    const data = await response.json();

    if (!data.success || data.rooms.length === 0) {
      disponiveisContainer.innerHTML = "<p>Nenhuma sala cadastrada.</p>";
      return;
    }

    disponiveisContainer.innerHTML = "";
    reservadasContainer.innerHTML = "";
    let disponiveisCount = 0;
    let reservadasCount = 0;
    let capacidadeTotal = 0;

    data.rooms.forEach(sala => {
      const card = document.createElement("div");
      card.classList.add("room-card");
      card.innerHTML = `
        <div class="card-header">SALA ${sala.numero}</div>
        <p><strong>Andar:</strong> ${sala.andar}°</p>
        <p><strong>Capacidade:</strong> ${sala.capacidade} Alunos</p>
        <p><strong>Bloco:</strong> ${sala.bloco}</p>
        <button class="btn small ${sala.status === "Reservada" ? "ghost btn-detalhes" : "btn-reservar"}">
          ${sala.status === "Reservada" ? "Ver mais" : "Reservar"}
        </button>
      `;
      if (sala.status === "Disponível") {
        disponiveisContainer.appendChild(card);
        disponiveisCount++;
      } else {
        reservadasContainer.appendChild(card);
        reservadasCount++;
      }
      capacidadeTotal += parseInt(sala.capacidade, 10) || 0;
    });

    // Update stats (previously hardcoded)
    document.querySelector(".stat-card:nth-child(1) p").textContent = `${disponiveisCount} Salas`;
    document.querySelector(".stat-card:nth-child(2) p").textContent = `${reservadasCount} Salas`;
    document.querySelector(".stat-card:nth-child(3) p").textContent = `${capacidadeTotal} Alunos`;
    // Note: "Reservas da Semana" stat remains hardcoded for now; add a separate fetch if needed.

  } catch (error) {
    console.error("Erro ao carregar salas:", error);
    disponiveisContainer.innerHTML = "<p>Erro ao carregar salas.</p>";
  }
}

// In the DOMContentLoaded event listener or at the bottom of script.js, replace carregarSalasHomepage(); with:
carregarSalas();
function abrirReserva(salasID) {
  console.log("Reservar sala:", salasID);
  // Aqui futuramente abriremos o modal com calendário
}

