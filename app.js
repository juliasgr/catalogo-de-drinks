// app.js - Módulo principal (JS puro)
const grid = document.getElementById('grid');
const search = document.getElementById('search');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const toggleListBtn = document.getElementById('toggleList');
const contador = document.getElementById('contador');
const clearChecksBtn = document.getElementById('clearChecks');

let drinks = [];
let currentDrink = null;
let selecionando = false;

// localStorage key (versioned)
const STORAGE_KEY = 'mixoteca_selections_v1';

function loadSelections(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveSelections(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// load drinks JSON
async function loadData(){
  try {
    const res = await fetch('drinks.json');
    if(!res.ok) throw new Error('fetch failed');
    drinks = await res.json();
  } catch (err) {
    console.error('Erro carregando drinks.json', err);
    drinks = []; // fallback vazios
  } finally {
    render(drinks);
  }
}

function render(lista){
  grid.innerHTML = '';
  if(!lista || lista.length === 0){
    grid.innerHTML = '<p>Nenhum drink encontrado.</p>';
    return;
  }

  lista.forEach(d => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${d.imagem}" alt="${d.nome}" loading="lazy" />
      <div class="card-body">
        <div>
          <h3>${d.nome}</h3>
          <p class="desc">${d.tipo} • ${d.tags.join(', ')}</p>
        </div>
        <div class="actions">
          <button class="btn btn-open" data-id="${d.id}">Ver receita</button>
          <button class="btn-outline btn-quick" data-id="${d.id}">Selecionar ingredientes</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // attach events
  grid.querySelectorAll('.btn-open').forEach(b => {
    b.addEventListener('click', e => {
      const id = Number(e.currentTarget.dataset.id);
      openModal(drinks.find(x => x.id === id));
    });
  });

  grid.querySelectorAll('.btn-quick').forEach(b => {
    b.addEventListener('click', e => {
      const id = Number(e.currentTarget.dataset.id);
      openModal(drinks.find(x => x.id === id), true);
    });
  });
}

function openModal(drink, openInSelection = false){
  currentDrink = drink;
  selecionando = false;

  document.getElementById('modal-title').textContent = drink.nome;
  document.getElementById('modal-tipo').textContent = drink.tipo;
  document.getElementById('modal-tags').innerHTML = drink.tags.map(t => `<span class="tag">${t}</span>`).join('');
  document.getElementById('modal-img').src = drink.imagem;
  document.getElementById('modal-img').alt = drink.nome;
  document.getElementById('modal-preparo').textContent = drink.preparo;

  toggleListBtn.textContent = "Modo seleção de ingredientes";
  contador.hidden = true;
  clearChecksBtn.hidden = true;

  renderIngredientes(drink);

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  closeModal.focus();

  if(openInSelection) toggleListMode();
}

function renderIngredientes(drink){
  const ing = document.getElementById('modal-ingredientes');
  ing.innerHTML = '';
  const selections = loadSelections();
  const saved = selections[drink.id] || [];

  // por padrão: lista simples
  drink.ingredientes.forEach((i, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${i}</span>`;
    ing.appendChild(li);
  });
}

function toggleListMode(){
  if(!currentDrink) return;
  selecionando = !selecionando;
  const ing = document.getElementById('modal-ingredientes');
  ing.innerHTML = '';
  const selections = loadSelections();
  const saved = selections[currentDrink.id] || [];

  if(selecionando){
    toggleListBtn.textContent = "Concluir lista";
    contador.hidden = false;
    clearChecksBtn.hidden = false;

    currentDrink.ingredientes.forEach((i, idx) => {
      const li = document.createElement('li');
      const checked = saved.includes(idx);
      li.innerHTML = `<label><input type="checkbox" data-idx="${idx}" ${checked ? 'checked' : ''} /> <span>${i}</span></label>`;
      ing.appendChild(li);
    });

    updateContador();

    // eventos
    ing.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = Number(chk.dataset.idx);
        const selectionsObj = loadSelections();
        const arr = new Set(selectionsObj[currentDrink.id] || []);
        if(chk.checked) arr.add(idx); else arr.delete(idx);
        selectionsObj[currentDrink.id] = Array.from(arr).sort((a,b)=>a-b);
        saveSelections(selectionsObj);
        updateContador();
      });
    });

  } else {
    toggleListBtn.textContent = "Modo seleção de ingredientes";
    contador.hidden = true;
    clearChecksBtn.hidden = true;
    currentDrink.ingredientes.forEach((i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${i}</span>`;
      ing.appendChild(li);
    });
  }
}

function updateContador(){
  const selectionsObj = loadSelections();
  const arr = selectionsObj[currentDrink.id] || [];
  contador.textContent = `${arr.length} de ${currentDrink.ingredientes.length} selecionados`;
}

function clearSelectionsForCurrent(){
  if(!currentDrink) return;
  const selectionsObj = loadSelections();
  delete selectionsObj[currentDrink.id];
  saveSelections(selectionsObj);
  if(selecionando){
    // re-render seleção
    toggleListMode(); // fecha
    toggleListMode(); // abre — simples trick para re-render com estado limpo
  }
}

// fechar modal
function close(){
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  currentDrink = null;
  selecionando = false;
}
closeModal.addEventListener('click', close);
modal.addEventListener('click', (e) => { if(e.target === modal) close(); });
window.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });

// busca (sem filtros)
search.addEventListener('input', applySearch);

function applySearch(){
  const q = search.value.trim().toLowerCase();
  const filtered = drinks.filter(d => {
    const inName = d.nome.toLowerCase().includes(q);
    const inTags = d.tags.join(' ').toLowerCase().includes(q);
    const inIng = d.ingredientes.join(' ').toLowerCase().includes(q);
    return q ? (inName || inTags || inIng) : true;
  });
  render(filtered);
}

// modal buttons
toggleListBtn.addEventListener('click', toggleListMode);
clearChecksBtn.addEventListener('click', clearSelectionsForCurrent);

// init
loadData();
