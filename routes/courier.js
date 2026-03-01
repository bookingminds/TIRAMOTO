const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { kerkoRolin } = require('../middleware/auth');

const MAX_AKTIVE = 5;

router.use(kerkoRolin('korrier'));

router.get('/', async (req, res) => {
  try {
    const tab = req.query.tab || 'te-reja';
    const mesazh = req.query.mesazh || null;
    const gabim = req.query.gabim || null;

    const teMiat = await db.getAll(`
      SELECT p.*, kl.emri as klient_emri, kl.telefoni as klient_telefoni
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      WHERE p.korrier_id = $1 AND p.statusi IN ('CAKTUAR', 'MARRE')
      ORDER BY
        CASE p.statusi WHEN 'CAKTUAR' THEN 1 WHEN 'MARRE' THEN 2 END,
        p.krijuar_me DESC
    `, [req.session.user.id]);

    const teKryera = await db.getAll(`
      SELECT p.*, kl.emri as klient_emri, kl.telefoni as klient_telefoni
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      WHERE p.korrier_id = $1 AND p.statusi = 'DOREZUAR'
      ORDER BY p.dorezuar_me DESC
      LIMIT 20
    `, [req.session.user.id]);

    const teReja = await db.getAll(`
      SELECT p.*, kl.emri as klient_emri
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      WHERE p.statusi = 'E_RE' AND p.korrier_id IS NULL
      ORDER BY p.krijuar_me ASC
    `);

    const numriAktive = teMiat.length;

    res.render('korrier/paneli', {
      tab, teMiat, teKryera, teReja, numriAktive, maxAktive: MAX_AKTIVE, mesazh, gabim
    });
  } catch (err) {
    console.error('[COURIER] Dashboard error:', err.message);
    res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm.' });
  }
});

router.post('/merr', async (req, res) => {
  const client = await db.pool.connect();
  try {
    let { porosi_ids } = req.body;

    if (!porosi_ids) {
      return res.redirect('/korrier?tab=te-reja&gabim=' + encodeURIComponent('Zgjidhni së paku një porosi.'));
    }

    if (!Array.isArray(porosi_ids)) porosi_ids = [porosi_ids];

    const aktiveResult = await client.query(
      "SELECT COUNT(*) as n FROM porosite WHERE korrier_id = $1 AND statusi IN ('CAKTUAR', 'MARRE')",
      [req.session.user.id]
    );
    const aktive = parseInt(aktiveResult.rows[0].n);

    if (aktive + porosi_ids.length > MAX_AKTIVE) {
      client.release();
      return res.redirect('/korrier?tab=te-reja&gabim=' +
        encodeURIComponent(`Ke arritur limitin e porosive aktive. Maksimumi: ${MAX_AKTIVE}, aktive tani: ${aktive}.`));
    }

    let morraSukseshem = 0;
    let vecTeMarrura = 0;

    await client.query('BEGIN');

    for (const id of porosi_ids) {
      const result = await client.query(
        `UPDATE porosite
         SET korrier_id = $1, statusi = 'CAKTUAR', caktuar_me = NOW()
         WHERE id = $2 AND statusi = 'E_RE' AND korrier_id IS NULL`,
        [req.session.user.id, id]
      );

      if (result.rowCount > 0) {
        await client.query(
          'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
          [id, 'Porosia u mor nga korrieri', req.session.user.id]
        );
        morraSukseshem++;
      } else {
        vecTeMarrura++;
      }
    }

    await client.query('COMMIT');
    client.release();

    if (vecTeMarrura > 0 && morraSukseshem === 0) {
      return res.redirect('/korrier?tab=te-reja&gabim=' +
        encodeURIComponent('Kjo porosi u mor nga një korrier tjetër. Lista u rifreskua.'));
    }

    let msg = `U morën ${morraSukseshem} porosi me sukses.`;
    if (vecTeMarrura > 0) {
      msg += ` ${vecTeMarrura} porosi ishin marrë nga korrier tjetër.`;
    }

    res.redirect('/korrier?tab=te-miat&mesazh=' + encodeURIComponent(msg));
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error('[COURIER] Claim error:', err.message);
    res.redirect('/korrier?tab=te-reja&gabim=' + encodeURIComponent('Gabim. Provo përsëri.'));
  }
});

router.get('/porosi/:id', async (req, res) => {
  try {
    const porosi = await db.getOne(`
      SELECT p.*, kl.emri as klient_emri, kl.telefoni as klient_telefoni
      FROM porosite p
      JOIN perdoruesit kl ON p.klient_id = kl.id
      WHERE p.id = $1 AND p.korrier_id = $2
    `, [req.params.id, req.session.user.id]);

    if (!porosi) return res.redirect('/korrier');

    res.render('korrier/porosi', { porosi });
  } catch (err) {
    console.error('[COURIER] Order detail error:', err.message);
    res.redirect('/korrier');
  }
});

router.post('/porosi/:id/marre', async (req, res) => {
  try {
    const porosi = await db.getOne(
      'SELECT * FROM porosite WHERE id = $1 AND korrier_id = $2 AND statusi = $3',
      [req.params.id, req.session.user.id, 'CAKTUAR']
    );

    if (!porosi) return res.redirect('/korrier');

    await db.run('UPDATE porosite SET statusi = $1, marre_me = NOW() WHERE id = $2', ['MARRE', porosi.id]);
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, 'Porosia u mor nga korrieri', req.session.user.id]
    );

    res.redirect(`/korrier/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[COURIER] Pickup error:', err.message);
    res.redirect('/korrier');
  }
});

router.post('/porosi/:id/dorezuar', async (req, res) => {
  try {
    const porosi = await db.getOne(
      'SELECT * FROM porosite WHERE id = $1 AND korrier_id = $2 AND statusi = $3',
      [req.params.id, req.session.user.id, 'MARRE']
    );

    if (!porosi) return res.redirect('/korrier');

    await db.run('UPDATE porosite SET statusi = $1, dorezuar_me = NOW() WHERE id = $2', ['DOREZUAR', porosi.id]);
    await db.run(
      'INSERT INTO historiku (porosi_id, veprimi, perdoruesi_id) VALUES ($1, $2, $3)',
      [porosi.id, 'Porosia u dorëzua', req.session.user.id]
    );

    res.redirect(`/korrier/porosi/${porosi.id}`);
  } catch (err) {
    console.error('[COURIER] Deliver error:', err.message);
    res.redirect('/korrier');
  }
});

module.exports = router;
