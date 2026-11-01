export const OPENING_BALANCE = 10000;

export const CONTACTS = ['Ravi Kumar', 'Meera Iyer', 'Arjun Mehta', 'Sana Shaikh'];

const sessions = new Map();
let nextTransferId = 5001;

export function session(sid) {
  let s = sessions.get(sid);
  if (!s) {
    s = { balance: OPENING_BALANCE, transfers: [], requests: [] };
    sessions.set(sid, s);
  }
  return s;
}

/** Checks a send or request form. Returns an error message, or null when it is fine. */
export function validate(to, amount) {
  if (!to) return 'Enter who the money is for';
  if (!Number.isInteger(amount) || amount < 1) return 'Enter an amount in whole rupees';
  if (amount > 100000) return 'You can send up to ₹1,00,000 at a time';
  return null;
}

/** Reserves the amount so two transfers in flight cannot spend the same money. */
function hold(s, amount) {
  if (amount > s.balance) throw Object.assign(new Error('Not enough balance'), { status: 422 });
  s.balance -= amount;
  return { amount };
}

/** Completes a held transfer and records it. */
function settle(s, h, to, note) {
  s.balance -= h.amount;
  const transfer = { id: nextTransferId++, to, amount: h.amount, note, at: new Date().toISOString() };
  s.transfers.unshift(transfer);
  return transfer;
}

export function sendMoney(sid, to, amount, note) {
  const s = session(sid);
  return settle(s, hold(s, amount), to, note);
}

export function requestMoney(sid, from, amount, note) {
  const request = { id: nextTransferId++, from, amount, note, at: new Date().toISOString() };
  session(sid).requests.unshift(request);
  return request;
}

export function rupees(n) {
  return '₹' + n.toLocaleString('en-IN');
}
