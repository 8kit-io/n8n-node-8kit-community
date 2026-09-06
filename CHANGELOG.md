# Changelog

## 1.1.0

### The node and credential use the 8 mark

- Both icons were the full wordmark on a 2.12:1 canvas, in a red-pink colourway used
  nowhere else in the brand. n8n renders icons in a square slot, so it squashed to an
  unreadable smear. They are now the 8 on its own, square, in the brand accent, taken
  from the mark the website uses.
- Separate light and dark files, which n8n's icon rule requires. The light variant is
  the design system's `--accent-ink` (#B16811) because the plain accent is too faint
  on n8n's white canvas.
- Also declares `usableAsTool`, uses `NodeConnectionTypes.Main` instead of the string
  literal, and sets `peerDependencies.n8n-workflow` to `*` — three more rules the
  verification lint enforces.

### Published with npm provenance

- n8n rejected verification of 1.0.18 because it carried no npm provenance statement,
  which every verified community node has had to have since 1 May 2026. The release
  workflow now publishes with `--provenance` and the `id-token: write` permission the
  attestation is signed with. The next published version carries it; 1.0.18 cannot be
  fixed in place, only superseded.

### Writes are no longer replayed after an uncertain failure

- A POST is only retried when the server plainly never applied it: it refused the
  request outright (429), or the connection never arrived. Before, a timeout or a 502
  that hid a successful write was retried, the retry came back 409 `DUPLICATE_VALUE`,
  and Add to Uniq routed it to the **Duplicate** output. A value nobody had processed
  looked like one that already had, which is the exact mistake the Uniq collection is
  there to prevent. Reads and idempotent writes retry as before.

### A failed item keeps its own data

- With "continue on fail", Check Uniq, Check Lock and Release Lock replaced the item
  with a bare `error` object, so the workflow could not tell which record had failed
  or route it for repair. The item's input now comes through alongside the `error`
  field, which is what the success paths in the same files already did.

### Add to Uniq branches instead of failing

- "Add" on Uniq values now has two outputs, **Added** and **Duplicate**. A value that is
  already in the collection goes to the Duplicate output with the existing record; the
  workflow no longer stops with an error.
- Server-side errors (4xx/5xx) are reported with the 8kit error code and message. They
  used to surface as "Network error: Your request is invalid…" because n8n keeps the
  response body on `error.context.data`, not on the axios error.
- Node version 3. Workflows saved with the previous node (version 2) keep the old
  single-output Add that fails on duplicates; new nodes get the two outputs.
- "Continue on fail" now also covers the node's own validation (empty value, value too
  long, invalid metadata); the failed item goes to the second output with an `error`
  field. Error items never land on the Added / Yes output.
- Metadata is checked locally: it must be a JSON object.
- Lookup Values → Remove has a "Remove By" option: by value id (default), or by left or
  right value, which removes every matching row.
- App → Info / Health explain "check the Host URL" when the credential points at
  something that is not an 8kit server.
- Custom date formats no longer produce "24:30" at midnight (`hourCycle: h23`).

## 1.0.18

### 🏪 Marketplace Compliance

Major quality and compliance update preparing for the n8n community marketplace.

- Grouped optional fields into "Additional Fields" collections for cleaner UX
- Switched HTTP client to n8n's built-in `httpRequestWithAuthentication` for secure credential handling
- Replaced raw `throw new Error` with n8n `NodeOperationError` for better error reporting in the UI
- Removed all console.log/error calls from production code
- Added `peerDependencies` for `n8n-workflow`
- Replaced `setTimeout` with n8n `sleep` utility

### 🧪 Testing

- 160 unit tests covering all 22 operations
- 38 end-to-end tests against a real backend
- 5 compliance tests for marketplace requirements

## 1.0.17

### 🕒 Last Update Date

Support for specifying a default fallback date in the Get Last Updated node configuration.

## 1.0.16

### 🕒 Timezone & Update Handling

Improved timezone handling when retrieving the Last Update value, ensuring consistent timestamps across different regions.

Updated the Last Update Date input field with a clearer and more intuitive interface for easier configuration.

### 💻 User Experience & Data Input

Enhanced the locking experience to make timeouts more intuitive and prevent confusion when locks expire.

All input values within 8kit nodes are now automatically trimmed, improving data consistency and preventing accidental whitespace errors.

### ⚙️ Error Handling & Defaults

Standardised error responses from 8kit nodes to return structured objects including status, message, and code.


Changed default values in N8N nodes to ensure smoother setup and more predictable behaviour out of the box.