const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

function buildHtml(data) {
  const object = data.object || 'N/A';
  const issuedBy = data.issuedBy || 'N/A';
  const place = data.place || 'N/A';
  const date = data.date || 'N/A';
  const lineCount = Array.isArray(data.lineItems) ? data.lineItems.length : 0;
  const usdTotal = (data.lineItems || [])
    .reduce((s, i) => s + (Number(i.usdAmount) || 0), 0)
    .toLocaleString('en-US', { minimumFractionDigits: 2 });
  const lkrTotal = (data.lineItems || [])
    .reduce((s, i) => s + (Number(i.lkrAmount) || 0), 0)
    .toLocaleString('en-US', { minimumFractionDigits: 2 });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#e9eaec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e9eaec;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#1f5c99;padding:20px 30px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New CAPEX Application Submitted</h1>
            <p style="margin:4px 0 0;color:#b8d4f0;font-size:13px;">A new capital expenditure request has been received.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 30px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:140px;">Object</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;font-weight:600;">${object}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">Submitted by</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;">${issuedBy}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">Place</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;">${place}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">Date</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;">${date}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#888;font-size:13px;">Total</td>
                <td style="padding:10px 0;color:#1a1a1a;font-size:14px;font-weight:600;">USD ${usdTotal} &nbsp;|&nbsp; LKR ${lkrTotal}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f7f7;padding:16px 30px;border-top:1px solid #eee;">
            <p style="margin:0 0 6px;color:#999;font-size:11px;text-align:center;">This is an auto-generated email. Please do not reply.</p>
            <p style="margin:0;color:#999;font-size:11px;text-align:center;">&copy; 2026 Gislaved Gummi Lanka (Pvt) Ltd | Elastomeric Engineering Co Ltd &bull; All rights reserved.<br>Developed by IT Department.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(data) {
  const usdTotal = (data.lineItems || []).reduce((s, i) => s + (Number(i.usdAmount) || 0), 0);
  const lkrTotal = (data.lineItems || []).reduce((s, i) => s + (Number(i.lkrAmount) || 0), 0);
  return [
    'New CAPEX Application Submitted',
    '',
    `Object:        ${data.object || 'N/A'}`,
    `Submitted by:  ${data.issuedBy || 'N/A'}`,
    `Place:         ${data.place || 'N/A'}`,
    `Date:          ${data.date || 'N/A'}`,
    `Total:         USD ${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} | LKR ${lkrTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    '',
    'This is an auto-generated email.',
  ].join('\n');
}

async function notifyNewSubmission(data) {
  const recipients = (process.env.MAIL_RECIPIENTS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) return;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USERNAME,
    to: recipients.join(','),
    subject: 'New CAPEX Application Submitted',
    text: buildText(data),
    html: buildHtml(data),
  });

  console.log('Notification sent:', info.messageId);
}

module.exports = { notifyNewSubmission };
