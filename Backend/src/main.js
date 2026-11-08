require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db.config');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const productRoutes = require('./routes/product.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check: GET /api/health (also checks the database connection)
app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/products', productRoutes);

// 404 and errors (keep these last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
