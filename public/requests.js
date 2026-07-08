const listEl = document.getElementById('list');

function fmtMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
}

async function loadRequests() {
  try {
    const res = await fetch('/api/requests');
    const requests = await res.json();

    if (requests.length === 0) {
      listEl.innerHTML = '<p class="hint">No requests submitted yet.</p>';
      return;
    }

    listEl.innerHTML = requests.map((r) => `
      <div class="request-card">
        <div class="request-main">
          <h3>${escapeHtml(r.object || 'Untitled request')}</h3>
          <p class="hint">Issued by ${escapeHtml(r.issuedBy || '—')} &middot; ${fmtDate(r.date)} &middot; ${escapeHtml(r.place || '')}</p>
        </div>
        <div class="request-amount">
          <span>USD ${fmtMoney(r.usdTotal)}</span>
          <span>LKR ${fmtMoney(r.lkrTotal)}</span>
        </div>
        <a class="btn primary" href="/api/download/${r.id}">Download</a>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p class="hint">Could not load requests.</p>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (sessionStorage.getItem('requestsAccess') === 'true') { loadRequests(); }
