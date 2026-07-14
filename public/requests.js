const listEl = document.getElementById('list');
let deleteTargetId = null;

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

    document.getElementById('logSection').open = true;
    loadDeletionLog();
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
        <div style="display:flex;gap:6px">
          <a class="btn primary" href="/api/download/${r.id}">Download</a>
          <button class="btn danger" onclick="showDeleteModal('${r.id}', '${escapeHtml(r.object || 'Untitled request')}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p class="hint">Could not load requests.</p>';
  }
}

function showDeleteModal(id, label) {
  deleteTargetId = id;
  document.getElementById('deleteLabel').textContent = label;
  document.getElementById('deleteNameInput').value = '';
  document.getElementById('deleteError').classList.add('hidden');
  document.getElementById('deleteModal').classList.remove('hidden');
  document.getElementById('deleteNameInput').focus();
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  deleteTargetId = null;
}

async function confirmDelete() {
  const name = document.getElementById('deleteNameInput').value.trim();
  if (!name) {
    const errEl = document.getElementById('deleteError');
    errEl.textContent = 'Please enter your name.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/requests/${deleteTargetId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedBy: name }),
    });
    if (!res.ok) {
      const err = await res.json();
      const errEl = document.getElementById('deleteError');
      errEl.textContent = err.error || 'Failed to delete.';
      errEl.classList.remove('hidden');
      return;
    }
    closeDeleteModal();
    loadRequests();
  } catch {
    const errEl = document.getElementById('deleteError');
    errEl.textContent = 'Could not delete request.';
    errEl.classList.remove('hidden');
  }
}

document.getElementById('deleteNameInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') confirmDelete();
  if (e.key === 'Escape') closeDeleteModal();
});

async function loadDeletionLog() {
  const el = document.getElementById('logList');
  try {
    const res = await fetch('/api/deletion-log');
    const entries = await res.json();
    if (entries.length === 0) {
      el.innerHTML = '<p class="hint">No deletions recorded.</p>';
      return;
    }
    el.innerHTML = entries.reverse().map((e) => `
      <div class="log-entry">
        <span class="log-label">${escapeHtml(e.object || '—')}</span>
        <span class="log-meta">deleted by ${escapeHtml(e.deletedBy)} &middot; ${fmtDate(e.deletedAt)}</span>
      </div>
    `).join('');
  } catch {
    el.innerHTML = '<p class="hint">Could not load deletion log.</p>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (sessionStorage.getItem('requestsAccess') === 'true') { loadRequests(); }
