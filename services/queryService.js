const { ObjectId } = require('mongodb');
const { getDB } = require('../src/db');

function toNumber(value, defaultValue = undefined) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

async function getDashboard() {
  const db = getDB();
  const [productCount, customerCount, orderCount, lowStockProducts, revenueAgg, topRated] = await Promise.all([
    db.collection('products').countDocuments(),
    db.collection('customers').countDocuments(),
    db.collection('orders').countDocuments(),
    db.collection('products').find({ stock: { $lte: 5 } }).project({ name: 1, stock: 1, price: 1, categorySlug: 1 }).toArray(),
    db.collection('orders').aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } }
    ]).toArray(),
    db.collection('products').find({ averageRating: { $gte: 4 } })
      .sort({ averageRating: -1, sold: -1 })
      .limit(5)
      .project({ name: 1, averageRating: 1, price: 1, stock: 1, sold: 1 })
      .toArray()
  ]);

  return {
    kpis: {
      products: productCount,
      customers: customerCount,
      orders: orderCount,
      revenue: revenueAgg[0]?.revenue || 0,
      lowStockCount: lowStockProducts.length
    },
    lowStockProducts,
    topRated
  };
}

async function findProducts(query) {
  const db = getDB();
  const filter = {};

  if (query.q) {
    filter.$or = [
      { name: { $regex: query.q, $options: 'i' } },
      { tags: { $regex: query.q, $options: 'i' } },
      { brand: { $regex: query.q, $options: 'i' } }
    ];
  }

  if (query.category) filter.categorySlug = query.category;
  if (query.onlyInStock === 'true') filter.stock = { ...(filter.stock || {}), $gt: 0 };

  const maxPrice = toNumber(query.maxPrice);
  if (maxPrice !== undefined) filter.price = { ...(filter.price || {}), $lte: maxPrice };

  const minRating = toNumber(query.minRating);
  if (minRating !== undefined) filter.averageRating = { $gte: minRating };

  let sort = { name: 1 };
  if (query.sort === 'price-asc') sort = { price: 1 };
  if (query.sort === 'price-desc') sort = { price: -1 };
  if (query.sort === 'rating') sort = { averageRating: -1, sold: -1 };
  if (query.sort === 'stock') sort = { stock: 1 };
  if (query.sort === 'sold') sort = { sold: -1 };

  const limit = Math.min(toNumber(query.limit, 30), 100);

  return db.collection('products')
    .find(filter)
    .sort(sort)
    .limit(limit)
    .project({ description: 0 })
    .toArray();
}

async function getProductBySlug(slug) {
  const db = getDB();
  const product = await db.collection('products').findOne({ slug });
  if (!product) return null;

  const reviews = await db.collection('reviews').aggregate([
    { $match: { productId: product._id } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: '$customer' },
    {
      $project: {
        rating: 1,
        title: 1,
        comment: 1,
        createdAt: 1,
        customerName: '$customer.name'
      }
    },
    { $sort: { createdAt: -1 } }
  ]).toArray();

  return { ...product, reviews };
}

async function getRecommendations(customerId) {
  const db = getDB();

  if (!ObjectId.isValid(customerId)) {
    throw new Error('customerId invalide');
  }

  const customerObjectId = new ObjectId(customerId);
  const customer = await db.collection('customers').findOne({ _id: customerObjectId });
  const orders = await db.collection('orders').find({ customerId: customerObjectId }).toArray();

  const boughtCategorySlugs = [...new Set(orders.flatMap(order => order.items.map(item => item.categorySlug)))];
  const boughtProductIds = new Set(orders.flatMap(order => order.items.map(item => String(item.productId))));
  const interestSlugs = customer?.interests || [];
  const preferredSlugs = [...new Set([...boughtCategorySlugs, ...interestSlugs])];
  const excludedIds = [...boughtProductIds].map(id => new ObjectId(id));

  // 1) Recommandations personnalisées selon les achats et centres d’intérêt
  if (preferredSlugs.length > 0) {
    const personalized = await db.collection('products').find({
      categorySlug: { $in: preferredSlugs },
      stock: { $gt: 0 },
      averageRating: { $gte: 4 },
      ...(excludedIds.length > 0 ? { _id: { $nin: excludedIds } } : {})
    }).sort({ averageRating: -1, sold: -1 }).limit(5).toArray();

    if (personalized.length > 0) return personalized;
  }

  // 2) Fallback pour éviter un résultat vide pendant la démo
  return db.collection('products').find({
    stock: { $gt: 0 },
    averageRating: { $gte: 4.3 },
    ...(excludedIds.length > 0 ? { _id: { $nin: excludedIds } } : {})
  }).sort({ averageRating: -1, sold: -1 }).limit(5).toArray();
}

async function getAnalytics(type) {
  const db = getDB();

  switch (type) {
    case 'top-products':
      return db.collection('products').find({}).sort({ sold: -1 }).limit(5)
        .project({ name: 1, sold: 1, price: 1, categorySlug: 1 })
        .toArray();

    case 'revenue-by-category':
      return db.collection('orders').aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.categorySlug',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            quantity: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } }
      ]).toArray();

    case 'monthly-revenue':
      return db.collection('orders').aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

    case 'low-stock':
      return db.collection('products').find({ stock: { $lte: 5 } })
        .sort({ stock: 1 })
        .project({ name: 1, stock: 1, categorySlug: 1, price: 1 })
        .toArray();

    case 'pending-orders':
      return db.collection('orders').aggregate([
        { $match: { status: { $in: ['pending', 'paid'] } } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $project: {
            orderNumber: 1,
            status: 1,
            total: 1,
            createdAt: 1,
            customerName: '$customer.name',
            city: '$customer.address.city'
          }
        },
        { $sort: { createdAt: -1 } }
      ]).toArray();

    case 'city-sales':
      return db.collection('orders').aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $group: {
            _id: '$customer.address.city',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]).toArray();

    case 'bad-reviews':
      return db.collection('reviews').aggregate([
        { $match: { rating: { $lte: 3 } } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productName: '$product.name',
            rating: 1,
            title: 1,
            comment: 1,
            createdAt: 1
          }
        },
        { $sort: { rating: 1, createdAt: -1 } }
      ]).toArray();

    default:
      throw new Error('Type d’analyse inconnu');
  }
}

module.exports = {
  getDashboard,
  findProducts,
  getProductBySlug,
  getRecommendations,
  getAnalytics
};
