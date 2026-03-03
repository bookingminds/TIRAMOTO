const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const db = require('../db/init');
const { notifyNewUser } = require('../utils/email');

router.get('/hyr', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('hyr', { gabim: null });
});

router.post('/hyr', async (req, res) => {
  try {
    const { email, fjalekalimi } = req.body;
    const user = await db.getOne('SELECT * FROM perdoruesit WHERE email = $1', [email]);

    if (!user || !bcrypt.compareSync(fjalekalimi, user.fjalekalimi)) {
      return res.render('hyr', { gabim: 'Email ose fjalëkalimi gabim.' });
    }

    req.session.user = {
      id: user.id,
      emri: user.emri,
      email: user.email,
      telefoni: user.telefoni,
      roli: user.roli
    };

    res.redirect('/');
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.render('hyr', { gabim: 'Gabim i brendshëm. Provo përsëri.' });
  }
});

router.get('/regjistrohu', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('regjistrohu', { gabim: null });
});

router.post('/regjistrohu', async (req, res) => {
  try {
    const { emri, email, telefoni, fjalekalimi, fjalekalimi2 } = req.body;

    if (fjalekalimi !== fjalekalimi2) {
      return res.render('regjistrohu', { gabim: 'Fjalëkalimet nuk përputhen.' });
    }

    if (fjalekalimi.length < 6) {
      return res.render('regjistrohu', { gabim: 'Fjalëkalimi duhet të jetë së paku 6 karaktere.' });
    }

    const exists = await db.getOne('SELECT id FROM perdoruesit WHERE email = $1', [email]);
    if (exists) {
      return res.render('regjistrohu', { gabim: 'Ky email është i regjistruar tashmë.' });
    }

    const hash = bcrypt.hashSync(fjalekalimi, 10);
    await db.run(
      'INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli) VALUES ($1, $2, $3, $4, $5)',
      [emri, email, telefoni, hash, 'klient']
    );

    const user = await db.getOne('SELECT * FROM perdoruesit WHERE email = $1', [email]);
    req.session.user = {
      id: user.id,
      emri: user.emri,
      email: user.email,
      telefoni: user.telefoni,
      roli: user.roli
    };

    notifyNewUser({ emri, email, telefoni }).catch(() => {});

    res.redirect('/');
  } catch (err) {
    console.error('[AUTH] Register error:', err.message);
    res.render('regjistrohu', { gabim: 'Gabim i brendshëm. Provo përsëri.' });
  }
});

router.get('/auth/google', (req, res, next) => {
  if (!passport._strategies.google) {
    return res.render('hyr', { gabim: 'Google OAuth nuk është konfiguruar.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { failureRedirect: '/hyr' }, (err, user) => {
    if (err || !user) return res.redirect('/hyr');
    req.session.user = {
      id: user.id,
      emri: user.emri,
      email: user.email,
      telefoni: user.telefoni,
      roli: user.roli
    };
    res.redirect('/');
  })(req, res, next);
});

router.get('/dil', (req, res) => {
  req.logout(function() {
    req.session.destroy(function() {
      res.redirect('/hyr');
    });
  });
});

module.exports = router;
