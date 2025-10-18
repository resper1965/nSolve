/**
 * n.Solve - SLA Monitor Agent
 * Monitoramento proativo de SLA e notificações
 */

import { AssetConfig } from '../shared/types';

export interface Env {
  VLM_DB: D1Database;
  SLACK_WEBHOOK_URL?: string;
  PAGERDUTY_API_KEY?: string;
}

interface SlaViolation {
  vulnerability_id: string;
  title: string;
  severity: string;
  asset_id: string;
  asset_name: string;
  days_open: number;
  sla_limit: number;
  days_overdue: number;
  created_at: string;
}

/**
 * Calculate days between dates
 */
function calculateDaysSince(timestamp: string): number {
  const startDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - startDate.getTime();
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

/**
 * Check SLA Violations
 */
async function checkSlaViolations(env: Env): Promise<SlaViolation[]> {
  try {
    // Get all validated vulnerabilities that are still open
    const vulnerabilities = await env.VLM_DB.prepare(`
      SELECT v.*, a.name as asset_name, a.sla_config
      FROM vulnerabilities v
      LEFT JOIN asset_configs a ON v.asset_id = a.id
      WHERE v.status_vlm = 'VALIDATED'
        AND v.status NOT IN ('resolved', 'closed')
      ORDER BY v.severidade_ajustada DESC, v.created_at ASC
    `).all();

    const violations: SlaViolation[] = [];
    const now = new Date();

    for (const vuln of vulnerabilities.results || []) {
      const v = vuln as any;
      
      // Skip if already alerted in last 24 hours
      if (v.sla_violation_alerted_at) {
        const lastAlert = new Date(v.sla_violation_alerted_at);
        const hoursSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastAlert < 24) {
          continue; // Skip, já foi alertado recentemente
        }
      }

      // Get SLA config
      let slaConfig: any = { CRITICAL: 7, HIGH: 30, MEDIUM: 90, LOW: 180 }; // Default
      
      if (v.sla_config) {
        try {
          slaConfig = JSON.parse(v.sla_config);
        } catch (e) {
          console.log('Error parsing SLA config, using defaults');
        }
      }

      // Calculate days open
      const daysOpen = calculateDaysSince(v.created_at || v.first_seen_at);
      const slaLimit = slaConfig[v.severidade_ajustada] || slaConfig[v.severity] || 90;

      // Check if SLA is violated
      if (daysOpen > slaLimit) {
        const daysOverdue = daysOpen - slaLimit;

        violations.push({
          vulnerability_id: v.id,
          title: v.title || v.titulo,
          severity: v.severidade_ajustada || v.severity,
          asset_id: v.asset_id,
          asset_name: v.asset_name || 'Unknown Asset',
          days_open: daysOpen,
          sla_limit: slaLimit,
          days_overdue: daysOverdue,
          created_at: v.created_at
        });

        // Update last alert timestamp
        await env.VLM_DB.prepare(`
          UPDATE vulnerabilities 
          SET sla_violation_alerted_at = CURRENT_TIMESTAMP,
              sla_days_overdue = ?
          WHERE id = ?
        `).bind(daysOverdue, v.id).run();

        // Log alert
        await env.VLM_DB.prepare(`
          INSERT INTO sla_alerts (
            id, vulnerability_id, severity, days_overdue, asset_id, alerted_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          `sla-alert-${crypto.randomUUID()}`,
          v.id,
          v.severidade_ajustada || v.severity,
          daysOverdue,
          v.asset_id
        ).run();
      }
    }

    return violations;

  } catch (error) {
    console.error('Error checking SLA violations:', error);
    return [];
  }
}

/**
 * Send SLA Alert
 * Envia notificação para Slack, PagerDuty ou Email
 */
async function sendSlaAlert(
  violation: SlaViolation,
  assetConfig: AssetConfig | null,
  env: Env
): Promise<boolean> {
  try {
    const message = {
      severity: violation.severity,
      title: `🚨 SLA VIOLATION: ${violation.title}`,
      details: {
        asset: violation.asset_name,
        severity: violation.severity,
        days_open: violation.days_open,
        sla_limit: violation.sla_limit,
        days_overdue: violation.days_overdue,
        vulnerability_url: `https://nsolve.ness.tec.br/dashboard/vulnerabilities/all`
      },
      timestamp: new Date().toISOString()
    };

    // Send to Slack if configured
    if (assetConfig?.notification_config?.slack_webhook || env.SLACK_WEBHOOK_URL) {
      const slackWebhook = assetConfig?.notification_config?.slack_webhook || env.SLACK_WEBHOOK_URL;
      
      const slackMessage = {
        text: `🚨 *SLA VIOLATION*`,
        attachments: [{
          color: violation.severity === 'CRITICAL' ? 'danger' : 'warning',
          title: violation.title,
          fields: [
            { title: 'Asset', value: violation.asset_name, short: true },
            { title: 'Severity', value: violation.severity, short: true },
            { title: 'Days Open', value: `${violation.days_open} days`, short: true },
            { title: 'SLA Limit', value: `${violation.sla_limit} days`, short: true },
            { title: 'Days Overdue', value: `${violation.days_overdue} days ⏰`, short: true },
          ],
          footer: 'n.Solve SLA Monitor',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      await fetch(slackWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });

      console.log('✅ Slack notification sent');
    }

    // Send to PagerDuty if configured
    if (assetConfig?.notification_config?.pagerduty_key || env.PAGERDUTY_API_KEY) {
      const pdKey = assetConfig?.notification_config?.pagerduty_key || env.PAGERDUTY_API_KEY;
      
      const pdEvent = {
        routing_key: pdKey,
        event_action: 'trigger',
        payload: {
          summary: `SLA Violation: ${violation.title} (${violation.days_overdue} days overdue)`,
          severity: violation.severity === 'CRITICAL' ? 'critical' : 'error',
          source: 'n.Solve',
          custom_details: message.details
        }
      };

      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdEvent),
      });

      console.log('✅ PagerDuty alert sent');
    }

    return true;

  } catch (error) {
    console.error('Error sending SLA alert:', error);
    return false;
  }
}

