# PayLite

A small wallet app (send money, request money, transaction history and a JSON API) used as the app under test for [SentinelQA](https://github.com/Krishna-10-7/build). It has no dependencies; Node 20 or later runs it as is.

```bash
npm start            # http://localhost:4300, PORT and HOST are honoured
```

| Page | What it does |
|---|---|
| `/` | Wallet balance and the last transfer |
| `/send` | Recipient, amount and note; **Send money** (`POST /api/transfers`) or **Request money** (`POST /api/requests`) |
| `/history` | Every transfer and request, newest first |

Every wallet starts at ₹10,000 and lives in a cookie session, so each browser gets a fresh one.

## The ticket: PAY-7

SentinelQA keeps a ticket's acceptance criteria in its own ticket desk, not in this repository, so nothing pushed here can change what gets checked. This is the text to enter at the desk (key `PAY-7`, title *Send money from the wallet*):

```text
AC-1: Given the user is on "/send", when they set "Recipient" to "Ravi Kumar", set "Amount" to "500" and click "Send money", then the "wallet balance" shows "₹9,500".
AC-2: Given the user is on "/send", when they set "Recipient" to "Meera Iyer", set "Amount" to "250" and click "Send money", then the "transfer status" contains "Sent ₹250 to Meera Iyer".
AC-3: Given the user is on "/send", when they set "Recipient" to "Ravi Kumar", set "Amount" to "1200", click "Send money" and open "/history", then the "transaction history" contains "Ravi Kumar".
```

[`sentinelqa.json`](sentinelqa.json) names PAY-7 as this repository's ticket and how to build it. Branch names start with the ticket key too, so a push to any of them checks PAY-7.

## Release branches

Each branch is one realistic change on top of `main`. Some only change markup; some ship a bug that a test-fixer would hide by rewriting the test.

| Branch | What changed | Kind | SentinelQA check |
|---|---|---|---|
| `main` | The accepted build | known good | success, 3/3 (the first run records the baseline) |
| `PAY-7-new-design` | Design system v2: test ids and element ids renamed, new wallet pill, bigger buttons | markup only | success, 3/3, locators healed |
| `PAY-7-hold-and-settle` | Transfers now hold the amount, then settle it, and both steps debit the wallet: ₹500 costs ₹1,000 | bug | failure: regression on AC-1 |
| `PAY-7-quick-actions` | Quick-actions row: test ids renamed, and the **Send money** label now sits on the button that requests money | bug | failure: the look-alike button is refused because it calls `/api/requests`, not `/api/transfers` |
| `PAY-7-rebrand` | Copy rewrite: "Recipient" becomes "Pay to", "Send money" becomes "Pay now", History becomes Activity | markup only | action required: repairs this different need a person to approve them |
