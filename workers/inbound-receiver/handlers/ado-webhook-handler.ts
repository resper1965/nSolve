/**
 * Azure DevOps Service Hook Handler
 * Processa webhooks do Azure DevOps para atualização de status
 */

import { Env } from '../index';

export interface AdoServiceHookPayload {
  eventType: string;
  resource: {
    id: number;
    workItemId: number;
    rev: number;
    fields: {
      'System.State': {
        newValue: string;
        oldValue: string;
      };
      'System.Title': {
        newValue: string;
      };
    };
  };
}

/**
 * Map ADO state to n.Solve status_vlm
 */
function mapAdoStateToVLM(adoState: string): string {
  const state = adoState.toLowerCase();
  
  switch (state) {
    case 'resolved':
    case 'closed':
    case 'done':
      return 'AWAITING_RETEST';
    case 'active':
    case 'committed':
      return 'IN_REMEDIATION';
    case 'new':
      return 'VALIDATED';
    default:
      return 'IN_REMEDIATION';
  }
}

/**
 * Handle ADO Service Hook
 */
export async function handleAdoServiceHook(payload: AdoServiceHookPayload, env: Env): Promise<any> {
  try {
    const { resource, eventType } = payload;

    if (eventType !== 'workitem.updated' || !resource) {
      return {
        success: false,
        error: 'Invalid ADO service hook payload'
      };
    }

    const workItemId = resource.workItemId || resource.id;
    const newState = resource.fields?.['System.State']?.newValue;

    if (!newState) {
      return {
        success: false,
        error: 'No state change detected'
      };
    }

    // Find vulnerability linked to this work item
    const ticket = await env.VLM_DB
      .prepare('SELECT * FROM external_tickets WHERE ticket_id = ? AND system_type = ?')
      .bind(workItemId.toString(), 'ADO')
      .first();

    if (!ticket) {
      console.log(`ADO work item ${workItemId} not found in database`);
      return {
        success: false,
        error: 'Work item not found in database'
      };
    }

    // Map ADO state to VLM status
    const newStatusVLM = mapAdoStateToVLM(newState);

    // Update vulnerability status
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status_vlm = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatusVLM, (ticket as any).vulnerability_id).run();

    // Create audit log
    await env.VLM_DB.prepare(`
      INSERT INTO audit_logs (
        id, user_id, organization_id, action, resource, resource_id,
        changes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `audit-${crypto.randomUUID()}`,
      'system',
      (ticket as any).tenant_id || 'org-ness',
      'ado_status_update',
      'vulnerability',
      (ticket as any).vulnerability_id,
      JSON.stringify({
        work_item_id: workItemId,
        ado_state: newState,
        vlm_status: newStatusVLM,
        event_type: eventType
      })
    ).run();

    return {
      success: true,
      message: 'Vulnerability status updated from ADO',
      data: {
        vulnerability_id: (ticket as any).vulnerability_id,
        work_item_id: workItemId,
        ado_state: newState,
        vlm_status: newStatusVLM
      }
    };

  } catch (error) {
    console.error('ADO Service Hook Handler Error:', error);
    return {
      success: false,
      error: 'Failed to process ADO service hook'
    };
  }
}