/**
 * Scheduled Handler (Cron Trigger - Daily)
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('🕐 SLA Monitor Agent triggered at:', new Date().toISOString());

    try {
      // Check for SLA violations
      const violations = await checkSlaViolations(env);
      
      console.log(`📊 Found ${violations.length} SLA violations`);

      // Send alerts for each violation
      for (const violation of violations) {
        // Get asset config for notification settings
        const assetConfig = await env.VLM_DB.prepare(`
          SELECT * FROM asset_configs WHERE id = ?
        `).bind(violation.asset_id).first() as any;

        await sendSlaAlert(violation, assetConfig, env);
      }

      console.log('✅ SLA Monitor Agent completed successfully');

    } catch (error) {
      console.error('SLA Monitor Agent Error:', error);
    }
  },

  /**
   * HTTP Handler (for manual checks and API access)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /violations - Get current SLA violations
      if (url.pathname === '/violations' && request.method === 'GET') {
        const violations = await checkSlaViolations(env);

        return new Response(JSON.stringify({
          success: true,
          count: violations.length,
          data: violations
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /check - Manual SLA check and notification
      if (url.pathname === '/check' && request.method === 'POST') {
        const violations = await checkSlaViolations(env);
        
        let alertsSent = 0;
        for (const violation of violations) {
          const assetConfig = await env.VLM_DB.prepare(`
            SELECT * FROM asset_configs WHERE id = ?
          `).bind(violation.asset_id).first() as any;

          const sent = await sendSlaAlert(violation, assetConfig, env);
          if (sent) alertsSent++;
        }

        return new Response(JSON.stringify({
          success: true,
          violations_found: violations.length,
          alerts_sent: alertsSent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /health
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          worker: 'sla-monitor',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('SLA Monitor Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

