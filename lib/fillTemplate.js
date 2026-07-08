const path = require('path');
const ExcelJS = require('exceljs');

const TEMPLATE_PATH = path.join(__dirname, '..', 'template', 'capex_template.xlsx');
const CURRENCY_FMT = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

// The template ships with 4 pre-formatted item rows (10-13) before the Total
// row (14). If a submission has more than 4 items, we duplicate row 13's
// formatting to insert extra rows, which pushes everything below (Total,
// budget box, capital requirement box, signatures...) down. ExcelJS does not
// rewrite formula text when it shifts rows, so every formula that points at
// a "moved" cell is rebuilt explicitly below using R().
const BASE_ITEM_ROWS = 4; // rows 10-13
const FIRST_ITEM_ROW = 10;
const ORIGINAL_TOTAL_ROW = 14; // first row that shifts down when extra items are added

const REASON_CELLS = {
  expansion: { row: 22, col: 'D' },
  workingEnvironment: { row: 22, col: 'I' },
  environmentProtection: { row: 24, col: 'D' },
  rationalization: { row: 24, col: 'I' },
  replacement: { row: 26, col: 'D' },
  marketingPR: { row: 26, col: 'I' },
};

const CATEGORY_ROWS = {
  land: 40,
  landImprovement: 42,
  buildings: 44,
  plantMachinery: 46,
  operatingExpense: 48,
};

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function fillCapexTemplate(data) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const ws = wb.getWorksheet('Capex form');
  const reasonWs = wb.getWorksheet('Reason');

  const items = (Array.isArray(data.lineItems) ? data.lineItems : [])
    .filter((i) => i && i.description);
  if (items.length === 0) items.push({ description: '', usdAmount: 0 });

  const extra = Math.max(0, items.length - BASE_ITEM_ROWS);
  const offset = extra; // every fixed cell at/after ORIGINAL_TOTAL_ROW shifts down by this many rows

  if (extra > 0) {
    // Duplicate the last template item row (13) `extra` times, inserting
    // (not overwriting) so everything below shifts down and keeps its style.
    ws.duplicateRow(FIRST_ITEM_ROW + BASE_ITEM_ROWS - 1, extra, true);
  }

  const R = (row) => (row >= ORIGINAL_TOTAL_ROW ? row + offset : row);
  const itemRow = (i) => (i < BASE_ITEM_ROWS ? FIRST_ITEM_ROW + i : ORIGINAL_TOTAL_ROW + (i - BASE_ITEM_ROWS));
  const lastItemRow = FIRST_ITEM_ROW + BASE_ITEM_ROWS - 1 + offset; // 13 + offset
  const totalRow = R(ORIGINAL_TOTAL_ROW); // 14 + offset

  const usdRate = toNumber(data.usdRate, 336.39);
  ws.getCell('C1').value = usdRate;
  ws.getCell(`C${R(16)}`).value = `Ex.Rate @ ${usdRate}`;

  if (data.date) ws.getCell('J4').value = new Date(data.date);
  ws.getCell('K5').value = data.issuedBy || '';
  if (data.investNo) ws.getCell('K6').value = data.investNo;
  ws.getCell('B4').value = data.company || 'ELASTOMERIC ENGINEERING CO.LTD';
  ws.getCell('C9').value = data.object || '';

  // Line items: fill every row from FIRST_ITEM_ROW through lastItemRow.
  // Rows beyond the submitted items are cleared (blank).
  let usdTotal = 0;
  let lkrTotal = 0;
  const totalItemSlots = lastItemRow - FIRST_ITEM_ROW + 1;
  for (let i = 0; i < totalItemSlots; i++) {
    const row = itemRow(i);
    const item = items[i];
    const cDesc = ws.getCell(`C${row}`);
    const cUsd = ws.getCell(`H${row}`);
    const cLkr = ws.getCell(`J${row}`);

    if (item) {
      const usdAmt = toNumber(item.usdAmount, 0);
      const lkrAmt = usdRate * usdAmt;
      cDesc.value = item.description;
      cUsd.value = usdAmt;
      cLkr.value = { formula: `C1*H${row}`, result: lkrAmt };
      usdTotal += usdAmt;
      lkrTotal += lkrAmt;
    } else {
      cDesc.value = null;
      cUsd.value = null;
      cLkr.value = null;
    }
  }

  ws.getCell(`H${totalRow}`).value = { formula: `SUM(H8:H${lastItemRow})`, result: usdTotal };
  ws.getCell(`J${totalRow}`).value = { formula: `SUM(J8:J${lastItemRow})`, result: lkrTotal };

  // Reason checkboxes: clear all, then mark the selected one
  Object.values(REASON_CELLS).forEach(({ row, col }) => { ws.getCell(`${col}${R(row)}`).value = null; });
  if (data.reason && REASON_CELLS[data.reason]) {
    const { row, col } = REASON_CELLS[data.reason];
    ws.getCell(`${col}${R(row)}`).value = 'X';
  }

  // Timetable
  if (data.startYear) {
    ws.getCell(`D${R(31)}`).value = String(data.startYear);
  }
  if (data.startMonth) ws.getCell(`E${R(31)}`).value = data.startMonth;
  if (data.startYearDuration) {
    ws.getCell(`H${R(31)}`).value = String(data.startYearDuration);
  }
  if (data.completedYear) {
    ws.getCell(`D${R(33)}`).value = String(data.completedYear);
  }
  if (data.completedMonth) ws.getCell(`E${R(33)}`).value = data.completedMonth;
  if (data.completedYearDuration) {
    ws.getCell(`H${R(33)}`).value = String(data.completedYearDuration);
  }

  // Budget
  const totalBudgetAmount = toNumber(data.totalBudgetAmount, 0);
  const whereofApproved = toNumber(data.whereofApproved, 0);
  ws.getCell(`K${R(30)}`).value = totalBudgetAmount;
  ws.getCell(`K${R(32)}`).value = whereofApproved;
  ws.getCell(`K${R(34)}`).value = { formula: `J${totalRow}`, result: lkrTotal };
  ws.getCell(`K${R(36)}`).value = {
    formula: `K${R(30)}-K${R(32)}-K${R(34)}`,
    result: totalBudgetAmount - whereofApproved - lkrTotal,
  };

  // Capital requirement box (right side) - Appropriation always equals the request total
  ws.getCell(`J${R(40)}`).value = { formula: `J${totalRow}`, result: lkrTotal };
  ws.getCell(`J${R(42)}`).value = toNumber(data.disposalAmount, 0);
  ws.getCell(`J${R(44)}`).value = toNumber(data.changeOpCapital, 0);
  ws.getCell(`J${R(46)}`).value = { formula: `J${R(40)}`, result: lkrTotal };
  if (data.paybackYears) ws.getCell(`K${R(49)}`).value = toNumber(data.paybackYears, data.paybackYears);

  // Capital expenditures box (left side) - clear all category amounts, set chosen ones
  Object.values(CATEGORY_ROWS).forEach((row) => {
    const cell = ws.getCell(`E${R(row)}`);
    cell.value = null;
    cell.numFmt = CURRENCY_FMT;
  });
  const cats = Array.isArray(data.capexCategory) ? data.capexCategory : (data.capexCategory ? [data.capexCategory] : []);
  cats.forEach((cat) => {
    if (CATEGORY_ROWS[cat]) {
      ws.getCell(`E${R(CATEGORY_ROWS[cat])}`).value = { formula: `J${totalRow}`, result: lkrTotal };
    }
  });
  ws.getCell(`E${R(50)}`).value = {
    formula: `J${totalRow}`,
    result: lkrTotal,
  };

  // Place and date
  const placeText = data.place || '';
  const dateText = data.date ? new Date(data.date).toISOString().slice(0, 10) : '';
  ws.getCell(`C${R(53)}`).value = `Place and date: ${placeText}  ${dateText}`.trim();

  // Reason / description page
  if (data.reasonDescription) {
    const cell = reasonWs.getCell('B8');
    cell.value = data.reasonDescription;
    cell.alignment = { wrapText: true, vertical: 'top' };
    reasonWs.mergeCells('B8:I40');
  }

  return wb;
}

module.exports = { fillCapexTemplate, REASON_CELLS, CATEGORY_ROWS };
