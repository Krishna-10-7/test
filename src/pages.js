import { CONTACTS, rupees } from './store.js';

const STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #14212b; background: #f3f6f8; }
  a { color: inherit; }
  .site-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 14px 28px; background: #0f3d4a; color: #fff; }
  .logo { font-weight: 700; text-decoration: none; font-size: 18px; letter-spacing: .02em; }
  .site-nav { display: flex; gap: 18px; align-items: center; }
  .site-nav a { text-decoration: none; opacity: .85; }
  .site-nav a:hover { opacity: 1; }
  .balance { padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,.12); font-size: 14px; }
  .balance strong { font-variant-numeric: tabular-nums; }
  .page { max-width: 760px; margin: 32px auto; padding: 0 20px; }
  .card { background: #fff; border: 1px solid #dce4e8; border-radius: 12px; padding: 24px; }
  .hero { display: grid; gap: 6px; }
  .hero .amount { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .muted { color: #5b6b75; }
  .field { display: grid; gap: 4px; margin: 14px 0; max-width: 340px; }
  input { font: inherit; padding: 9px 11px; border: 1px solid #c3cfd6; border-radius: 8px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
  .btn { font: inherit; padding: 9px 18px; border-radius: 8px; border: 1px solid #c3cfd6; background: #fff; cursor: pointer; text-decoration: none; display: inline-block; }
  .btn-primary { background: #13806b; border-color: #13806b; color: #fff; }
  .status { min-height: 24px; font-weight: 600; }
  .tx-list { list-style: none; padding: 0; margin: 0; }
  .tx { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e6ecef; }
  .tx .amt { font-variant-numeric: tabular-nums; font-weight: 600; }
  .tx .out { color: #b4372a; }
  .tx .in { color: #13806b; }
`;

function layout(title, ctx, body, script = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · PayLite</title>
<style>${STYLE}</style>
</head>
<body>
<header class="site-header">
  <a href="/" class="logo">PayLite</a>
  <nav class="site-nav" aria-label="Main">
    <a href="/send">Send</a>
    <a href="/history">History</a>
    <span class="balance">Balance <strong data-testid="wallet-balance">${rupees(ctx.balance)}</strong></span>
  </nav>
</header>
<main class="page">
${body}
</main>
<script>
const track = (event) => fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, path: location.pathname }) }).catch(() => {});
track('view');
${script}
</script>
</body>
</html>`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function homePage(s, ctx) {
  const last = s.transfers[0];
  const body = `<section class="card hero" aria-labelledby="wallet-title">
  <h1 id="wallet-title" class="muted" style="font-size:15px;margin:0">Wallet balance</h1>
  <p class="amount">${rupees(ctx.balance)}</p>
  <p class="muted">${last ? `Last sent ${rupees(last.amount)} to ${esc(last.to)}` : 'No transfers yet'}</p>
  <div class="actions">
    <a class="btn btn-primary" href="/send">Send money</a>
    <a class="btn" href="/history">See history</a>
  </div>
</section>`;
  return layout('Wallet', ctx, body);
}

export function sendPage(ctx) {
  const body = `<section class="card" aria-labelledby="send-title">
  <h1 id="send-title">Send money</h1>
  <form class="send-form" novalidate>
    <div class="field">
      <label for="to">Recipient</label>
      <input id="to" name="to" list="contacts" autocomplete="off" placeholder="Name or UPI ID">
      <datalist id="contacts">${CONTACTS.map((c) => `<option value="${c}">`).join('')}</datalist>
    </div>
    <div class="field">
      <label for="amount">Amount</label>
      <input id="amount" name="amount" type="number" min="1" step="1" placeholder="₹0">
    </div>
    <div class="field">
      <label for="note">Note</label>
      <input id="note" name="note" placeholder="What is it for?">
    </div>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-testid="action-1">Send money</button>
      <button class="btn" type="submit" data-testid="action-2">Request money</button>
    </div>
  </form>
  <p class="status" role="status" id="transfer-msg"></p>
</section>`;
  const script = `
const form = document.querySelector('.send-form');
const out = document.getElementById('transfer-msg');
const rupees = (n) => '₹' + n.toLocaleString('en-IN');
const post = (url, data) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
function fields() {
  const data = Object.fromEntries(new FormData(form));
  return { to: String(data.to || '').trim(), amount: Number(data.amount), note: data.note };
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  track('click:send');
  const data = fields();
  const res = await post('/api/transfers', data);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return (out.textContent = body.error || 'Something went wrong');
  document.querySelector('[data-testid="wallet-balance"]').textContent = rupees(body.balance);
  out.textContent = 'Sent ' + rupees(body.transfer.amount) + ' to ' + body.transfer.to;
  form.reset();
});
document.querySelector('[data-testid="action-1"]').addEventListener('click', async () => {
  track('click:request');
  const data = fields();
  const res = await post('/api/requests', data);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return (out.textContent = body.error || 'Something went wrong');
  out.textContent = 'Requested ' + rupees(body.request.amount) + ' from ' + body.request.from;
  form.reset();
});`;
  return layout('Send money', ctx, body, script);
}

export function historyPage(transfers, requests, ctx) {
  const rows = [
    ...transfers.map((t) => ({ at: t.at, who: `To ${esc(t.to)}`, amount: `<span class="amt out">−${rupees(t.amount)}</span>` })),
    ...requests.map((r) => ({ at: r.at, who: `Requested from ${esc(r.from)}`, amount: `<span class="amt in">${rupees(r.amount)}</span>` })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const items = rows.map((r) => `<li class="tx"><span>${r.who}</span>${r.amount}</li>`).join('\n');
  const body = `<section class="card" aria-labelledby="history-title">
  <h1 id="history-title">History</h1>
  ${rows.length ? `<ol class="tx-list" id="history" aria-label="Transaction history">\n${items}\n</ol>` : '<p class="muted">No transactions yet</p>'}
</section>`;
  return layout('History', ctx, body);
}

export function notFoundPage(ctx) {
  return layout('Not found', ctx, '<h1>Page not found</h1>');
}
