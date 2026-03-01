const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),

  getOne: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  },

  getAll: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  },

  run: async (text, params) => {
    const result = await pool.query(text, params);
    return result;
  },

  pool
};

async function initDatabase() {
  try {
    const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_schema.sql'), 'utf-8');
    await pool.query(schemaSQL);
    console.log('[DB] Schema initialized');

    const admin = await db.getOne('SELECT id FROM perdoruesit WHERE email = $1', ['admin@tiramoto.al']);
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli) VALUES ($1, $2, $3, $4, $5)',
        ['Admin TIRAMOTO', 'admin@tiramoto.al', '+355 69 000 0000', hash, 'admin']
      );
      console.log('[DB] Admin u krijua: admin@tiramoto.al / admin123');
    }

    const korrier = await db.getOne('SELECT id FROM perdoruesit WHERE email = $1', ['korrier@tiramoto.al']);
    if (!korrier) {
      const hash = bcrypt.hashSync('korrier123', 10);
      await pool.query(
        'INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli) VALUES ($1, $2, $3, $4, $5)',
        ['Korrier Test', 'korrier@tiramoto.al', '+355 69 111 1111', hash, 'korrier']
      );
      console.log('[DB] Korrier test u krijua: korrier@tiramoto.al / korrier123');
    }

    console.log('[DB] Ready');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
    throw err;
  }
}

module.exports = db;
module.exports.initDatabase = initDatabase;
