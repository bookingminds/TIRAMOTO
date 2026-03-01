function kerkoHyrje(req, res, next) {
  if (!req.session.user) return res.redirect('/hyr');
  next();
}

function kerkoRolin(roli) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/hyr');
    if (req.session.user.roli !== roli) {
      return res.status(403).render('gabim', { mesazhi: 'Nuk keni akses në këtë faqe.' });
    }
    next();
  };
}

module.exports = { kerkoHyrje, kerkoRolin };
