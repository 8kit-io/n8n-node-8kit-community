# Changelog

## Unreleased

### Add to Uniq branches instead of failing

- "Add" on Uniq values now has two outputs, **Added** and **Duplicate**. A value that is
  already in the collection goes to the Duplicate output with the existing record; the
  workflow no longer stops with an error.
- Server-side errors (4xx/5xx) are reported with the 8kit error code and message. They
  used to surface as "Network error: Your request is invalid…" because n8n keeps the
  response body on `error.context.data`, not on the axios error.

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