const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT guest_name, COUNT(*) AS wins
      FROM match_players
      WHERE placement = 1
      GROUP BY guest_name
      ORDER BY wins DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;