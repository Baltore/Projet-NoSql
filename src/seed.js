const { ObjectId } = require('mongodb');
const data = require('../data/data.json');
const { connectDB, closeDB } = require('./db');

function findProduct(products, slug) {
  const product = products.find(item => item.slug === slug);
  if (!product) throw new Error(`Produit introuvable dans le seed : ${slug}`);
  return product;
}

function orderItem(product, quantity) {
  return {
    productId: product._id,
    productName: product.name,
    categorySlug: product.categorySlug,
    price: product.price,
    quantity
  };
}

function makeOrder(orderNumber, customer, items, status, date) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    orderNumber,
    customerId: customer._id,
    items,
    total: Number(total.toFixed(2)),
    status,
    createdAt: new Date(date)
  };
}

function makeReview(product, customer, rating, title, comment, date) {
  return {
    productId: product._id,
    customerId: customer._id,
    rating,
    title,
    comment,
    createdAt: new Date(date)
  };
}

async function seed() {
  const db = await connectDB();

  await Promise.all([
    db.collection('categories').deleteMany({}),
    db.collection('products').deleteMany({}),
    db.collection('customers').deleteMany({}),
    db.collection('orders').deleteMany({}),
    db.collection('reviews').deleteMany({})
  ]);

  const categories = data.categories.map(category => ({ _id: new ObjectId(), ...category }));
  const customers = data.customers.map(customer => ({ _id: new ObjectId(), ...customer, createdAt: new Date() }));
  const products = data.products.map(product => ({ _id: new ObjectId(), ...product, createdAt: new Date() }));

  await db.collection('categories').insertMany(categories);
  await db.collection('customers').insertMany(customers);
  await db.collection('products').insertMany(products);

  const [qays, sarah, mehdi, emma, nicolas, ines] = customers;
  const orders = [
    makeOrder('CMD-1001', qays, [orderItem(findProduct(products, 'clavier-rgb-phantom'), 1), orderItem(findProduct(products, 'souris-strike-x'), 1)], 'delivered', '2026-01-17'),
    makeOrder('CMD-1002', sarah, [orderItem(findProduct(products, 'support-laptop-flex'), 2), orderItem(findProduct(products, 'ecran-vision-27'), 1)], 'delivered', '2026-01-28'),
    makeOrder('CMD-1003', mehdi, [orderItem(findProduct(products, 'laptop-novabook-14'), 1)], 'delivered', '2026-02-04'),
    makeOrder('CMD-1004', emma, [orderItem(findProduct(products, 'laptop-prostation-16'), 1), orderItem(findProduct(products, 'clavier-rgb-phantom'), 1)], 'paid', '2026-02-21'),
    makeOrder('CMD-1005', nicolas, [orderItem(findProduct(products, 'casque-airsound-pro'), 1), orderItem(findProduct(products, 'micro-studio-usb'), 1)], 'delivered', '2026-03-02'),
    makeOrder('CMD-1006', ines, [orderItem(findProduct(products, 'ampoule-smartlight'), 4), orderItem(findProduct(products, 'hub-connect-plus'), 1)], 'delivered', '2026-03-15'),
    makeOrder('CMD-1007', qays, [orderItem(findProduct(products, 'micro-studio-usb'), 1)], 'pending', '2026-04-03'),
    makeOrder('CMD-1008', sarah, [orderItem(findProduct(products, 'chaise-ergodesk'), 1)], 'paid', '2026-04-12'),
    makeOrder('CMD-1009', mehdi, [orderItem(findProduct(products, 'laptop-prostation-16'), 1)], 'delivered', '2026-04-30'),
    makeOrder('CMD-1010', emma, [orderItem(findProduct(products, 'souris-strike-x'), 2), orderItem(findProduct(products, 'ecran-vision-27'), 1)], 'delivered', '2026-05-11'),
    makeOrder('CMD-1011', nicolas, [orderItem(findProduct(products, 'casque-airsound-pro'), 2)], 'cancelled', '2026-05-17'),
    makeOrder('CMD-1012', ines, [orderItem(findProduct(products, 'camera-securehome'), 1), orderItem(findProduct(products, 'ampoule-smartlight'), 2)], 'delivered', '2026-05-29'),
    makeOrder('CMD-1013', qays, [orderItem(findProduct(products, 'casque-airsound-pro'), 1)], 'delivered', '2026-06-07'),
    makeOrder('CMD-1014', sarah, [orderItem(findProduct(products, 'hub-connect-plus'), 1), orderItem(findProduct(products, 'support-laptop-flex'), 1)], 'pending', '2026-06-18'),
    makeOrder('CMD-1015', mehdi, [orderItem(findProduct(products, 'ecran-vision-27'), 1)], 'paid', '2026-06-24'),
    makeOrder('CMD-1016', emma, [orderItem(findProduct(products, 'laptop-novabook-14'), 1), orderItem(findProduct(products, 'souris-strike-x'), 1)], 'delivered', '2026-06-30')
  ];

  await db.collection('orders').insertMany(orders);

  const reviews = [
    makeReview(findProduct(products, 'clavier-rgb-phantom'), qays, 5, 'Très réactif', 'Parfait pour jouer, touches agréables.', '2026-01-21'),
    makeReview(findProduct(products, 'souris-strike-x'), qays, 4, 'Bonne souris', 'Légère et précise.', '2026-01-22'),
    makeReview(findProduct(products, 'support-laptop-flex'), sarah, 5, 'Super pratique', 'Le support améliore vraiment la posture.', '2026-02-02'),
    makeReview(findProduct(products, 'ecran-vision-27'), sarah, 4, 'Écran confortable', 'Bonne taille pour travailler.', '2026-02-04'),
    makeReview(findProduct(products, 'laptop-novabook-14'), mehdi, 5, 'Très bon PC', 'Rapide, léger, autonomie correcte.', '2026-02-10'),
    makeReview(findProduct(products, 'laptop-prostation-16'), emma, 5, 'Puissant', 'Très bon pour coder et faire du montage.', '2026-03-01'),
    makeReview(findProduct(products, 'casque-airsound-pro'), nicolas, 4, 'Bonne réduction de bruit', 'Très utile en transport.', '2026-03-08'),
    makeReview(findProduct(products, 'micro-studio-usb'), nicolas, 3, 'Correct', 'Le son est bon mais le pied est moyen.', '2026-03-09'),
    makeReview(findProduct(products, 'ampoule-smartlight'), ines, 4, 'Facile à configurer', 'Connexion rapide à l’application.', '2026-03-20'),
    makeReview(findProduct(products, 'hub-connect-plus'), ines, 3, 'Un peu instable', 'Parfois besoin de relancer le hub.', '2026-03-22'),
    makeReview(findProduct(products, 'micro-studio-usb'), qays, 4, 'Très bien pour Discord', 'Installation simple en USB.', '2026-04-08'),
    makeReview(findProduct(products, 'chaise-ergodesk'), sarah, 3, 'Confort moyen', 'Correcte mais manque de réglages.', '2026-04-20'),
    makeReview(findProduct(products, 'laptop-prostation-16'), mehdi, 5, 'Excellent', 'Très rapide avec plusieurs outils ouverts.', '2026-05-05'),
    makeReview(findProduct(products, 'souris-strike-x'), emma, 4, 'Bon rapport qualité/prix', 'Capteur précis.', '2026-05-14'),
    makeReview(findProduct(products, 'camera-securehome'), ines, 4, 'Image claire', 'Vision nocturne correcte.', '2026-06-02'),
    makeReview(findProduct(products, 'casque-airsound-pro'), qays, 5, 'Excellent casque', 'Confortable et son propre.', '2026-06-12')
  ];

  await db.collection('reviews').insertMany(reviews);

  await Promise.all([
    db.collection('products').createIndex({ slug: 1 }, { unique: true }),
    db.collection('products').createIndex({ categorySlug: 1, price: 1, averageRating: -1 }),
    db.collection('orders').createIndex({ customerId: 1, createdAt: -1 }),
    db.collection('orders').createIndex({ status: 1 }),
    db.collection('reviews').createIndex({ productId: 1, rating: -1 })
  ]);

  console.log('✅ Données insérées :');
  console.log(`- ${categories.length} catégories`);
  console.log(`- ${products.length} produits`);
  console.log(`- ${customers.length} clients`);
  console.log(`- ${orders.length} commandes`);
  console.log(`- ${reviews.length} avis`);
  console.log('\nID client utile pour la démo recommandations :');
  console.log(`${qays.name} => ${qays._id}`);

  await closeDB();
}

seed().catch(async (error) => {
  console.error('❌ Erreur seed :', error.message);
  await closeDB();
  process.exit(1);
});
