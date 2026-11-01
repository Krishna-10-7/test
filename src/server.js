import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import * as pages from './pages.js';

const PORT = Number(process.env.PORT ?? 4300);
const HOST = process.env.HOST;

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), 'application/json');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let sid = cookies(req).pl_sid;
  if (!sid) {
    sid = randomUUID();
    res.setHeader('set-cookie', `pl_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  }
  const s = store.session(sid);
  const ctx = { balance: s.balance };
  const method = req.method ?? 'GET';
  const path = url.pathname;

  try {
    if (method === 'GET' && path === '/') return send(res, 200, pages.homePage(s, ctx));
    if (method === 'GET' && path === '/send') return send(res, 200, pages.sendPage(ctx));
    if (method === 'GET' && path === '/history') return send(res, 200, pages.historyPage(s.transfers, s.requests, ctx));
    if (method === 'GET' && path === '/healthz') return json(res, 200, { ok: true });

    if (method === 'GET' && path === '/api/wallet') return json(res, 200, { balance: s.balance, transfers: s.transfers.length });
    if (method === 'POST' && path === '/api/transfers') {
      const body = await readJson(req);
      const to = String(body.to ?? '').trim();
      const amount = Number(body.amount);
      const problem = store.validate(to, amount);
      if (problem) return json(res, 422, { error: problem });
      const transfer = store.sendMoney(sid, to, amount, String(body.note ?? '').trim());
      return json(res, 201, { transfer, balance: s.balance });
    }
    if (method === 'POST' && path === '/api/requests') {
      const body = await readJson(req);
      const from = String(body.to ?? '').trim();
      const amount = Number(body.amount);
      const problem = store.validate(from, amount);
      if (problem) return json(res, 422, { error: problem });
      return json(res, 201, { request: store.requestMoney(sid, from, amount, String(body.note ?? '').trim()) });
    }
    if (method === 'POST' && path === '/api/analytics') {
      await readJson(req);
      res.writeHead(204).end();
      return;
    }
    send(res, 404, pages.notFoundPage(ctx));
  } catch (err) {
    if (err.status) return json(res, err.status, { error: err.message });
    console.error(err);
    json(res, 500, { error: 'Internal error' });
  }
});

server.listen(PORT, HOST, () => console.log(`PayLite on http://${HOST ?? 'localhost'}:${PORT}`));
