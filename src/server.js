require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { query } = require('./db/connection');

// Import Route Handlers
const { router: authRouter, authenticateToken, handleMe } = require('./routes/auth');
const employeeRouter = require('./routes/employees');
const masterRouter = require('./routes/master');
const attendanceRouter = require('./routes/attendance');
const requestsRouter = require('./routes/requests');
const operationsRouter = require('./routes/operations');
const payrollRouter = require('./routes/payroll');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck Endpoint (/api/v1/health & /api/health)
async function handleHealth(req, res) {
  try {
    const dbRes = await query('SELECT 1 as ping');
    const nowJakarta = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    res.json({
      status: 'UP',
      app: 'HRIS EasyGo Backend',
      version: '6.3.0',
      database: dbRes.rows[0].ping === 1 ? 'Connected (Neon PostgreSQL)' : 'Unknown',
      timestampJakarta: nowJakarta,
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      error: err.message,
    });
  }
}

app.get('/api/health', handleHealth);
app.get('/api/v1/health', handleHealth);

// Mount API v1 Routes
app.use('/api/v1/auth', authRouter);
app.get('/api/v1/me', authenticateToken, handleMe);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/master', masterRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/requests', requestsRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/payroll', payrollRouter);

// Legacy Compatibility Endpoints
app.get('/employees', async (req, res) => {
  const { rows } = await query('SELECT * FROM employees ORDER BY id ASC');
  res.json(rows);
});
app.get('/employees/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
  res.json(rows[0]);
});

// Serve the Standalone Mockup HTML at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'HRIS-EasyGo-Mockup-v6.3.html'));
});

// Serve other static files if needed
app.use(express.static(path.join(__dirname, '..')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 HRIS EasyGo Server running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`🌐 Web UI: http://localhost:${PORT}/`);
  });
}

module.exports = app;
