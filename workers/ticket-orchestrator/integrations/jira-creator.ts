/**
 * Jira Issue Creator
 * Cria issues no Jira (migrado para Ticket Orchestrator)
 */

import { NSolveFinding } from '../../shared/types';

export interface JiraConfig {
  url: string;
  email: string;
  token: string;
  project: string;
  issue_type?: string;
  custom_field_id?: string;
}

/**
 * Map n.Solve severity to Jira priority
 */
function mapSeverityToJiraPriority(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'Highest';
    case 'HIGH': return 'High';
    case 'MEDIUM': return 'Medium';
    case 'LOW': return 'Low';
    default: return 'Medium';
  }
}

/**
 * Create Jira Issue
 */
export async function createJiraIssue(
  finding: NSolveFinding,
  config: JiraConfig,
  env: any
): Promise<any> {
  try {
    const jiraIssue = {
      fields: {
        project: { key: config.project },
        summary: `[VULN-${finding.id}] ${finding.titulo}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                text: finding.description
              }]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Technical Details' }]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: `Severity: ${finding.severidade_ajustada}` }]
                  }]
                },
                {
                  type: 'listItem',
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: `CVE: ${finding.cve || 'N/A'}` }]
                  }]
                },
                {
                  type: 'listItem',
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: `CVSS: ${finding.cvss_score || 'N/A'}` }]
                  }]
                },
                {
                  type: 'listItem',
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: `Source: ${finding.source_tool}` }]
                  }]
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Compliance' }]
            },
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                text: `Controls: ${finding.control_mapping.join(', ')}`
              }]
            }
          ]
        },
        issuetype: { name: config.issue_type || 'Bug' },
        priority: { name: mapSeverityToJiraPriority(finding.severidade_ajustada) },
        labels: ['vulnerability', 'security', finding.severidade_ajustada.toLowerCase(), finding.source_tool],
        [config.custom_field_id || 'customfield_10001']: finding.id,
      }
    };

    const response = await fetch(`${config.url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${config.email}:${config.token}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jiraIssue),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();

    // Store mapping
    await env.VLM_DB.prepare(`
      INSERT INTO external_tickets (
        id, vulnerability_id, system_type, ticket_key, ticket_id, ticket_url, tenant_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `ticket-${crypto.randomUUID()}`,
      finding.id,
      'JIRA',
      result.key,
      result.id,
      `${config.url}/browse/${result.key}`,
      finding.tenant_id
    ).run();

    // Update status
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status_vlm = 'IN_REMEDIATION'
      WHERE id = ?
    `).bind(finding.id).run();

    return {
      success: true,
      ticket_key: result.key,
      ticket_url: `${config.url}/browse/${result.key}`,
      system_type: 'JIRA'
    };

  } catch (error) {
    console.error('Jira issue creation error:', error);
    return {
      success: false,
      error: 'Failed to create Jira issue'
    };
  }
}

