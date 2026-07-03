const express = require('express');
const {
  getDashboard,
  findProducts,
  getProductBySlug,
  getRecommendations,
  getAnalytics
} = require('../services/queryService');

const router = express.Router();

// Endpoint 1 - Tableau de bord : KPI, stock faible, produits bien notés
router.get('/dashboard', async (req, res) => {
  try {
    res.json(await getDashboard());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 2 - Catalogue : recherche, filtres, tri
router.get('/products', async (req, res) => {
  try {
    res.json(await findProducts(req.query));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 3 - Fiche produit avec les avis
router.get('/products/:slug', async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 4 - Recommandations personnalisées selon l'historique client
router.get('/recommendations/:customerId', async (req, res) => {
  try {
    res.json(await getRecommendations(req.params.customerId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint 5 - Analyses : top produits, CA par catégorie, ventes mensuelles, etc.
router.get('/analytics', async (req, res) => {
  try {
    res.json(await getAnalytics(req.query.type));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
