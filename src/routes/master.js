const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

const TABLE_MAP = {
  directorates: 'directorates',
  departments: 'departments',
  units: 'units',
  grades: 'grades',
  positions: 'positions',
  patterns: 'work_patterns',
  schedules: 'work_schedules',
  banks: 'banks',
  'payment-methods': 'payment_methods',
  'expense-items': 'expense_items',
  'leave-types': 'leave_types',
  activities: 'activities',
};

// GET /api/v1/master/:entity
router.get('/:entity', async (req, res) => {
  const { entity } = req.params;
  const tableName = TABLE_MAP[entity];

  if (!tableName) {
    return res.status(404).json({ error: `Master data entity '${entity}' not found` });
  }

  try {
    const { rows } = await query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
    res.json(rows);
  } catch (err) {
    console.error(`Fetch master ${entity} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
