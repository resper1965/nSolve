#!/bin/bash
# Deploy Deduplication Policy Features

set -e

echo "🚀 n.Solve - Deploying Deduplication Policy Features"
echo "=================================================="

cd "$(dirname "$0")"

# 1. Criar tabela asset_configs
echo ""
echo "📊 Step 1: Creating asset_configs table..."
wrangler d1 execute ness_vlm_db \
  --file=schema/d1-asset-configs-table.sql \
  --remote || echo "⚠️  Table may already exist, continuing..."

echo "✅ asset_configs table created"

# 2. Adicionar campos de deduplicação à tabela vulnerabilities
echo ""
echo "📊 Step 2: Adding deduplication fields to vulnerabilities..."
wrangler d1 execute ness_vlm_db \
  --file=schema/d1-vulnerabilities-dedup-fields.sql \
  --remote || echo "⚠️  Fields may already exist, continuing..."

echo "✅ Deduplication fields added"

# 3. Deploy InboundReceiver atualizado
echo ""
echo "📦 Step 3: Deploying InboundReceiver with updated policies..."
cd workers/inbound-receiver
wrangler deploy
cd ../..

echo "✅ InboundReceiver deployed"

# 4. Deploy DuplicateCleanupAgent
echo ""
echo "🧹 Step 4: Deploying DuplicateCleanupAgent..."
cd workers/duplicate-cleanup
wrangler deploy
cd ../..

echo "✅ DuplicateCleanupAgent deployed"

# 4. Testar cron trigger
echo ""
echo "⏰ Step 4: Testing Cron Trigger (optional)..."
echo "To manually trigger the cleanup, run:"
echo "  wrangler dev workers/duplicate-cleanup/index.ts --test-scheduled"
echo ""
echo "Or test via HTTP:"
echo "  curl -X POST https://duplicate-cleanup.ness.tec.br/cleanup"

echo ""
echo "=================================================="
echo "✅ Deduplication Policy Features Deployed Successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure asset_configs with deduplication policies via Admin Service"
echo "2. Monitor DuplicateCleanupAgent logs (runs daily at 3:00 AM UTC)"
echo "3. Adjust max_duplicates based on your needs"
echo ""
echo "🔍 Monitoring:"
echo "  - Check logs: wrangler tail duplicate-cleanup-agent"
echo "  - Manual cleanup: POST https://duplicate-cleanup.ness.tec.br/cleanup"
echo "=================================================="

