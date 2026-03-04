const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hb.groupconstruction@gmail.com';

async function sendAdminNotification(subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[EMAIL] RESEND_API_KEY not set, skipping email');
    throw new Error('RESEND_API_KEY not configured');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'TIRAMOTO <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `[TIRAMOTO] ${subject}`,
      html
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[EMAIL] Resend error:', data);
    throw new Error(data.message || 'Email send failed');
  }

  console.log('[EMAIL] Sent:', subject, '| ID:', data.id);
  return data;
}

async function notifyNewOrder(porosi) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#1a1a2e;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">📦 Porosi e re #${porosi.id}</h2>
      </div>
      <div style="border:1px solid #eee;padding:20px;border-radius:0 0 8px 8px">
        <p><strong>Klienti:</strong> ${porosi.klient_emri || 'N/A'}</p>
        <p><strong>Artikulli:</strong> ${porosi.pershkrimi}</p>
        <p><strong>Nga:</strong> ${porosi.adresa_marrjes}</p>
        <p><strong>Tek:</strong> ${porosi.adresa_dorezimit}</p>
        <p><strong>Çmimi:</strong> ${porosi.cmimi} LEK</p>
        <hr style="border:none;border-top:1px solid #eee">
        <a href="${process.env.BASE_URL || 'https://www.tiramoto.com'}/admin/porosi/${porosi.id}"
           style="display:inline-block;background:#6c5ce7;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          Shiko porosinë
        </a>
      </div>
    </div>
  `;
  await sendAdminNotification(`Porosi e re #${porosi.id}`, html);
}

async function notifyCourierRequest(porosi, korrierEmri) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#e17055;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">🔔 Kërkesë konfirmimi - Porosi #${porosi.id}</h2>
      </div>
      <div style="border:1px solid #eee;padding:20px;border-radius:0 0 8px 8px">
        <p><strong>Korrieri ${korrierEmri}</strong> kërkon të marrë porosinë #${porosi.id}.</p>
        <p><strong>Artikulli:</strong> ${porosi.pershkrimi}</p>
        <p><strong>Nga:</strong> ${porosi.adresa_marrjes}</p>
        <p><strong>Tek:</strong> ${porosi.adresa_dorezimit}</p>
        <hr style="border:none;border-top:1px solid #eee">
        <a href="${process.env.BASE_URL || 'https://www.tiramoto.com'}/admin/porosi/${porosi.id}"
           style="display:inline-block;background:#00b894;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px">
          Konfirmo
        </a>
        <a href="${process.env.BASE_URL || 'https://www.tiramoto.com'}/admin"
           style="display:inline-block;background:#636e72;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          Hap panelin
        </a>
      </div>
    </div>
  `;
  await sendAdminNotification(`Korrieri ${korrierEmri} kërkon porosi #${porosi.id}`, html);
}

async function notifyNewUser(user) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#0984e3;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">👤 Klient i ri</h2>
      </div>
      <div style="border:1px solid #eee;padding:20px;border-radius:0 0 8px 8px">
        <p><strong>Emri:</strong> ${user.emri}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Telefoni:</strong> ${user.telefoni || '—'}</p>
      </div>
    </div>
  `;
  return await sendAdminNotification(`Klient i ri: ${user.emri}`, html);
}

module.exports = { notifyNewOrder, notifyCourierRequest, notifyNewUser };
