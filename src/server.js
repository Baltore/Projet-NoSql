const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db');
const apiRoutes = require('../routes/api');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 API lancée : http://localhost:${port}`);
      console.log(`🌐 Front lancé : http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Erreur de connexion MongoDB :', error.message);
    process.exit(1);
  });
