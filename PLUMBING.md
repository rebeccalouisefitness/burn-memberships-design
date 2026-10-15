# BURN website: design vs plumbing

The sign-up flow is real: Join form -> server creates the app account -> Stripe
payment page -> thank-you page. The same email and password then work in the app.

Design can change freely. Plumbing needs a developer.

## DESIGN (safe to edit)

- Every HTML page in `v6/` (text, layout, images, sections, order).
- `v6/assets/site.css` and any styles.
- `v6/img/` images.
- Copy on join, thank-you and download pages.

## PLUMBING (don't edit without a developer)

| What | Where | Why |
|---|---|---|
| `v6/js/burn-checkout.js` | website | Sends the join form to the server and opens Stripe. Fills the thank-you page. |
| `v6/js/burn-config.js` | website | On/off switch: `off` (demo, the public preview), `test`, `live`. Points at the server. |
| The two `<script>` lines for those files | `join.html`, `thank-you.html` | Must stay, and before `assets/site.js`. |
| `data-tier`, `data-billing`, `data-checkout`, `data-chooser`, `data-bill` | buttons and toggles | Tell the checkout which plan was picked. Tier values: `burn`, `burnplus`, `burncomplete`. Billing: `monthly`, `annual`. |
| `data-checkout-form` and the field names `name`, `email`, `password` | `join.html` | The server reads exactly these. |
| `data-pay-submit`, `data-wallet`, `data-form-err` | `join.html` | Pay buttons and the error line. |
| `data-mock-payment` | `join.html` | Demo card fields, hidden automatically when real checkout is on. |
| `data-live-only` (keep `hidden` on it) | `join.html` | Shown only when real checkout is on. |
| `data-ty-email`, `data-ty-first`, `data-ty-tier`, `data-ty-status`, `data-dl-link` | `thank-you.html` | Filled in from the real payment. |
| Edge functions `web-checkout`, `stripe-webhook-web`, `_shared/web-billing.ts`, `revenuecat-webhook/tier.ts` | app repo `burn-mega-app` | Create the account, take payment, unlock the tier. |

| `v6/upgrade.html` + `v6/js/burn-upgrade.js` (`/upgrade?t=…`) | website | In-app upgrade confirm sheet for members who joined on the website. Opened only by the app with a 10-minute signed link. Shows the real "pay the difference" amount and charges the card on file by changing the same Stripe subscription. Keep every `data-up-*` attribute. |
| `v6/upgrade-done.html` (`/upgrade-done`) | website | Where Stripe's billing page returns after "Manage / Cancel"; sends her back to the app (`burn://membership`). |
| Functions `/api/membership/*` (`membership.mts`, `lib/membership.ts`) | `burn-mega-app` `web-netlify/` | status, upgrade-session, preview, upgrade, portal. |

Moving, restyling or rewording any of these elements is fine. Removing or
renaming the attributes is what breaks it.

## Switching it on

`v6/js/burn-config.js` stays `mode: 'off'` in this repo (public preview = demo,
nothing charged). Test runs use a local copy with `mode: 'test'`. Go-live sets
`mode: 'live'` and the live functions URL, on the real domain only.
