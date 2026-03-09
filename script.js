/**
 * Currency Converter – script.js
 *
 * Uses the Frankfurter API (https://www.frankfurter.app/) which is free,
 * open-source, and requires no API key.
 *
 * API reference:
 *   GET https://api.frankfurter.app/currencies   → list of supported currencies
 *   GET https://api.frankfurter.app/latest?from=USD&to=EUR&amount=1  → convert
 */

const BASE_URL = 'https://api.frankfurter.app';

// Default currency pair shown on load
const DEFAULT_FROM = 'USD';
const DEFAULT_TO   = 'EUR';

// ── DOM refs ──────────────────────────────────────────────────────────────
const amountInput    = document.getElementById('amount');
const fromSelect     = document.getElementById('from-currency');
const toSelect       = document.getElementById('to-currency');
const swapBtn        = document.getElementById('swap-btn');
const convertBtn     = document.getElementById('convert-btn');
const resultEl       = document.getElementById('result');
const rateInfoEl     = document.getElementById('rate-info');
const errorEl        = document.getElementById('error');
const loadingEl      = document.getElementById('loading');
const updatedNoteEl  = document.getElementById('updated-note');

// ── Helpers ───────────────────────────────────────────────────────────────

function showLoading() {
  loadingEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
  rateInfoEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

function hideLoading() {
  loadingEl.classList.add('hidden');
}

function showError(message) {
  hideLoading();
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function showResult(converted, from, to, rate, amount, date) {
  hideLoading();
  errorEl.classList.add('hidden');

  const fmt = (n, cur) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(n);

  resultEl.textContent = `${fmt(amount, from)} = ${fmt(converted, to)}`;
  resultEl.classList.remove('hidden');

  rateInfoEl.textContent = `1 ${from} = ${rate} ${to}`;
  rateInfoEl.classList.remove('hidden');

  if (date) {
    updatedNoteEl.textContent = `Rates as of ${date}`;
  }
}

// ── Populate currency dropdowns ───────────────────────────────────────────

async function loadCurrencies() {
  showLoading();
  try {
    const res = await fetch(`${BASE_URL}/currencies`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const currencies = await res.json();

    // currencies is an object: { "USD": "US Dollar", "EUR": "Euro", … }
    const entries = Object.entries(currencies).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    entries.forEach(([code, name]) => {
      const optFrom = new Option(`${code} – ${name}`, code);
      const optTo   = new Option(`${code} – ${name}`, code);
      fromSelect.add(optFrom);
      toSelect.add(optTo);
    });

    fromSelect.value = DEFAULT_FROM;
    toSelect.value   = DEFAULT_TO;

    hideLoading();
    // Perform an initial conversion on load
    await convert();
  } catch (err) {
    showError('Could not load currency list. Please check your connection and refresh.');
    console.error('loadCurrencies:', err);
  }
}

// ── Conversion ────────────────────────────────────────────────────────────

async function convert() {
  const amount = parseFloat(amountInput.value);
  const from   = fromSelect.value;
  const to     = toSelect.value;

  if (!from || !to) return;

  if (isNaN(amount) || amount <= 0) {
    showError('Please enter a valid positive number.');
    return;
  }

  // Same currency → no API call needed
  if (from === to) {
    showResult(amount, from, to, 1, amount, null);
    updatedNoteEl.textContent = '';
    return;
  }

  showLoading();
  try {
    const url = `${BASE_URL}/latest?amount=${amount}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // data.rates is e.g. { "EUR": 0.92 }
    const converted = data.rates[to];
    if (converted === undefined) throw new Error('Unexpected API response');

    // Derive per-unit rate
    const rate = parseFloat((converted / amount).toPrecision(6));

    showResult(converted, from, to, rate, amount, data.date);
  } catch (err) {
    showError('Conversion failed. Please try again later.');
    console.error('convert:', err);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────

convertBtn.addEventListener('click', convert);

amountInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') convert();
});

swapBtn.addEventListener('click', () => {
  const tmp        = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value   = tmp;
  convert();
});

// Re-run conversion when either dropdown changes
fromSelect.addEventListener('change', convert);
toSelect.addEventListener('change', convert);

// ── Init ──────────────────────────────────────────────────────────────────

loadCurrencies();
