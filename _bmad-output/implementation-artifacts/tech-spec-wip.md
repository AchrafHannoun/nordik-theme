# Tech Spec: Ensemble Radiant Heating Quiz

**slug:** `ensemble-quiz`  
**created:** 2026-03-16  
**status:** WIP — Step 4 implemented (pending QA validation)  
**stepsCompleted:** [1, 2, 3, 4]

---

## Overview

### Problem

Customers need to configure a complete radiant in-floor heating ensemble (PEX tubing, manifold, boiler, pump, accessories) from a complex multi-variable matrix. Currently this requires sales assistance or manual CSV lookup.

### Solution

A guided card-based quiz section on the storefront: user answers 8–12 visible questions (based on branching logic) referencing `Ensemble.csv` (5,219 rows × 18 filter columns + 109 SKU/QTY pairs). On completion, a "sandwich page" presents the matched full kit, captures email, POSTs to an n8n webhook (which creates a Shopify contact + sends a PDF recommendation email), and also provides a direct "Add all to cart" button.

### In Scope

- New Shopify section: `sections/ensemble-quiz.liquid`
- New JS asset: `assets/ensemble-quiz.js`
- New CSS asset: `assets/ensemble-quiz.css`
- Card-based step-by-step quiz UI (one question per "screen" in a single-page flow)
- CSV row matching from 18 filter dimensions
- Product kit result display (all matched SKUs with qty > 0)
- Sandwich page: email + name capture form
- n8n webhook POST with quiz answers + product list
- "Add all to cart" button (`/cart/add` POST API to avoid cart permalink issues)
- Shopify section schema with full UI customization settings
- Should be fully Bilangual (all texts should live in settings so we can translate them using Localize)

### Out of Scope

- Editing or modifying existing `csv-kit-builder` section
- Product images in result cards (SKU-only display; no product metafield lookup at this stage)
- n8n workflow implementation (Ash-side)
- PDF template design (Ash-side)

---

## CSV Structure

**File:** `Ensemble.csv` (at theme root, served via `window.Shopify.routes.root + 'Ensemble.csv'` or fetched from `/Ensemble.csv`)  
**Rows:** 5,219 data rows (excluding header)  
**Columns:** 18 filter/dimension columns + up to 109 SKU/QTY pairs

### 18 Filter Columns (0-indexed)

| #   | CSV Header                                 | Type        | Values                                                                             |
| --- | ------------------------------------------ | ----------- | ---------------------------------------------------------------------------------- |
| 0   | Bâtiment                                   | Dimension   | `Garage` (only value currently)                                                    |
| 1   | Les tuyaux sont-il déjà installé           | Binary      | `Oui`, `Non`                                                                       |
| 2   | (Si non) Isolation                         | Conditional | `Treillis métallique`, `Polystyrène avec système de retenue (style Isorad)`, `N/A` |
| 3   | (Si non)                                   | Conditional | `9 pouces`, `12 pouces`, `N/A`                                                     |
| 4   | (Si 9po) superficie                        | Conditional | 12 ranges (`1 - 200` … `2201 - 2400`), `N/A`                                       |
| 5   | (Si 12po) superficie                       | Conditional | 12 ranges (`1 - 250` … `2751 - 3000`), `N/A`                                       |
| 6   | (Si oui) nombre de circuits fait           | Conditional | `1`–`12`, `N/A`                                                                    |
| 7   | Energie de la Chaudière                    | Dimension   | `Électrique 240V`, `Électrique 600V`, `Gaz modèle Standard`, `Gaz modèle Combi`    |
| 8   | Savez vous quel chaudière avec vous besoin | Binary      | `Oui`, `Non`                                                                       |
| 9   | (Si oui et Électrique 240V)                | Conditional | 21 boiler models, `N/A`                                                            |
| 10  | (Si oui et Électrique 600V)                | Conditional | 7 boiler models, `N/A`                                                             |
| 11  | Si oui et Gaz Standard                     | Conditional | 4 Viessmann models, `N/A`                                                          |
| 12  | Si oui et Gaz Combi                        | Conditional | 2 Viessmann models, `N/A`                                                          |
| 13  | Si non et Électrique 240V                  | Conditional | 15 BTU ranges, `N/A`                                                               |
| 14  | Si non et Électrique 600V                  | Conditional | 7 BTU ranges, `N/A`                                                                |
| 15  | Si non et Gaz Standard                     | Conditional | 4 BTU ranges, `N/A`                                                                |
| 16  | Si non et Gaz Combi                        | Conditional | 2 BTU ranges, `N/A`                                                                |
| 17  | Fitting de cuivre                          | Dimension   | `Soudé`, `Press Fit`                                                               |

