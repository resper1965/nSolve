/**
 * Jira Webhook Handler
 * Processa atualizações de status vindas do Jira (bidirecional)
 */

import { Env } from '../index';

export interface JiraWebhookPayload {
  webhookEvent: string;
  issue_event_type_name?: string;
  issue: {
    id: string;
    key: string;
    fields: {
      status: {
        name: string;
      };
      summary: string;
      customfield_10001?: string; // Vulnerability ID
    };
  };
}

/**
 * Map Jira status to n.Solve status
 */
function mapJiraStatusToVLM(jiraStatus: string): string {
  const status = jiraStatus.toLowerCase();
  
  switch (status) {
    case 'done':
    case 'resolved':
    case 'closed':
      return 'resolved';
    case 'in progress':
    case 'in review':
      return 'in_progress';
    case 'reopened':
    case 'open':
    case 'to do':
      return 'open';
    default:
      return 'in_progress';
  }
}

/**
 * Handle Jira Webhook
 */
export async function handleJiraWebhook(payload: JiraWebhookPayload, env: Env): Promise<any> {
  try {
    const { issue, webhookEvent } = payload;

    if (!issue || !issue.key) {
      return {
        success: false,
        error: 'Invalid Jira webhook payload'
      };
    }

    // Find vulnerability linked to this Jira ticket
    const jiraIssue = await env.VLM_DB
      .prepare('SELECT * FROM jira_issues WHERE jira_key = ?')
      .bind(issue.key)
      .first();

    if (!jiraIssue) {
      console.log(`Jira ticket ${issue.key} not found in database`);
      return {
        success: false,
        error: 'Jira ticket not found in database'
      };
    }

    // Map Jira status to VLM status
    const newStatus = mapJiraStatusToVLM(issue.fields.status.name);

    // Update vulnerability status
    await env.VLM_DB
      .prepare(`
        UPDATE vulnerabilities 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)
      .bind(newStatus, (jiraIssue as any).vulnerability_id)
      .run();

    // Update jira_issues table
    await env.VLM_DB
      .prepare(`
        UPDATE jira_issues 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE jira_key = ?
      `)
      .bind(issue.fields.status.name, issue.key)
      .run();

    // Create audit log
    await env.VLM_DB
      .prepare(`
        INSERT INTO audit_logs (
          id, user_id, organization_id, action, resource, resource_id,
          changes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        `audit-${crypto.randomUUID()}`,
        'system',
        (jiraIssue as any).tenant_id || 'org-ness',
        'jira_status_update',
        'vulnerability',
        (jiraIssue as any).vulnerability_id,
        JSON.stringify({
          jira_key: issue.key,
          jira_status: issue.fields.status.name,
          vlm_status: newStatus,
          event: webhookEvent
        })
      )
      .run();

    return {
      success: true,
      message: 'Vulnerability status updated from Jira',
      data: {
        vulnerability_id: (jiraIssue as any).vulnerability_id,
        jira_key: issue.key,
        jira_status: issue.fields.status.name,
        vlm_status: newStatus
      }
    };

  } catch (error) {
    console.error('Jira Webhook Handler Error:', error);
    return {
      success: false,
      error: 'Failed to process Jira webhook'
    };
  }
}

