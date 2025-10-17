// Helper: query selector safe
const $ = (sel, ctx = document) => ctx.querySelector(sel);

// Abre/fecha modal e alternância de abas
document.addEventListener('DOMContentLoaded', () => {
  const configButtons = document.querySelectorAll('#btnConfig');
  const modal = $('#configModal');
  const closeBtn = $('#closeConfig');

  // open handlers (pode haver múltiplos links em páginas diferentes)
  configButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.style.display = 'flex';
    });
  });

  // close X
  if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });

  // close ao clicar fora
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // abas do modal (Geral / Personalizar)
  const tabs = document.querySelectorAll('.config-sidebar li');
  const configContent = $('#configContent');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');

      // conteúdo simples por aba (poderia ser carregado via template)
      const name = tab.dataset.tab;
      if (configContent) {
        if (name === 'geral') {
          configContent.querySelector('h2').textContent = 'Configurações — Geral';
        } else {
          configContent.querySelector('h2').textContent = 'Configurações — Personalizar';
        }
      }
    });
  });

  // Tema: persistência em localStorage
  const themeToggle = $('#theme-toggle');
  const root = document.documentElement;
  const saved = localStorage.getItem('site-theme') || 'light';
  applyTheme(saved);

  if (themeToggle) {
    themeToggle.checked = (saved === 'dark');
    themeToggle.addEventListener('change', (e) => {
      const v = e.target.checked ? 'dark' : 'light';
      applyTheme(v);
      localStorage.setItem('site-theme', v);
    });
  }

  // botão fechar modal ao pressionar Esc
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && modal && modal.style.display === 'flex') modal.style.display = 'none';
  });

  // Pesquisa (client-side simples)
  const searchInput = $('#searchInput');
  const btnSearch = $('#btnSearch');
  if (btnSearch && searchInput) {
    btnSearch.addEventListener('click', () => {
      const term = searchInput.value.trim().toLowerCase();
      filterHomepageRooms(term);
    });
    searchInput.addEventListener('keyup', () => {
      const term = searchInput.value.trim().toLowerCase();
      filterHomepageRooms(term);
    });
  }

  // Cadastro de salas (exemplo client-side)
  const cadastroForm = $('#cadastroForm');
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const numero = $('#numeroSala').value;
      const andar = $('#andarSala').value;
      const bloco = $('#blocoSala').value;
      const tipo = $('#tipoSala').value;

      const tabela = $('#tabelaCadastroSalas tbody') || $('#tabelaCadastroSalas');
      if (tabela) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${numero}</td><td>${andar}</td><td>${bloco}</td><td>${tipo}</td>`;
        tabela.appendChild(tr);
        alert('Sala cadastrada (exemplo local).');
        cadastroForm.reset();
      }
    });
  }
});

// Aplica tema claro/escuro (simples)
function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.style.setProperty('--primary-color', '#0f274f');
    document.documentElement.style.setProperty('--secondary-color', '#3467f0');
    document.documentElement.style.setProperty('--background-color', '#0b0f1a');
    document.documentElement.style.setProperty('--card-bg', '#0f1724');
    document.documentElement.style.setProperty('--text-color', '#e6eef8');
    document.documentElement.style.setProperty('--light-text-color', '#97a3c1');
    document.documentElement.style.setProperty('--sidebar-active-bg', '#0b1838');
  } else {
    // Valores padrão (coincidem com style.css)
    document.documentElement.style.setProperty('--primary-color', '#17307a');
    document.documentElement.style.setProperty('--secondary-color', '#3a86ff');
    document.documentElement.style.setProperty('--background-color', '#f6f7fb');
    document.documentElement.style.setProperty('--card-bg', '#ffffff');
    document.documentElement.style.setProperty('--text-color', '#222');
    document.documentElement.style.setProperty('--light-text-color', '#6f7785');
    document.documentElement.style.setProperty('--sidebar-active-bg', '#e9eefc');
  }
}

// simples filtro para a homepage (aplica display:none nos cards que não batem)
function filterHomepageRooms(term) {
  if (!term) {
    document.querySelectorAll('.homepage-rooms .room-card').forEach(c => c.style.display = '');
    return;
  }
  document.querySelectorAll('.homepage-rooms .room-card').forEach(c => {
    const txt = c.textContent.toLowerCase();
    c.style.display = txt.includes(term) ? '' : 'none';
  });
}