### Product Columns

Columns 18–237: alternating `SKU{n}` / `QTY{n}` pairs (up to 109 pairs).  
Matching rule: collect all SKUs where their corresponding QTY column has a non-empty, non-zero value.

> **One anomaly in header:** Column ~89 is literally named `VSM-B1HE-150` (a SKU) instead of `SKU35`, and column ~211 is `TACO-501` instead of `SKU106`. The matching JS must handle this by position (index), not by header name, for SKU/QTY pairs.

---

## Quiz Branching Logic (Decision Tree)

```
Q1: Bâtiment → [Garage] (card)
Q2: Pipes installed? → [Oui | Non] (card)

Branch A — Non (pipes not installed):
  Q3: Insulation type → [Treillis métallique | Polystyrène Isorad] (card)
  Q4: Pipe diameter → [9 pouces | 12 pouces] (card)
  Q5a (if 9"): Surface area → [1-200 | 201-400 | ... | 2201-2400] (card)
  Q5b (if 12"): Surface area → [1-250 | 251-500 | ... | 2751-3000] (card)
  → set cols 2,3,4 or 5; set col 6 = "N/A"

Branch B — Oui (pipes already installed):
  Q6: Number of circuits → [1|2|3|4|5|6|7|8|9|10|11|12] (card/number)
  → set col 6; set cols 2,3,4,5 = "N/A"

Q7: Boiler energy → [Élec 240V | Élec 600V | Gaz Standard | Gaz Combi] (card)
Q8: Know which boiler? → [Oui | Non] (card)

Branch C — Oui (know boiler):
  Q9: Select specific boiler (options vary by energy type, col 9/10/11/12)
  → set appropriate col; set cols 13-16 = "N/A"

Branch D — Non (don't know boiler — auto-select by BTU):
  Q10: BTU surface area range (options vary by energy type, col 13/14/15/16)
  → set appropriate col; set cols 9-12 = "N/A"

Q_final: Copper fittings → [Soudé | Press Fit] (card)
→ set col 17

→ MATCH: filter CSV rows where all 18 columns equal user answers
         (unanswered conditional columns match "N/A")
```

