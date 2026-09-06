// The config n8n's own verification linter uses. Kept so
// `npx @n8n/node-cli lint` runs here and a rule violation shows up before a
// submission is rejected rather than after.
import { config } from '@n8n/node-cli/eslint';

export default config;
