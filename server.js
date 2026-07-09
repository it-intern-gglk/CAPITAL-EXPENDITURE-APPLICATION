const path = require('path');
const fs = require('fs');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { fillCapexTemplate } = require('./lib/fillTemplate');

const app = express();
const PORT = process.env.PORT || 3005;
const GENERATED_DIR = path.join(__dirname, 'generated');

if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Submit the form -> generate the exact filled Excel file, save it, return a download link.
// Anyone with access to /requests.html can find and download it later too - the filler
// and the downloader don't have to be the same person or even have talked to each other.
app.post('/api/submit', async (req, res) => {
  try {
    const data = req.body;

    if (!data.object || !Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      return res.status(400).json({ error: 'Object description and at least one line item are required.' });
    }

    const wb = await fillCapexTemplate(data);

    const id = uuidv4();
    const safeName = (data.object || 'capex-request').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
    const filename = `${safeName}_${id.slice(0, 8)}.xlsx`;
    const filepath = path.join(GENERATED_DIR, filename);

    await wb.xlsx.writeFile(filepath);

    const usdTotal = (data.lineItems || []).reduce((s, i) => s + (Number(i.usdAmount) || 0), 0);
    const lkrTotal = (data.lineItems || []).reduce((s, i) => s + (Number(i.lkrAmount) || 0), 0);
    const usdRate = Number(data.usdRate) || 0;

    const meta = {
      filename,
      object: data.object,
      issuedBy: data.issuedBy || '',
      place: data.place || '',
      date: data.date || '',
      usdTotal,
      lkrTotal,
      createdAt: new Date().toISOString(),
    };
    // id.json lets /api/download/:id and /api/requests find the file later without a database
    fs.writeFileSync(path.join(GENERATED_DIR, `${id}.json`), JSON.stringify(meta));

    res.json({ id, downloadUrl: `/api/download/${id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate the Excel file.' });
  }
});

// List every submitted request (for someone other than the filler to browse & download)
app.get('/api/requests', (req, res) => {
  const files = fs.readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json'));
  const requests = files.map((f) => {
    const id = f.replace(/\.json$/, '');
    const meta = JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, f), 'utf8'));
    return { id, ...meta };
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(requests);
});

// Download (works any time after submission, not just immediately)
app.get('/api/download/:id', (req, res) => {
  const metaPath = path.join(GENERATED_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).send('File not found.');

  const { filename } = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const filepath = path.join(GENERATED_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).send('File not found.');

  res.download(filepath, filename);
});

app.listen(PORT, () => {
  console.log(`Capex form system running at http://localhost:${PORT}`);
});
