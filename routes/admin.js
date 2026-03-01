const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { kerkoRolin } = require('../middleware/auth');

router.use(kerkoRolin('admin'));

router.get('/', async (req, res) => {
  try {
    const statusi = req.query.statusi || '';

    let query = `
      SELECT p.*, kl.emri as klient_emri, kr.emri as korrier_emri
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      LEFT JOIN perdoruesit kr ON p.korrier_id = kr.id
    `;

    const params = [];
    if (statusi) {
      query += ' WHERE p.statusi = $1';
      params.push(statusi);
    }

    query += ' ORDER BY p.krijuar_me DESC';

    const porosite = await db.getAll(query, params);

    const counts = await db.getOne(`
      SELECT
        COUNT(*) as te_gjitha,
        COUNT(*) FILTER (WHERE statusi = 'E_RE') as e_re,
        COUNT(*) FILTER (WHERE statusi = 'CAKTUAR') as caktuar,
        COUNT(*) FILTER (WHERE statusi = 'MARRE') as marre,
        COUNT(*) FILTER (WHERE statusi = 'DOREZUAR') as dorezuar,
        COUNT(*) FILTER (WHERE statusi = 'ANULUAR') as anuluar
      FROM porosite
    `);

    const numrat = {
      te_gjitha: parseInt(counts.te_gjitha),
      e_re: parseInt(counts.e_re),
      caktuar: parseInt(counts.caktuar),
      marre: parseInt(counts.marre),
      dorezuar: parseInt(counts.dorezuar),
      anuluar: parseInt(counts.anuluar)
    };

    res.render('admin/paneli', { porosite, statusi, numrat });
  } catch (err) {
    console.error('[ADMIN] Dashboard error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.get('/porosi/:id', async (req, res) => {
  try {
    const porosi = await db.getOne(`
      SELECT p.*, kl.emri as klient_emri, kl.telefoni as klient_telefoni, kl.email as klient_email,
             kr.emri as korrier_emri, kr.telefoni as korrier_telefoni
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      LEFT JOIN perdoruesit kr ON p.korrier_id = kr.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (!porosi) return res.redirect('/admin');

    const historiku = await db.getAll(`
      SELECT h.*, u.emri as perdoruesi_emri
      FROM historiku h
      LEFT JOIN perdoruesit u ON h.perdoruesi_id = u.id
      WHERE h.porosi_id = $1
      ORDER BY h.krijuar_me ASC
    `, [porosi.id]);

    res.render('admin/porosi', { porosi, historiku });
  } catch (err) {
    console.error('[ADMIN] Order detail error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.post('/porosi/:id/anulo', async (req, res) => {
  try {
    const porosi = await db.getOne(
      "SELECT * FROM porosite WHERE id = $1 AND statusi != 'DOREZUAR' AND statusi != 'ANULUAR'",
      [req.params.id]
    );

    if (!porosi) return res.redirect('/admin');

    await db.run("UPDATE porosite SET statusi = 'ANULUAR' WHERE id = $1", [porosi.id]);
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, 'Porosia u anulua nga admini', req.session.user.id]
    );

    res.redirect(`/admin/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[ADMIN] Cancel error:', err.message);
    res.redirect('/admin');
  }
});

router.get('/korrieret', async (req, res) => {
  try {
    const korrieret = await db.getAll(`
      SELECT u.*,
        (SELECT COUNT(*) FROM porosite WHERE korrier_id = u.id AND statusi = 'DOREZUAR') as dorezuar,
        (SELECT COUNT(*) FROM porosite WHERE korrier_id = u.id AND statusi IN ('CAKTUAR', 'MARRE')) as aktive
      FROM perdoruesit u WHERE u.roli = 'korrier'
    `);

    res.render('admin/korrieret', { korrieret });
  } catch (err) {
    console.error('[ADMIN] Couriers error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.post('/shto-korrier', async (req, res) => {
  try {
    const { emri, email, telefoni, fjalekalimi } = req.body;

    const exists = await db.getOne('SELECT id FROM perdoruesit WHERE email = $1', [email]);
    if (exists) return res.redirect('/admin/korrieret?gabim=ekziston');

    const hash = bcrypt.hashSync(fjalekalimi, 10);
    await db.run(
      'INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli) VALUES ($1, $2, $3, $4, $5)',
      [emri, email, telefoni, hash, 'korrier']
    );

    res.redirect('/admin/korrieret');
  } catch (err) {
    console.error('[ADMIN] Add courier error:', err.message);
    res.redirect('/admin/korrieret');
  }
});

module.exports = router;
