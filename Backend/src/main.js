require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db.config');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const productRoutes = require('./routes/product.routes');
const purchaseReturnRoutes = require('./routes/purchaseReturn.routes');
const saleReturnRoutes = require('./routes/saleReturn.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const stockRoutes = require('./routes/stock.routes');
const supplierRoutes = require('./routes/supplier.routes');
const purchaseRoutes = require('./routes/purchase.routes');

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
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/sale-returns', saleReturnRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);

// 404 and errors (keep these last)
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;

async function startServer() {
  try {
    const result = await pool.query('SELECT current_database() AS database_name');
    console.log(`Connected to PostgreSQL database: ${result.rows[0].database_name}`);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Could not connect to PostgreSQL. Check Backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).');
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
}

if (require.main === module) startServer();

module.exports = app;
