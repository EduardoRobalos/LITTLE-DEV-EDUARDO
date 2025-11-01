// Cadastro de salas
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

            // Limpa formulário
            cadastroForm.reset();

            // Remove mensagem após 3 segundos
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

async function carregarSalas() {
  const response = await fetch("/api/salas");
  const data = await response.json();

  const container = document.getElementById("lista-salas");
  container.innerHTML = "";

  data.salas.forEach(sala => {
      container.innerHTML += `
          <div class="sala-card">
              <h3>Sala ${sala.numero}</h3>
              <p>Andar: ${sala.andar}º</p>
              <p>Capacidade: ${sala.capacidade} alunos</p>
              <button class="reservar">Reservar</button>
          </div>
      `;
  });
}

carregarSalas();

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
  })})