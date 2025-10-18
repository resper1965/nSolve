/**
 * n.Solve - Analytics Agent Worker
 * Calcula métricas (MTTR) e executa análises periódicas
 */

import { calculateDaysBetween, calculateMTTRBySeverity, Finding, MTTRMetrics } from './analytics/mttr-calculator';

export interface Env {
  VLM_DB: D1Database;
  VLM_STORAGE: R2Bucket;
  AI: any;
}

/**
 * Fetch raw scan payload from R2
 */
async function fetchRawScanPayload(scanId: string, r2Bucket: R2Bucket): Promise<any> {
  try {
    const key = `raw_scans/${scanId}.json`;
    const object = await r2Bucket.get(key);

    if (!object) {
      console.log(`Raw scan ${scanId} not found in R2`);
      return null;
    }

    const content = await object.text();
    return JSON.parse(content);
  } catch (error) {
    console.error('Error fetching raw scan payload:', error);
    return null;
  }
}

/**
 * Calculate MTTR metrics
 */
async function calculateMTTR(env: Env): Promise<MTTRMetrics[]> {
  try {
    // Query all resolved/closed vulnerabilities
    const result = await env.VLM_DB
      .prepare(`
        SELECT 
          id, severity, created_at, updated_at, status
        FROM vulnerabilities 
        WHERE status IN ('resolved', 'closed')
        ORDER BY created_at DESC
        LIMIT 1000
      `)
      .all<Finding>();

    if (!result.results || result.results.length === 0) {
      console.log('No resolved vulnerabilities found');
      return [];
    }

    // Calculate MTTR by severity
    const metrics = calculateMTTRBySeverity(result.results);

    // Store metrics in D1
    for (const metric of metrics) {
      await env.VLM_DB
        .prepare(`
          INSERT OR REPLACE INTO metrics (
            id, metric_type, severity, value, unit, 
            calculated_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .bind(
          `mttr-${metric.severity.toLowerCase()}-${Date.now()}`,
          'mttr',
          metric.severity,
          metric.avg_days,
          'days'
        )
        .run();
    }

    console.log('MTTR Metrics calculated:', metrics);
    return metrics;

  } catch (error) {
    console.error('Error calculating MTTR:', error);
    return [];
  }
}

/**
 * Generate analytics report
 */
async function generateAnalyticsReport(env: Env): Promise<any> {
  try {
    const [mttrMetrics, totalVulns, criticalOpen] = await Promise.all([
      calculateMTTR(env),
      env.VLM_DB.prepare('SELECT COUNT(*) as count FROM vulnerabilities').first(),
      env.VLM_DB.prepare('SELECT COUNT(*) as count FROM vulnerabilities WHERE severity = ? AND status = ?')
        .bind('CRITICAL', 'open')
        .first(),
    ]);

    const report = {
      generated_at: new Date().toISOString(),
      mttr_metrics: mttrMetrics,
      total_vulnerabilities: (totalVulns as any)?.count || 0,
      critical_open: (criticalOpen as any)?.count || 0,
    };

    // Store report in R2
    const reportKey = `reports/analytics-${new Date().toISOString().split('T')[0]}.json`;
    await env.VLM_STORAGE.put(reportKey, JSON.stringify(report, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });

    console.log('Analytics report generated:', report);
    return report;

  } catch (error) {
    console.error('Error generating analytics report:', error);
    return null;
  }
}

/**
 * Scheduled Handler (Cron Trigger)
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Analytics Agent triggered at:', new Date().toISOString());

    try {
      // Calculate MTTR metrics
      const mttrMetrics = await calculateMTTR(env);
      console.log('MTTR Metrics:', mttrMetrics);

      // Generate full analytics report
      const report = await generateAnalyticsReport(env);
      console.log('Analytics Report:', report);

      console.log('✅ Analytics Agent completed successfully');
    } catch (error) {
      console.error('Analytics Agent Error:', error);
    }
  },

  /**
   * HTTP Handler (for manual triggers and API access)
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
      // GET /mttr - Get current MTTR metrics
      if (url.pathname === '/mttr' && request.method === 'GET') {
        const metrics = await calculateMTTR(env);
        return new Response(JSON.stringify({ success: true, data: metrics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /report - Get latest analytics report
      if (url.pathname === '/report' && request.method === 'GET') {
        const report = await generateAnalyticsReport(env);
        return new Response(JSON.stringify({ success: true, data: report }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /raw-scan/:scanId - Fetch raw scan from R2
      if (url.pathname.startsWith('/raw-scan/') && request.method === 'GET') {
        const scanId = url.pathname.split('/')[2];
        const payload = await fetchRawScanPayload(scanId, env.VLM_STORAGE);

        if (!payload) {
          return new Response(JSON.stringify({ error: 'Scan not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, data: payload }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /trigger - Manual trigger for analytics
      if (url.pathname === '/trigger' && request.method === 'POST') {
        ctx.waitUntil((async () => {
          await calculateMTTR(env);
          await generateAnalyticsReport(env);
        })());

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Analytics agent triggered' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          worker: 'analytics-agent',
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
      console.error('Analytics Agent Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

