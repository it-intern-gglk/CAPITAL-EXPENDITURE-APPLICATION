const lineItemsEl = document.getElementById('lineItems');
const addItemBtn = document.getElementById('addItem');
const totalUsdEl = document.getElementById('totalUsd');
const totalLkrEl = document.getElementById('totalLkr');
const rateEcho = document.getElementById('rateEcho');
const usdRateInput = document.querySelector('input[name="usdRate"]');
const form = document.getElementById('capexForm');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('resultCard');
const downloadLink = document.getElementById('downloadLink');

const thisRequestEl = document.getElementById('thisRequest');
const balanceBudgetEl = document.getElementById('balanceBudget');
const appropriationEl = document.getElementById('appropriation');
const totalCapReqEl = document.getElementById('totalCapReq');
const appropriationAmountEl = document.getElementById('appropriationAmount');
const totalBudgetInput = document.querySelector('input[name="totalBudgetAmount"]');
const whereofApprovedInput = document.querySelector('input[name="whereofApproved"]');
const categoryInputs = document.querySelectorAll('input[name="capexCategory"]');

function addLineItem(description = '', usd = '', lkr = '') {
  const row = document.createElement('tr');
  row.className = 'line-item';
  row.dataset.lastEdit = '';
  row.innerHTML = `
    <td><input type="text" class="item-desc" placeholder="" value="${description}" required></td>
    <td><input type="number" step="0.01" class="item-usd" placeholder="0.00" value="${usd}"></td>
    <td><input type="number" step="0.01" class="item-lkr" placeholder="0.00" value="${lkr}"></td>
    <td><button type="button" class="remove-item" title="Remove item">×</button></td>
  `;
  row.querySelector('.item-usd').addEventListener('input', function () {
    row.dataset.lastEdit = 'usd';
    syncRow(row);
  });
  row.querySelector('.item-lkr').addEventListener('input', function () {
    row.dataset.lastEdit = 'lkr';
    syncRow(row);
  });
  row.querySelector('.remove-item').addEventListener('click', () => {
    row.remove();
    recalc();
  });
  lineItemsEl.appendChild(row);
  recalc();
}

function syncRow(row) {
  const rate = parseFloat(usdRateInput.value) || 0;
  const usdEl = row.querySelector('.item-usd');
  const lkrEl = row.querySelector('.item-lkr');
  if (row.dataset.lastEdit === 'usd' && rate > 0) {
    const usd = parseFloat(usdEl.value) || 0;
    lkrEl.value = usd ? (usd * rate).toFixed(2) : '';
  } else if (row.dataset.lastEdit === 'lkr' && rate > 0) {
    const lkr = parseFloat(lkrEl.value) || 0;
    usdEl.value = lkr ? (lkr / rate).toFixed(2) : '';
  }
  recalc();
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recalc() {
  const rate = parseFloat(usdRateInput.value) || 0;
  rateEcho.textContent = usdRateInput.value || '0';

  let usd = 0;
  let lkr = 0;
  lineItemsEl.querySelectorAll('.line-item').forEach((row) => {
    usd += parseFloat(row.querySelector('.item-usd').value) || 0;
    lkr += parseFloat(row.querySelector('.item-lkr').value) || 0;
  });
  const lkrTotal = lkr;

  totalUsdEl.textContent = fmt(usd);
  totalLkrEl.textContent = fmt(lkrTotal);

  const totalBudget = parseFloat(totalBudgetInput.value) || 0;
  const whereofApproved = parseFloat(whereofApprovedInput.value) || 0;
  thisRequestEl.textContent = fmt(lkrTotal);
  balanceBudgetEl.textContent = fmt(totalBudget - whereofApproved - lkrTotal);

  appropriationEl.textContent = fmt(lkrTotal);
  totalCapReqEl.textContent = fmt(lkrTotal);
  appropriationAmountEl.textContent = fmt(lkrTotal);

  document.querySelectorAll('.cat-amt').forEach((cell) => { cell.textContent = '–'; });
  document.querySelectorAll('input[name="capexCategory"]:checked').forEach((cb) => {
    const cell = document.querySelector(`.cat-amt[data-cat="${cb.value}"]`);
    if (cell) cell.textContent = fmt(lkrTotal);
  });
}

usdRateInput.addEventListener('input', function () {
  document.querySelectorAll('.line-item').forEach((row) => {
    const last = row.dataset.lastEdit;
    if (last === 'usd' || last === 'lkr') syncRow(row);
  });
  recalc();
});
totalBudgetInput.addEventListener('input', recalc);
whereofApprovedInput.addEventListener('input', recalc);
categoryInputs.forEach((r) => r.addEventListener('change', recalc));
addItemBtn.addEventListener('click', () => addLineItem());

addLineItem();
addLineItem();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';

  const fd = new FormData(form);
  const lineItems = Array.from(lineItemsEl.querySelectorAll('.line-item')).map((row) => ({
    description: row.querySelector('.item-desc').value,
    usdAmount: row.querySelector('.item-usd').value,
    lkrAmount: row.querySelector('.item-lkr').value,
  })).filter((i) => i.description);

  if (lineItems.length === 0) {
    statusEl.textContent = 'Add at least one cost item.';
    return;
  }
  if (!fd.get('reason')) {
    statusEl.textContent = 'Select at least one reason.';
    return;
  }
  const categories = Array.from(fd.getAll('capexCategory'));
  if (categories.length === 0) {
    statusEl.textContent = 'Select a capital expenditure category.';
    return;
  }

  const payload = {
    date: fd.get('date'),
    company: fd.get('company'),
    issuedBy: fd.get('issuedBy'),
    investNo: fd.get('investNo'),
    usdRate: fd.get('usdRate'),
    place: fd.get('place'),
    object: fd.get('object'),
    lineItems,
    reason: fd.get('reason'),
    reasonDescription: fd.get('reasonDescription'),
    startYear: fd.get('startYear'),
    startMonth: fd.get('startMonth'),
    startYearDuration: fd.get('startYearDuration'),
    completedYear: fd.get('completedYear'),
    completedMonth: fd.get('completedMonth'),
    completedYearDuration: fd.get('completedYearDuration'),
    totalBudgetAmount: fd.get('totalBudgetAmount'),
    whereofApproved: fd.get('whereofApproved'),
    capexCategory: categories,
    disposalAmount: fd.get('disposalAmount'),
    changeOpCapital: fd.get('changeOpCapital'),
    paybackYears: fd.get('paybackYears'),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating…';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    downloadLink.href = data.downloadUrl;
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    statusEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate application';
  }
});
