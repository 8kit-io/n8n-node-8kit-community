# 8kit Sandbox — Cloud Deployment Guide

Deploy the 8kit demo sandbox to Fly.io for public access at `demo.8kit.io`.

## Architecture

Two Fly apps connected via internal networking:

```
Internet
  ├── demo.8kit.io        → 8kit-demo      (8kit API + Dashboard)
  └── n8n-demo.8kit.io    → 8kit-demo-n8n  (n8n with 8kit node)
                                ↕ internal networking
                          8kit-demo.internal:3000
```

- **8kit-demo**: 8kit server + dashboard, backed by Fly Postgres
- **8kit-demo-n8n**: n8n editor with 8kit community node pre-installed, connected to 8kit-demo

## Prerequisites

- [Fly CLI](https://fly.io/docs/flyctl/install/) installed and authenticated
- Fly.io account with payment method

## Step 1: Deploy 8kit Server

```bash
# Create the app
fly apps create 8kit-demo

# Create and attach PostgreSQL
fly postgres create --name 8kit-demo-db --region ord --initial-cluster-size 1 --vm-size shared-cpu-1x
fly postgres attach 8kit-demo-db --app 8kit-demo

# Set secrets
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app 8kit-demo

# Deploy
fly deploy --config demo/deploy/fly.toml

# Verify
fly status --app 8kit-demo
curl https://8kit-demo.fly.dev/health
```

## Step 2: Deploy n8n Sandbox

```bash
# Create the app
fly apps create 8kit-demo-n8n

# Create persistent volume for n8n data
fly volumes create n8n_data --size 1 --region ord --app 8kit-demo-n8n

# Set secrets
fly secrets set \
  N8N_BASIC_AUTH_USER=demo \
  N8N_BASIC_AUTH_PASSWORD=demo8kit \
  --app 8kit-demo-n8n

# Deploy
fly deploy --config demo/deploy/fly-n8n.toml --dockerfile demo/deploy/Dockerfile.n8n

# Verify
fly status --app 8kit-demo-n8n
```

## Step 3: Initialize Demo Content

Run the init script against the deployed services:

```bash
# From repo root
EIGHTKIT_URL=https://8kit-demo.fly.dev \
N8N_URL=https://8kit-demo-n8n.fly.dev \
sh demo/init-sandbox.sh
```

Or SSH into the n8n machine and run it there for internal networking:

```bash
fly ssh console --app 8kit-demo-n8n
# Then run init-sandbox.sh with internal URLs
```

## Step 4: Custom Domains (Optional)

```bash
# Point demo.8kit.io to the 8kit app
fly certs add demo.8kit.io --app 8kit-demo

# Point n8n-demo.8kit.io to the n8n app
fly certs add n8n-demo.8kit.io --app 8kit-demo-n8n
```

Then add CNAME records in your DNS:
- `demo.8kit.io` → `8kit-demo.fly.dev`
- `n8n-demo.8kit.io` → `8kit-demo-n8n.fly.dev`

## Auto-Reset (Daily)

To reset demo data every 24h, set up a Fly Machine scheduled task:

```bash
# Create a scheduled machine that resets the sandbox daily
fly machine run alpine:3.19 \
  --app 8kit-demo-n8n \
  --schedule daily \
  --entrypoint "sh" \
  --command "/init-sandbox.sh" \
  --env N8N_URL=http://8kit-demo-n8n.internal:5678 \
  --env EIGHTKIT_URL=http://8kit-demo.internal:3000
```

## Estimated Monthly Cost

| Service | Spec | Cost |
|---------|------|------|
| 8kit-demo | shared-cpu-1x, 512MB | ~$3/mo |
| 8kit-demo-db | Fly Postgres shared | ~$0/mo (free tier) |
| 8kit-demo-n8n | shared-cpu-1x, 512MB, 1GB vol | ~$3.15/mo |
| **Total** | | **~$6.15/mo** |

## Monitoring

```bash
# Check app status
fly status --app 8kit-demo
fly status --app 8kit-demo-n8n

# View logs
fly logs --app 8kit-demo
fly logs --app 8kit-demo-n8n

# Scale up if needed
fly scale count 2 --app 8kit-demo
```
