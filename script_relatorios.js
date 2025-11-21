document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("reportContainer");
    const modal = document.getElementById("modalRelatorio");
    const modalTitulo = document.getElementById("modalTitulo");
    const modalInfo = document.getElementById("modalInfo");
    const closeModal = document.getElementById("closeModalRelatorio");
  
    try {
      const req = await fetch("/api/proximas-reservas");
      const data = await req.json();
  
      if (!data.success || !data.reservas.length) {
        container.innerHTML = `<p class="no-rooms">Nenhum relatório disponível.</p>`;
        return;
      }
  
      data.reservas.forEach(rel => {
        const card = document.createElement("div");
        card.className = "report-card";
  
        card.innerHTML = `
          <span class="tag">SALA ${rel.numero}</span>
          <p class="report-title">Relatório Dia ${rel.dataInicio.split("T")[0].split("-").reverse().join("/")}</p>
          <button class="btn-ver" data-id="${rel.reservaID}">VER</button>
        `;
  
        container.appendChild(card);
      });
  
      container.querySelectorAll(".btn-ver").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const rel = data.reservas.find(r => r.reservaID == id);
  
          modalTitulo.textContent = `Sala ${rel.numero} — Bloco ${rel.bloco}`;
          modalInfo.innerHTML = `
            <strong>Data:</strong> ${rel.dataInicio.split("T")[0].split("-").reverse().join("/")}<br>
            <strong>Horário:</strong> ${rel.periodo}<br>
            <strong>Solicitante:</strong> ${rel.solicitante}<br>
            <strong>Capacidade:</strong> ${rel.capacidade} alunos
          `;
  
          modal.style.display = "flex";
        });
      });
  
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    }
  
    closeModal.addEventListener("click", () => modal.style.display = "none");
  });
  