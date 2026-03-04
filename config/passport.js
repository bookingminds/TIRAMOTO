const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db/init');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { notifyNewUser } = require('../utils/email');

module.exports = function (passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.getOne(
        'SELECT id, emri, email, telefoni, roli, google_id FROM perdoruesit WHERE id = $1', [id]
      );
      done(null, user || false);
    } catch (err) {
      done(err, false);
    }
  });

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || clientID === 'your-google-client-id-here') {
    console.log('[AUTH] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    return;
  }

  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  passport.use(new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL: `${baseURL}/auth/google/callback`,
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) return done(null, false);

      let user = await db.getOne('SELECT * FROM perdoruesit WHERE google_id = $1', [profile.id]);
      if (user) return done(null, user);

      user = await db.getOne('SELECT * FROM perdoruesit WHERE email = $1', [email]);
      if (user) {
        await db.run('UPDATE perdoruesit SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
        return done(null, user);
      }

      const randomPass = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
      const displayName = profile.displayName || email.split('@')[0];

      await db.run(
        'INSERT INTO perdoruesit (emri, email, fjalekalimi, google_id, roli) VALUES ($1, $2, $3, $4, $5)',
        [displayName, email, randomPass, profile.id, 'klient']
      );

      const newUser = await db.getOne('SELECT * FROM perdoruesit WHERE google_id = $1', [profile.id]);
      notifyNewUser({ emri: displayName, email, telefoni: '' }).catch(() => {});
      return done(null, newUser);
    } catch (err) {
      return done(err, false);
    }
  }));
};
