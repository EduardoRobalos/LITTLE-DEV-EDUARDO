// script_salas.js — substitua todo o arquivo por este

(function () {
  // IDs / selectors possíveis onde as salas podem ser renderizadas
  const possibleContainers = [
    "lista-salas",
    "listaSalas",
    "salasDisponiveis",
    "salasDisponiveisContainer",
    "lista-salas-container",
    "listaSalasContainer",
    "lista-salas" // repetido por segurança
  ];

  // busca o container real no DOM
  function findContainer() {
    for (const id of possibleContainers) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    // tenta por classe genérica
    const byClass = document.querySelector(".rooms-grid, .salas-grid, .lista-salas, .listaSalas");
    return byClass;
  }

  // cria o modal (se não existir)
  function ensureReservaModal() {
    if (document.getElementById("reservaModal")) return;

    const tpl = document.createElement("div");
    tpl.innerHTML = `
      <div id="reservaModal" class="reserva-modal" style="display:none;">
        <div class="reserva-box">
          <button class="close-reserva" aria-label="Fechar">&times;</button>
          <h2 id="reservaTitulo">Reservar Sala</h2>

          <form id="reservaForm">
            <label for="dataReserva">Selecione a data da reserva</label>
            <input type="date" id="dataReserva" required>

            <label for="horarioReserva">Selecione o horário</label>
            <select id="horarioReserva" required>
              <option value="">Escolha um horário</option>
              <option value="08:00 - 10:00">08:00 - 10:00</option>
              <option value="10:00 - 12:00">10:00 - 12:00</option>
              <option value="13:00 - 15:00">13:00 - 15:00</option>
              <option value="15:00 - 17:00">15:00 - 17:00</option>
            </select>

            <div style="margin-top:14px; display:flex; gap:8px;">
              <button type="submit" class="btn-reservar-confirmar">Confirmar Reserva</button>
              <button type="button" class="btn-cancelar-reserva">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(tpl.firstElementChild);

    // handlers de fechar
    document.querySelector(".close-reserva").addEventListener("click", closeReservaModal);
    document.querySelector(".btn-cancelar-reserva").addEventListener("click", closeReservaModal);
    document.getElementById("reservaModal").addEventListener("click", function (e) {
      if (e.target === this) closeReservaModal();
    });

    // submit do form (no momento apenas simula)
    document.getElementById("reservaForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const data = document.getElementById("dataReserva").value;
      const horario = document.getElementById("horarioReserva").value;
      const titulo = document.getElementById("reservaTitulo").dataset.sala || "Sala";
      if (!data || !horario) {
        alert("Preencha data e horário antes de confirmar.");
        return;
      }
      alert(`Reserva confirmada:\n${titulo}\nData: ${data}\nHorário: ${horario}`);
      // aqui você pode adicionar fetch POST para /api/reservas...
      closeReservaModal();
    });
  }

  function openReservaModal(salaId, salaTitulo) {
    ensureReservaModal();
    const modal = document.getElementById("reservaModal");
    const titulo = document.getElementById("reservaTitulo");
    titulo.textContent = `Reservar ${salaTitulo}`;
    titulo.dataset.sala = salaTitulo;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeReservaModal() {
    const modal = document.getElementById("reservaModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  // monta um card (elemento DOM) de sala
  function criarCardSala(sala) {
    const wrapper = document.createElement("div");
    wrapper.className = "sala-card";

    // conteúdo principal
    const info = document.createElement("div");
    info.className = "sala-info";
    info.innerHTML = `
      <h3 class="sala-num">SALA ${sala.numero}</h3>
      <p><strong>Andar:</strong> ${sala.andar}º</p>
      <p><strong>Capacidade:</strong> ${sala.capacidade} alunos</p>
      <p><strong>Bloco:</strong> ${sala.bloco || "-"}</p>
    `;

    // área de ações (botões)
    const acoes = document.createElement("div");
    acoes.className = "sala-acoes";

    // botão Reservar (sempre exibido ao lado)
    const btnReservar = document.createElement("button");
    btnReservar.className = "btn-reservar";
    btnReservar.type = "button";
    btnReservar.innerHTML = `<i class="fas fa-calendar-plus" aria-hidden="true"></i> Reservar`;
    btnReservar.dataset.id = sala.salasID;
    btnReservar.dataset.titulo = `SALA ${sala.numero}`;

    acoes.appendChild(btnReservar);

    // se a sala NÃO estiver disponível, mostra "Ver mais" em vez de Reservar (opcional)
    // aqui assumimos que existe campo 'status' (Disponível / Reservada) — se não existir, sempre mostra Reservar
    if (sala.status && sala.status.toLowerCase() !== "disponível" && sala.status.toLowerCase() !== "disponivel") {
      // adicionar botão Ver mais
      const btnVer = document.createElement("button");
      btnVer.className = "btn-vermais";
      btnVer.type = "button";
      btnVer.textContent = "Ver mais";
      btnVer.dataset.reservado = sala.reservadoPor || "Desconhecido";
      acoes.appendChild(btnVer);

      // opcional: manter também o reservar, mas desabilitado
      btnReservar.disabled = true;
      btnReservar.style.opacity = "0.5";
      btnReservar.title = "Sala não disponível";
    }

    wrapper.appendChild(info);
    wrapper.appendChild(acoes);
    return wrapper;
  }

  // função que carrega salas do backend e renderiza
  async function carregarSalas() {
    const container = findContainer();
    if (!container) {
      console.error("Nenhum container encontrado para inserir as salas. IDs verificados:", possibleContainers);
      return;
    }
    container.innerHTML = '<p style="color:var(--light-text-color)">Carregando salas...</p>';

    try {
      const resp = await fetch("/api/salas");
      if (!resp.ok) throw new Error("Resposta não OK: " + resp.status);
      const data = await resp.json();
      // aceita formatos { success:true, salas: [...] } ou array diretamente
      const salas = data && data.salas ? data.salas : (Array.isArray(data) ? data : []);
      container.innerHTML = "";
      if (!salas || salas.length === 0) {
        container.innerHTML = "<p>Nenhuma sala encontrada.</p>";
        return;
      }

      salas.forEach(sala => {
        const card = criarCardSala(sala);
        container.appendChild(card);
      });

      console.log(`Renderizadas ${salas.length} salas em`, container);

    } catch (err) {
      console.error("Erro ao carregar salas:", err);
      container.innerHTML = "<p>Erro ao carregar salas. Veja console.</p>";
    }
  }

  // Event delegation: captura cliques em todo o documento
  document.addEventListener("click", (e) => {
    const reservarBtn = e.target.closest(".btn-reservar");
    if (reservarBtn) {
      const id = reservarBtn.dataset.id;
      const titulo = reservarBtn.dataset.titulo || `Sala ${id}`;
      openReservaModal(id, titulo);
      return;
    }

    const verMais = e.target.closest(".btn-vermais");
    if (verMais) {
      const nome = verMais.dataset.reservado || "Desconhecido";
      alert(`Reservado por: ${nome}`);
      return;
    }
  });

  // inicializa no DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    ensureReservaModal();
    carregarSalas();
  });
})();