**Maximum visible questions:** 7 (Branch A + know boiler) or 6 (Branch B + know boiler)  
**Minimum visible questions:** 6 (Branch B + don't know boiler, simple energy path)

---

## Component Architecture

### `sections/ensemble-quiz.liquid`

- Follows `csv-kit-builder.liquid` pattern exactly
- `data-section-id="{{ section.id }}"` on root container
- All text labels passed as `data-*` attributes
- All visual tokens as CSS custom properties on root element
- SKU→variant ID map injected as `<script type="application/json" id="EnsembleQuizVariantMap-{{ section.id }}">` (same pattern as kit builder)
- Schema: all question labels, card options labels, n8n webhook URL, button text, heading/subheading, colors, padding, quiz background, card colors/border/hover
- `{{ 'ensemble-quiz.css' | asset_url | stylesheet_tag }}`
- `{{ 'ensemble-quiz.js' | asset_url | script_tag }}` (deferred)

### `assets/ensemble-quiz.js`

Key functions:

```
initializeEnsembleQuiz(container)
loadCsvData()                    → fetch + parse CSV, return rows as arrays
loadSkuVariantMap()              → parse JSON from <script> tag
renderStep(stepId, options)      → render a card-choice step
handleCardSelect(stepId, value)  → record answer, trigger next step
getNextStep(currentStep, answers) → branching logic
matchCsvRow(answers)             → filter rows by 18 dimensions
renderSandwichPage(matchedRow)   → show results + email form
handleEmailSubmit(e)             → POST to n8n webhook
buildCartUrl(products)           → /cart/add POST (not permalink)
addAllToCart(products)           → fetch POST to /cart/add.js
```

**CSV matching strategy:**

- Parse all 5,219 rows into memory on init (same as kit builder)
- Each row is an array of 237+ values
- Match row where `row[0] === answers.batiment`, `row[1] === answers.pipes`, etc.
- For unasked conditional branches, match where column value === "N/A"
- Expect exactly 1 matching row; if 0 or >1, show error state

**Product extraction from matched row:**

- Starting at column index 18, read pairs: `[sku_col, qty_col]` = `[18,19]`, `[20,21]`, ...
- Collect items where `qty !== "" && parseInt(qty) > 0`
- Look up `variantId` from the SKU→variant map

### `assets/ensemble-quiz.css`

- CSS custom properties: `--quiz-*` namespace (`--quiz-card-bg`, `--quiz-card-border`, `--quiz-card-hover-bg`, `--quiz-accent`, `--quiz-btn-bg`, etc.)
- `.ensemble-quiz`, `.quiz-step`, `.quiz-card`, `.quiz-card--selected`, `.quiz-card-grid`
- `.quiz-result`, `.quiz-result-item`, `.quiz-sandwich-page`, `.quiz-email-form`
- Responsive: 1 column mobile, 2-3 columns desktop for card grid
- Progress indicator (step N of M)

---

## Sandwich Page Flow

```
1. Quiz complete → match CSV row → build product list
2. Show "sandwich page" (same section, new view):
   - Headline: "Votre ensemble recommandé"
   - Product list: card per item (SKU + qty)
   - CTA A: email capture form (prénom, nom, courriel)
   - CTA B: "Ajouter tout au panier" button (also shown before/after form)

3. On email form submit:
   - POST to n8n webhook URL (from section settings):
     {
       email, firstName, lastName,
       answers: { batiment, pipes, insulation, ... },
       products: [{ sku, qty, variantId, title }],
       locale: document.documentElement.lang,
       shopUrl: window.Shopify.shop
     }
   - Show loading state
   - On success: replace form with success message ("Votre PDF a été envoyé!")
   - On error: show error message, keep form visible

4. "Ajouter tout au panier" button:
   - fetch POST to /cart/add.js with items array
   - On success: redirect to /cart (or open cart drawer if theme uses one)
```

> **n8n webhook POST:** n8n handles both Shopify customer creation (via Admin API) and PDF email generation/send. The webhook URL is configured in section settings → never hardcoded.

> **Security:** The n8n webhook POST is a fire-and-forget from the client. No auth token is sent from the storefront (n8n webhook should have its own auth if needed, configured server-side). No customer PII is stored in the theme code.

---

## Cart Implementation

Use `/cart/add.js` POST (AJAX) rather than the `/cart/{variantId}:{qty}` permalink format, to avoid the known Shopify limitation where permalink carts drop items from multi-variant kits over ~10 items.

```js
await fetch("/cart/add.js", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    items: products.map((p) => ({
      id: p.variantId,
      quantity: p.qty,
    })),
  }),
});

if (document.querySelector("cart-drawer")) {
  document.dispatchEvent(
    new CustomEvent("dispatch:cart-drawer:refresh", { bubbles: true }),
  );
  document.dispatchEvent(
    new CustomEvent("dispatch:cart-drawer:open", { bubbles: true }),
  );
} else {
  window.location.href = "/cart";
}
```

---

## Section Schema Settings (planned)

**Content:**

- `quiz_title` (text) — section heading
- `quiz_subtitle` (richtext) — sub-heading / intro
- `n8n_webhook_url` (url) — n8n webhook endpoint
- `result_heading` (text) — "Votre ensemble recommandé"
- `email_form_heading` (text)
- `email_success_message` (text)
- `add_to_cart_btn_text` (text)
- `send_pdf_btn_text` (text)

**Labels (for each quiz step):**

- `label_batiment`, `label_pipes_installed`, `label_insulation`, etc.
- Individual card labels for each answer option (to allow French customization)

**Design:**

- `card_bg_color` — card background
- `card_border_color`
- `card_hover_bg_color`
- `card_selected_bg_color`
- `accent_color` — progress bar, selected state highlight
- `btn_bg_color`, `btn_text_color`
- `section_padding_top`, `section_padding_bottom`

---

## Existing Patterns to Reuse

| Pattern                      | Source                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| CSV fetch + manual parse     | `assets/csv-kit-builder.js` `loadCsvData()`                             |
| SKU→variant JSON map         | `sections/csv-kit-builder.liquid` `<script type="application/json">`    |
| CSS custom property tokens   | `assets/csv-kit-builder.css` (adapt `--kit-*` → `--quiz-*`)             |
| Result view HTML structure   | `assets/csv-kit-builder.js` `renderResultsView()`                       |
| `/cart/add.js` + drawer flow | `assets/product-form.js` + `assets/cart-drawer.js` + `assets/custom.js` |
| Section schema structure     | `sections/csv-kit-builder.liquid` schema                                |

---

## Step 2 Findings (Validated in Theme)

### 1) Cart drawer integration is available and should be event-driven

The theme already exposes a stable cart drawer event API:

- `dispatch:cart-drawer:open`
- `dispatch:cart-drawer:refresh`
- `dispatch:cart-drawer:close`

Validated in:

- `assets/cart-drawer.js` (listeners for these events)
- `assets/custom.js` (official event documentation in-code)

Implementation decision for this section:

1. Add all items via `/cart/add.js` (single payload with `items: [{ id, quantity }]`)
2. Dispatch `dispatch:cart-drawer:refresh`
3. Dispatch `dispatch:cart-drawer:open`
4. Fallback to `window.location.href = '/cart'` if no `cart-drawer` element exists

### 2) Preferred add-to-cart implementation pattern

The robust add-to-cart flow in this theme is in `assets/product-form.js`:

- uses AJAX add
- updates sections/cart bubble
- opens drawer only when configured and available

For the quiz section, reuse the same philosophy but with multi-item payload:

```js
await fetch("/cart/add.js", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ items }),
});

if (document.querySelector("cart-drawer")) {
  document.dispatchEvent(
    new CustomEvent("dispatch:cart-drawer:refresh", { bubbles: true }),
  );
  document.dispatchEvent(
    new CustomEvent("dispatch:cart-drawer:open", { bubbles: true }),
  );
} else {
  window.location.href = "/cart";
}
```

### 3) SKU→variant map approach is confirmed and reusable

Best source pattern remains:

- `sections/csv-kit-builder.liquid` script id `kit-builder-sku-variant-map-{{ section.id }}`

The map structure already includes:

- `variantId`
- `title`
- `productUrl`
- `imageUrl`

Decision:

- Keep this exact Liquid-generated JSON pattern in `sections/ensemble-quiz.liquid`
- Parse from a section-scoped script id in JS

### 4) n8n webhook + CORS reality check

No existing webhook integration pattern was found in theme assets/sections, so this remains new.

Practical requirement (to be validated in dev): n8n webhook endpoint must return CORS headers allowing storefront origin, at minimum:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

If webhook does not allow browser CORS, fallback option is a Shopify app proxy endpoint.

---

## Open Questions / Risks

| #   | Question                                                                                                                                                                                             | Status                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | The header row has two hardcoded SKU names instead of generic column names (`VSM-B1HE-150` at ~col 89, `TACO-501` at ~col 211). Will extraction by positional index (not header name) work reliably? | Assumed yes — confirm with test                                          |
| 2   | n8n webhook URL format — will it need CORS headers? n8n webhooks typically allow cross-origin POST.                                                                                                  | Partially resolved: CORS headers required; validate in dev               |
| 3   | Cart drawer vs /cart redirect — does the theme have a cart drawer?                                                                                                                                   | Resolved: yes, use `dispatch:cart-drawer:*` events with `/cart` fallback |
| 4   | The "Bâtiment" column only has "Garage" — should the quiz ask this question or skip it?                                                                                                              | Recommend: ask (for future extensibility), but hide if only 1 option     |
| 5   | Product title display — the result cards will only have SKU codes. Should variant titles from the SKU→variant map be shown?                                                                          | Resolved: show `title` from SKU map, fallback to SKU                     |

---

## Files to Create

| File                                | Notes                             |
| ----------------------------------- | --------------------------------- |
| `sections/ensemble-quiz.liquid`     | New section                       |
| `assets/ensemble-quiz.js`           | New JS                            |
| `assets/ensemble-quiz.css`          | New CSS                           |
| `templates/page.ensemble-quiz.json` | Optional: dedicated page template |

---

## Step 3 Implementation Plan (File-by-File)

### A) `sections/ensemble-quiz.liquid`

Implement:

1. Root container with:

- `data-section-id`
- quiz labels/settings via `data-*`
- n8n webhook URL setting via `data-n8n-webhook-url`

2. Include assets:

- `ensemble-quiz.css`
- `ensemble-quiz.js` (defer)

3. Add JSON script map:

- id: `ensemble-quiz-sku-variant-map-{{ section.id }}`
- content: SKU -> { variantId, title, productUrl, imageUrl }

4. Schema blocks/settings:

- Content texts (all visible labels/buttons/messages)
- Colors/spacing/typography controls
- Webhook URL
- Toggle: `show_building_question_when_single_option`

Implementation notes:

- Keep all visible copy in settings for bilingual/localize workflow.
- Use collection fallback pattern from existing kit builder (`selected collection` then `all`).

### B) `assets/ensemble-quiz.css`

Implement:

1. Tokenized custom properties (`--quiz-*`) on root.
2. Step/card layout:

- mobile-first grid
- selected/hover/focus states
- accessible focus ring

3. Sandwich page styles:

- product list block
- email form block
- CTA row (send PDF + add all to cart)

4. Status states:

- loading
- success
- error

### C) `assets/ensemble-quiz.js`

Implement core modules in this order:

1. Bootstrapping

- `initializeEnsembleQuiz(container)`
- guard against double-init

2. Data loaders

- `loadCsvData()` (quoted CSV-safe parser)
- `loadSkuVariantMap()` from section JSON script

3. Question model + branching

- explicit config object mapping step IDs to CSV column indexes
- branch rules for Oui/Non and energy type

4. Matching engine

- build normalized answer vector for 18 columns
- match exact row (with `N/A` for non-applicable branches)
- error path for 0 or >1 match

5. Product extraction

- iterate SKU/QTY pairs by position from index 18 onward
- quantity > 0 filter
- variant map enrichment (`title`, `imageUrl`)

6. Sandwich page actions

- `handleEmailSubmit()` POST webhook
- `addAllToCart()` POST `/cart/add.js`
- cart drawer events (`refresh` then `open`) fallback `/cart`

7. UX polish

- progress indicator
- next/back controls
- disable submit while request in-flight

### D) `templates/page.ensemble-quiz.json` (optional)

Implement if Ash wants a dedicated landing page template immediately:

1. Single section reference to `ensemble-quiz`
2. Minimal surrounding sections for performance

---

## Acceptance Criteria (Implementation-Ready)

### Functional

1. Quiz renders and completes all branches without JS errors.
2. Each answer path maps to exactly one CSV row for valid combinations.
3. Result view lists all SKU/QTY items with qty > 0.
4. Add-all-to-cart sends one `/cart/add.js` request with all items.
5. If drawer exists, it refreshes and opens after add.
6. If drawer does not exist, user is redirected to `/cart`.
7. Email form POSTs payload to configured n8n webhook URL.
8. Success and error messages appear correctly after webhook response.

### Data Integrity

1. CSV extraction is index-based, not dependent on broken SKU headers.
2. Missing SKU map entries do not crash flow; item is skipped or shown as unresolved.
3. Quantity parsing is safe (`""`, `0`, non-numeric handled).

### UX

1. Card interactions are keyboard accessible.
2. Focus styles are visible and consistent.
3. Mobile layout remains readable and tappable.
4. All labels/buttons/messages are customizable via section settings.

---

## QA Matrix (Step 4 Input)

1. Branch A: Non + 9po + known boiler + Soudé
2. Branch A: Non + 12po + unknown boiler + Press Fit
3. Branch B: Oui + circuits=1 + known boiler + Soudé
4. Branch B: Oui + circuits=12 + unknown boiler + Press Fit
5. All energy types (240V, 600V, Gaz Standard, Gaz Combi)
6. Drawer enabled vs drawer disabled theme setting
7. Webhook success (200) vs webhook CORS failure vs 500

---

## Definition of Done for Build Start

1. Spec steps 1-3 approved.
2. n8n webhook endpoint URL and expected payload acknowledged.
3. Collection source for SKU mapping confirmed.
4. Build can start in this order:

- `sections/ensemble-quiz.liquid`
- `assets/ensemble-quiz.css`
- `assets/ensemble-quiz.js`
- optional `templates/page.ensemble-quiz.json`

_Step 4 should execute implementation + validation against the QA matrix above._
