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
        COUNT(*) FILTER (WHERE statusi = 'NE_PRITJE') as ne_pritje,
        COUNT(*) FILTER (WHERE statusi = 'CAKTUAR') as caktuar,
        COUNT(*) FILTER (WHERE statusi = 'MARRE') as marre,
        COUNT(*) FILTER (WHERE statusi = 'DOREZUAR') as dorezuar,
        COUNT(*) FILTER (WHERE statusi = 'ANULUAR') as anuluar
      FROM porosite
    `);

    const numrat = {
      te_gjitha: parseInt(counts.te_gjitha),
      e_re: parseInt(counts.e_re),
      ne_pritje: parseInt(counts.ne_pritje),
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

    const korrieret = await db.getAll(
      "SELECT id, emri FROM perdoruesit WHERE roli = 'korrier' AND aktiv = true ORDER BY emri"
    );

    res.render('admin/porosi', { porosi, historiku, korrieret });
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
      ORDER BY u.aktiv DESC NULLS FIRST, u.emri ASC
    `);

    res.render('admin/korrieret', { korrieret });
  } catch (err) {
    console.error('[ADMIN] Couriers error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.post('/korrier/:id/toggle', async (req, res) => {
  try {
    const korrier = await db.getOne('SELECT id, aktiv FROM perdoruesit WHERE id = $1 AND roli = $2', [req.params.id, 'korrier']);
    if (!korrier) return res.redirect('/admin/korrieret');

    const newStatus = korrier.aktiv === false ? true : false;
    await db.run('UPDATE perdoruesit SET aktiv = $1 WHERE id = $2', [newStatus, korrier.id]);

    res.redirect('/admin/korrieret');
  } catch (err) {
    console.error('[ADMIN] Toggle courier error:', err.message);
    res.redirect('/admin/korrieret');
  }
});

router.post('/porosi/:id/konfirmo', async (req, res) => {
  try {
    const porosi = await db.getOne(
      "SELECT p.*, kr.emri as korrier_emri FROM porosite p LEFT JOIN perdoruesit kr ON p.korrier_id = kr.id WHERE p.id = $1 AND p.statusi = 'NE_PRITJE'",
      [req.params.id]
    );
    if (!porosi) return res.redirect('/admin');

    await db.run(
      "UPDATE porosite SET statusi = 'CAKTUAR', caktuar_me = NOW() WHERE id = $1",
      [porosi.id]
    );
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, `Admini konfirmoi caktimin tek korrieri ${porosi.korrier_emri}`, req.session.user.id]
    );

    res.redirect(`/admin/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[ADMIN] Confirm error:', err.message);
    res.redirect('/admin');
  }
});

router.post('/porosi/:id/refuzo', async (req, res) => {
  try {
    const porosi = await db.getOne(
      "SELECT p.*, kr.emri as korrier_emri FROM porosite p LEFT JOIN perdoruesit kr ON p.korrier_id = kr.id WHERE p.id = $1 AND p.statusi = 'NE_PRITJE'",
      [req.params.id]
    );
    if (!porosi) return res.redirect('/admin');

    await db.run(
      "UPDATE porosite SET korrier_id = NULL, statusi = 'E_RE' WHERE id = $1",
      [porosi.id]
    );
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, `Admini refuzoi kërkesën e korrierit ${porosi.korrier_emri}`, req.session.user.id]
    );

    res.redirect(`/admin/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[ADMIN] Reject error:', err.message);
    res.redirect('/admin');
  }
});

router.post('/porosi/:id/hiq-korrier', async (req, res) => {
  try {
    const porosi = await db.getOne(
      "SELECT * FROM porosite WHERE id = $1 AND statusi IN ('NE_PRITJE', 'CAKTUAR', 'MARRE')",
      [req.params.id]
    );
    if (!porosi) return res.redirect('/admin');

    await db.run(
      "UPDATE porosite SET korrier_id = NULL, statusi = 'E_RE', caktuar_me = NULL, marre_me = NULL WHERE id = $1",
      [porosi.id]
    );
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, 'Porosia u hoq nga korrieri nga admini', req.session.user.id]
    );

    res.redirect(`/admin/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[ADMIN] Unassign error:', err.message);
    res.redirect('/admin');
  }
});

router.post('/porosi/:id/cakto-korrier', async (req, res) => {
  try {
    const { korrier_id } = req.body;
    const porosi = await db.getOne(
      "SELECT * FROM porosite WHERE id = $1 AND statusi = 'E_RE'",
      [req.params.id]
    );
    if (!porosi) return res.redirect('/admin');

    const korrier = await db.getOne(
      "SELECT id, emri FROM perdoruesit WHERE id = $1 AND roli = 'korrier' AND aktiv = true",
      [korrier_id]
    );
    if (!korrier) return res.redirect(`/admin/porosi/${req.params.id}`);

    await db.run(
      "UPDATE porosite SET korrier_id = $1, statusi = 'CAKTUAR', caktuar_me = NOW() WHERE id = $2",
      [korrier.id, porosi.id]
    );
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, `Porosia u caktua tek korrieri ${korrier.emri} nga admini`, req.session.user.id]
    );

    res.redirect(`/admin/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[ADMIN] Assign courier error:', err.message);
    res.redirect('/admin');
  }
});

router.post('/korrier/:id/fshi', async (req, res) => {
  try {
    const aktive = await db.getOne(
      "SELECT COUNT(*) as n FROM porosite WHERE korrier_id = $1 AND statusi IN ('CAKTUAR', 'MARRE')",
      [req.params.id]
    );
    if (parseInt(aktive.n) > 0) {
      return res.redirect('/admin/korrieret?gabim=' + encodeURIComponent('Korrieri ka porosi aktive. Hiq porosite para se ta fshish.'));
    }

    await db.run("DELETE FROM perdoruesit WHERE id = $1 AND roli = 'korrier'", [req.params.id]);
    res.redirect('/admin/korrieret');
  } catch (err) {
    console.error('[ADMIN] Delete courier error:', err.message);
    res.redirect('/admin/korrieret');
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
