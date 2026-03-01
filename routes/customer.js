const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { kerkoRolin } = require('../middleware/auth');

const CMIMI_FIKS = 300;

router.use(kerkoRolin('klient'));

router.get('/', async (req, res) => {
  try {
    const porosite = await db.getAll(`
      SELECT p.*, k.emri as korrier_emri, k.telefoni as korrier_telefoni
      FROM porosite p
      LEFT JOIN perdoruesit k ON p.korrier_id = k.id
      WHERE p.klient_id = $1
      ORDER BY p.krijuar_me DESC
    `, [req.session.user.id]);

    res.render('klient/paneli', { porosite });
  } catch (err) {
    console.error('[CLIENT] Dashboard error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.get('/porosi-e-re', (req, res) => {
  res.render('klient/porosi-e-re', { cmimi: CMIMI_FIKS, gabim: null });
});

router.post('/porosi-e-re', async (req, res) => {
  try {
    const { adresa_marrjes, adresa_dorezimit, telefoni_marrjes, telefoni_dorezimit, pershkrimi, shenime } = req.body;

    if (!adresa_marrjes || !adresa_dorezimit || !telefoni_marrjes || !telefoni_dorezimit || !pershkrimi) {
      return res.render('klient/porosi-e-re', {
        cmimi: CMIMI_FIKS,
        gabim: 'Ju lutem plotësoni të gjitha fushat e detyrueshme.'
      });
    }

    const result = await db.query(
      `INSERT INTO porosite (klient_id, adresa_marrjes, adresa_dorezimit, telefoni_marrjes, telefoni_dorezimit, pershkrimi, shenime, cmimi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [req.session.user.id, adresa_marrjes, adresa_dorezimit, telefoni_marrjes, telefoni_dorezimit, pershkrimi, shenime || null, CMIMI_FIKS]
    );

    const newId = result.rows[0].id;
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [newId, 'Porosia u krijua', req.session.user.id]
    );

    res.redirect('/klient');
  } catch (err) {
    console.error('[CLIENT] New order error:', err.message);
    res.render('klient/porosi-e-re', { cmimi: CMIMI_FIKS, gabim: 'Gabim. Provo përsëri.' });
  }
});

router.get('/porosi/:id', async (req, res) => {
  try {
    const porosi = await db.getOne(`
      SELECT p.*, k.emri as korrier_emri, k.telefoni as korrier_telefoni
      FROM porosite p
      LEFT JOIN perdoruesit k ON p.korrier_id = k.id
      WHERE p.id = $1 AND p.klient_id = $2
    `, [req.params.id, req.session.user.id]);

    if (!porosi) return res.redirect('/klient');

    const historiku = await db.getAll(`
      SELECT h.*, u.emri as perdoruesi_emri
      FROM historiku h
      LEFT JOIN perdoruesit u ON h.perdoruesi_id = u.id
      WHERE h.porosi_id = $1
      ORDER BY h.krijuar_me ASC
    `, [porosi.id]);

    res.render('klient/porosi', { porosi, historiku });
  } catch (err) {
    console.error('[CLIENT] Order detail error:', err.message);
    res.redirect('/klient');
  }
});

module.exports = router;
