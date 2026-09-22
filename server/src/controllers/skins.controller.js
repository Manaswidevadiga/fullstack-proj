const pool = require('../config/db');

exports.getSkins = async (req, res) => {
  try {
    const userId = req.user.id;

    const unlocksResult = await pool.query(
      'SELECT unlock_id FROM user_unlocks WHERE user_id = $1',
      [userId]
    );
    const unlocks = unlocksResult.rows.map((r) => r.unlock_id);

    const userResult = await pool.query(
      'SELECT custom_skin_body, custom_skin_head FROM users WHERE id = $1',
      [userId]
    );
    const row = userResult.rows[0] || {};

    res.json({
      unlocks,
      customSkin:
        row.custom_skin_body && row.custom_skin_head
          ? { body: row.custom_skin_body, head: row.custom_skin_head }
          : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.saveCustomSkin = async (req, res) => {
  const { body, head } = req.body;
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  if (!hexPattern.test(body) || !hexPattern.test(head)) {
    return res.status(400).json({ error: 'Colors must be hex codes like #ff8800' });
  }

  try {
    const userId = req.user.id;
    const unlockCheck = await pool.query(
      'SELECT 1 FROM user_unlocks WHERE user_id = $1 AND unlock_id = $2',
      [userId, 'custom_designer']
    );
    if (unlockCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Custom designer not unlocked yet' });
    }

    await pool.query(
      'UPDATE users SET custom_skin_body = $1, custom_skin_head = $2 WHERE id = $3',
      [body, head, userId]
    );
    res.json({ success: true, customSkin: { body, head } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};