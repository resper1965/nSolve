/**
 * OWASP ZAP Adapter
 * Traduz payload do OWASP ZAP para CDM do n.Solve
 */

import { Env } from '../index';

export interface ZapAlert {
  pluginid: string;
  alert: string;
  name: string;
  riskcode: string;
  confidence: string;
  riskdesc: string;
  desc: string;
  solution: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
  url: string;
  param: string;
  attack: string;
  evidence: string;
}

/**
 * Generate correlation key
 */
async function generateCorrelationKey(type: string, url: string, param: string): Promise<string> {
  const data = `${type}|${url}|${param}`.toLowerCase();
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize ZAP risk to severity
 */
function normalizeSeverity(riskcode: string): string {
  switch (riskcode) {
    case '3': return 'HIGH';
    case '2': return 'MEDIUM';
    case '1': return 'LOW';
    case '0': return 'INFO';
    default: return 'MEDIUM';
  }
}

/**
 * Handle OWASP ZAP Payload
 */
export async function handleZapPayload(payload: any, env: Env): Promise<any> {
  try {
    const alerts: ZapAlert[] = payload.site?.[0]?.alerts || payload.alerts || [payload];
    const results = {
      processed: 0,
      duplicates: 0,
      errors: 0,
      created: [] as string[],
    };

    for (const alert of alerts) {
      try {
        // Generate correlation key
        const correlationKey = await generateCorrelationKey(
          alert.name || alert.alert,
          alert.url || '',
          alert.param || ''
        );

        // Check for duplicates
        const existing = await env.VLM_DB
          .prepare('SELECT id FROM vulnerabilities WHERE correlation_key = ?')
          .bind(correlationKey)
          .first();

        if (existing) {
          results.duplicates++;
          continue;
        }

        // Normalize severity
        const severity = normalizeSeverity(alert.riskcode || '2');

        // Build description
        const description = `
${alert.desc || alert.alert}

**Attack:** ${alert.attack || 'N/A'}
**Evidence:** ${alert.evidence || 'N/A'}

**Solution:** ${alert.solution || 'N/A'}

**References:** ${alert.reference || 'N/A'}
        `.trim();

        // Insert into D1
        const vulnId = `vuln-${crypto.randomUUID()}`;
        await env.VLM_DB
          .prepare(`
            INSERT INTO vulnerabilities (
              id, title, description, severity, status,
              cve, cvss_score, tenant_id, correlation_key,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
          .bind(
            vulnId,
            alert.name || alert.alert,
            description,
            severity,
            'open',
            alert.cweid ? `CWE-${alert.cweid}` : null,
            null, // ZAP não fornece CVSS score direto
            'org-ness', // Default tenant
            correlationKey
          )
          .run();

        results.processed++;
        results.created.push(vulnId);

      } catch (error) {
        console.error('Error processing ZAP alert:', error);
        results.errors++;
      }
    }

    return {
      success: true,
      message: `Processed ${results.processed} alerts from OWASP ZAP`,
      stats: results
    };

  } catch (error) {
    console.error('ZAP Adapter Error:', error);
    return {
      success: false,
      error: 'Failed to process ZAP payload'
    };
  }
}

