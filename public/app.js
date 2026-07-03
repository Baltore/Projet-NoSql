const results = document.getElementById('results');
const resultTitle = document.getElementById('resultTitle');
const resultCount = document.getElementById('resultCount');

function money(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function setTitle(title, count) {
  resultTitle.textContent = title;
  resultCount.textContent = count !== undefined ? `${count} résultat(s)` : '';
}

function card(title, body, metric = '') {
  return `<article class="card"><h3>${title}</h3>${metric ? `<div class="metric">${metric}</div>` : ''}<p>${body}</p></article>`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
  return response.json();
}

async function loadDashboard() {
  const data = await fetchJson('/api/dashboard');
  setTitle('Tableau de bord');
  const kpis = data.kpis;
  results.innerHTML = [
    card('Produits', 'Nombre total de produits dans le catalogue.', kpis.products),
    card('Clients', 'Nombre total de clients enregistrés dans la collection customers.', kpis.customers),
    card('Commandes', 'Nombre total de commandes dans orders.', kpis.orders),
    card('Chiffre d’affaires', 'Somme des commandes hors annulations.', money(kpis.revenue)),
    card('Stock faible', data.lowStockProducts.map(p => `${p.name} (${p.stock})`).join('<br>'), kpis.lowStockCount),
    card('Produits très bien notés', data.topRated.map(p => `${p.name} - ${p.averageRating}/5`).join('<br>'))
  ].join('');
}

async function loadProducts() {
  const params = new URLSearchParams();
  const q = document.getElementById('q').value;
  const category = document.getElementById('category').value;
  const maxPrice = document.getElementById('maxPrice').value;
  const minRating = document.getElementById('minRating').value;
  const sort = document.getElementById('sort').value;
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minRating) params.set('minRating', minRating);
  if (sort) params.set('sort', sort);
  params.set('onlyInStock', 'true');

  const data = await fetchJson(`/api/products?${params.toString()}`);
  setTitle('Catalogue filtré', data.length);
  results.innerHTML = data.map(p => card(
    p.name,
    `${p.brand} • ${p.categorySlug}<br>Stock : ${p.stock} • Vendus : ${p.sold}<br>Note : ${p.averageRating}/5`,
    money(p.price)
  )).join('');
}

async function loadTopProducts() {
  const data = await fetchJson('/api/analytics?type=top-products');
  setTitle('Top 5 des produits les plus vendus', data.length);
  results.innerHTML = data.map(p => card(p.name, `Vendus : ${p.sold}`, `${p.sold}`)).join('');
}

async function loadRevenueByCategory() {
  const data = await fetchJson('/api/analytics?type=revenue-by-category');
  setTitle('Chiffre d’affaires par catégorie', data.length);
  results.innerHTML = data.map(row => card(row._id, `Quantités vendues : ${row.quantity}`, money(row.revenue))).join('');
}

async function loadPendingOrders() {
  const data = await fetchJson('/api/analytics?type=pending-orders');
  setTitle('Commandes à traiter', data.length);
  results.innerHTML = data.map(o => card(o.orderNumber, `${o.customerName} • ${o.city}<br>Status : ${o.status}`, money(o.total))).join('');
}

async function loadRecommendations() {
  const id = document.getElementById('customerId').value.trim();
  if (!id) {
    results.innerHTML = card('ID client manquant', 'Lance npm run seed puis copie l’ID affiché dans le terminal.');
    return;
  }
  const data = await fetchJson(`/api/recommendations/${id}`);
  setTitle('Recommandations personnalisées', data.length);
  results.innerHTML = data.map(p => card(p.name, `${p.brand} • ${p.categorySlug}<br>Note : ${p.averageRating}/5`, money(p.price))).join('');
}

loadDashboard().catch(error => {
  results.innerHTML = card('Erreur', error.message);
});
