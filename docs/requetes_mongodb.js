/*
Projet NoSQL - Catalogue intelligent de produits
Base : catalogue_nosql
Ces requêtes peuvent être testées dans MongoDB Compass > Playground.
*/

use('catalogue_nosql');

// Q1 - Voir tous les produits disponibles en stock
db.products.find(
  { stock: { $gt: 0 } },
  { name: 1, price: 1, stock: 1, categorySlug: 1, averageRating: 1 }
).sort({ name: 1 });

// Q2 - Rechercher les produits liés au gaming
db.products.find(
  { $or: [{ categorySlug: 'gaming' }, { tags: 'gaming' }] },
  { name: 1, price: 1, stock: 1, sold: 1 }
).sort({ sold: -1 });

// Q3 - Trouver les produits à moins de 100 euros et bien notés
db.products.find(
  { price: { $lte: 100 }, averageRating: { $gte: 4 } },
  { name: 1, price: 1, averageRating: 1, stock: 1 }
).sort({ averageRating: -1 });

// Q4 - Identifier les produits en stock faible
db.products.find(
  { stock: { $lte: 5 } },
  { name: 1, stock: 1, categorySlug: 1, price: 1 }
).sort({ stock: 1 });

// Q5 - Afficher les 5 meilleures ventes
db.products.find(
  {},
  { name: 1, sold: 1, price: 1, categorySlug: 1 }
).sort({ sold: -1 }).limit(5);

// Q6 - Afficher la fiche complète d’un produit par son slug
db.products.findOne({ slug: 'casque-airsound-pro' });

// Q7 - Afficher les avis d’un produit avec le nom du client
db.reviews.aggregate([
  { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
  { $unwind: '$product' },
  { $match: { 'product.slug': 'casque-airsound-pro' } },
  { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
  { $unwind: '$customer' },
  { $project: { _id: 0, productName: '$product.name', customerName: '$customer.name', rating: 1, title: 1, comment: 1, createdAt: 1 } },
  { $sort: { createdAt: -1 } }
]);

// Q8 - Calculer le chiffre d’affaires total hors commandes annulées
db.orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
]);

// Q9 - Calculer le chiffre d’affaires par catégorie
db.orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $unwind: '$items' },
  { $group: { _id: '$items.categorySlug', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, quantity: { $sum: '$items.quantity' } } },
  { $sort: { revenue: -1 } }
]);

// Q10 - Calculer les ventes mensuelles
db.orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);

// Q11 - Trouver les commandes à traiter avec le nom et la ville du client
db.orders.aggregate([
  { $match: { status: { $in: ['pending', 'paid'] } } },
  { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
  { $unwind: '$customer' },
  { $project: { _id: 0, orderNumber: 1, status: 1, total: 1, customerName: '$customer.name', city: '$customer.address.city', createdAt: 1 } },
  { $sort: { createdAt: -1 } }
]);

// Q12 - Trouver le chiffre d’affaires par ville
db.orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
  { $unwind: '$customer' },
  { $group: { _id: '$customer.address.city', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  { $sort: { revenue: -1 } }
]);

// Q13 - Lister les avis négatifs ou moyens pour améliorer les produits
db.reviews.aggregate([
  { $match: { rating: { $lte: 3 } } },
  { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
  { $unwind: '$product' },
  { $project: { _id: 0, productName: '$product.name', rating: 1, title: 1, comment: 1, createdAt: 1 } },
  { $sort: { rating: 1, createdAt: -1 } }
]);

// Q14 - Trouver les clients gold et leurs centres d’intérêt
db.customers.find(
  { loyaltyLevel: 'gold' },
  { name: 1, email: 1, address: 1, interests: 1 }
);

// Q15 - Créer une recommandation simple : produits très bien notés dans une catégorie aimée
db.products.find(
  { categorySlug: { $in: ['gaming', 'audio'] }, averageRating: { $gte: 4 }, stock: { $gt: 0 } },
  { name: 1, price: 1, categorySlug: 1, averageRating: 1 }
).sort({ averageRating: -1, sold: -1 }).limit(5);
