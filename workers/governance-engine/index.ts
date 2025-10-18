/**
 * n.Solve - Governance Engine
 * Motor de Governança, Triage e Conformidade
 */

import { NSolveFinding, StatusVLM, GovernanceRule, TriageDecision } from '../shared/types';

export interface Env {
  VLM_DB: D1Database;
  AI: any;
}

/**
 * Apply Governance Checks
 * Verifica regras de governança e suprime achados conforme políticas
 */
export async function applyGovernanceChecks(finding: NSolveFinding, env: Env): Promise<{
  should_proceed: boolean;
  reason?: string;
  applied_rule?: string;
}> {
  try {
    // Check if finding has justificativa_desativacao (already suppressed)
    if (finding.justificativa_desativacao) {
      console.log(`Finding ${finding.id} suppressed: ${finding.justificativa_desativacao}`);
      return {
        should_proceed: false,
        reason: finding.justificativa_desativacao,
        applied_rule: 'MANUAL_SUPPRESSION'
      };
    }

    // Check if expiration date has passed
    if (finding.expiration_date) {
      const expirationDate = new Date(finding.expiration_date);
      if (expirationDate < new Date()) {
        console.log(`Finding ${finding.id} exception expired, reactivating`);
        
        // Remove expiration and reactivate
        await env.VLM_DB.prepare(`
          UPDATE vulnerabilities 
          SET expiration_date = NULL, 
              justificativa_desativacao = NULL,
              status_vlm = 'PENDING_TRIAGE'
          WHERE id = ?
        `).bind(finding.id).run();
        
        return { should_proceed: true };
      } else {
        console.log(`Finding ${finding.id} still under exception until ${finding.expiration_date}`);
        return {
          should_proceed: false,
          reason: `Exception valid until ${finding.expiration_date}`,
          applied_rule: 'TEMPORARY_EXCEPTION'
        };
      }
    }

    // Get active governance rules for tenant
    const rules = await env.VLM_DB.prepare(`
      SELECT * FROM governance_rules 
      WHERE tenant_id = ? AND enabled = TRUE
      ORDER BY priority DESC
    `).bind(finding.tenant_id).all<GovernanceRule>();

    // Apply rules
    for (const rule of rules.results || []) {
      let matches = true;

      // Check severity
      if (rule.severity && rule.severity !== finding.severidade_ajustada) {
        matches = false;
      }

      // Check CWE list
      if (rule.cwe_list && finding.cwe) {
        const cweList = JSON.parse(rule.cwe_list as any);
        if (!cweList.includes(finding.cwe)) {
          matches = false;
        }
      }

      // Check source tools
      if (rule.source_tools) {
        const tools = JSON.parse(rule.source_tools as any);
        if (!tools.includes(finding.source_tool)) {
          matches = false;
        }
      }

      if (matches) {
        switch (rule.rule_type) {
          case 'SUPPRESS':
            await env.VLM_DB.prepare(`
              UPDATE vulnerabilities 
              SET status_vlm = 'FALSE_POSITIVE',
                  justificativa_desativacao = ?
              WHERE id = ?
            `).bind(rule.auto_justify || 'Auto-suppressed by governance rule', finding.id).run();
            
            return {
              should_proceed: false,
              reason: rule.auto_justify || 'Suppressed by governance rule',
              applied_rule: rule.id
            };

          case 'AUTO_ACCEPT':
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + (rule.expiration_days || 90));
            
            await env.VLM_DB.prepare(`
              UPDATE vulnerabilities 
              SET status_vlm = 'RISK_ACCEPTED',
                  justificativa_desativacao = ?,
                  expiration_date = ?
              WHERE id = ?
            `).bind(
              rule.auto_justify || 'Auto-accepted risk by governance rule',
              expirationDate.toISOString(),
              finding.id
            ).run();
            
            return {
              should_proceed: false,
              reason: `Risk accepted until ${expirationDate.toISOString()}`,
              applied_rule: rule.id
            };

          case 'ESCALATE':
            // Mark for immediate attention
            await env.VLM_DB.prepare(`
              UPDATE vulnerabilities 
              SET severidade_ajustada = 'CRITICAL',
                  status_vlm = 'VALIDATED'
              WHERE id = ?
            `).bind(finding.id).run();
            
            return {
              should_proceed: true,
              reason: 'Escalated to CRITICAL',
              applied_rule: rule.id
            };
        }
      }
    }

    // No rules matched, proceed normally
    return { should_proceed: true };

  } catch (error) {
    console.error('Governance check error:', error);
    return { should_proceed: true }; // Fail open for safety
  }
}

/**
 * Process Triage Decision
 */
export async function processTriageDecision(decision: TriageDecision, env: Env): Promise<any> {
  try {
    let newStatusVLM: StatusVLM;
    let justification = decision.justification;

    switch (decision.decision) {
      case 'VALIDATE':
        newStatusVLM = 'VALIDATED';
        break;
      case 'FALSE_POSITIVE':
        newStatusVLM = 'FALSE_POSITIVE';
        break;
      case 'RISK_ACCEPT':
        newStatusVLM = 'RISK_ACCEPTED';
        break;
      case 'DUPLICATE':
        newStatusVLM = 'CLOSED';
        justification = `Duplicate: ${justification}`;
        break;
      default:
        return { success: false, error: 'Invalid decision' };
    }

    // Update vulnerability
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status_vlm = ?,
          justificativa_desativacao = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatusVLM, justification, decision.finding_id).run();

    // Create audit log
    await env.VLM_DB.prepare(`
      INSERT INTO audit_logs (
        id, user_id, action, resource, resource_id,
        changes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `audit-${crypto.randomUUID()}`,
      decision.decided_by,
      'triage_decision',
      'vulnerability',
      decision.finding_id,
      JSON.stringify({
        decision: decision.decision,
        status_vlm: newStatusVLM,
        justification
      })
    ).run();

    return {
      success: true,
      data: {
        finding_id: decision.finding_id,
        new_status: newStatusVLM,
        justification
      }
    };

  } catch (error) {
    console.error('Triage processing error:', error);
    return { success: false, error: 'Failed to process triage decision' };
  }
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // POST /triage - Process triage decision
      if (url.pathname === '/triage' && request.method === 'POST') {
        const decision = await request.json() as TriageDecision;
        const result = await processTriageDecision(decision, env);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /pending-triage - List findings pending triage
      if (url.pathname === '/pending-triage' && request.method === 'GET') {
        const results = await env.VLM_DB.prepare(`
          SELECT * FROM vulnerabilities 
          WHERE status_vlm = 'PENDING_TRIAGE'
          ORDER BY severidade_ajustada DESC, created_at ASC
          LIMIT 100
        `).all();

        return new Response(JSON.stringify({
          success: true,
          count: results.results?.length || 0,
          data: results.results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Governance Engine Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

