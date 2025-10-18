/**
 * Azure DevOps Work Item Creator
 * Cria Work Items no Azure Boards
 */

import { NSolveFinding } from '../../shared/types';

export interface AdoConfig {
  url: string;
  pat: string;
  project: string;
  area_path?: string;
  iteration_path?: string;
}

/**
 * Map n.Solve severity to ADO priority
 */
function mapSeverityToAdoPriority(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 1;
    case 'HIGH': return 2;
    case 'MEDIUM': return 3;
    case 'LOW': return 4;
    default: return 3;
  }
}

/**
 * Create ADO Work Item
 */
export async function createAdoWorkItem(
  finding: NSolveFinding,
  config: AdoConfig,
  env: any
): Promise<any> {
  try {
    const apiUrl = `${config.url}/${config.project}/_apis/wit/workitems/$Bug?api-version=7.0`;

    // Build work item document (JSON Patch format)
    const workItem = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: `[VULN-${finding.id}] ${finding.titulo}`
      },
      {
        op: 'add',
        path: '/fields/System.Description',
        value: `<div>
          <h3>Vulnerability Details</h3>
          <p>${finding.description}</p>
          
          <h4>Technical Information</h4>
          <ul>
            <li><strong>Severity:</strong> ${finding.severidade_ajustada}</li>
            <li><strong>CVE:</strong> ${finding.cve || 'N/A'}</li>
            <li><strong>CVSS Score:</strong> ${finding.cvss_score || 'N/A'}</li>
            <li><strong>CWE:</strong> ${finding.cwe || 'N/A'}</li>
            <li><strong>Source Tool:</strong> ${finding.source_tool}</li>
            <li><strong>Location Type:</strong> ${finding.location_type}</li>
          </ul>
          
          <h4>Compliance Mapping</h4>
          <p>${finding.control_mapping.join(', ')}</p>
          
          <h4>n.Solve Reference</h4>
          <p>Vulnerability ID: ${finding.id}</p>
        </div>`
      },
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: mapSeverityToAdoPriority(finding.severidade_ajustada)
      },
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Severity',
        value: finding.severidade_ajustada
      },
      {
        op: 'add',
        path: '/fields/System.Tags',
        value: `vulnerability; security; ${finding.severidade_ajustada.toLowerCase()}; ${finding.source_tool}`
      }
    ];

    // Add area path if configured
    if (config.area_path) {
      workItem.push({
        op: 'add',
        path: '/fields/System.AreaPath',
        value: config.area_path
      });
    }

    // Add iteration path if configured
    if (config.iteration_path) {
      workItem.push({
        op: 'add',
        path: '/fields/System.IterationPath',
        value: config.iteration_path
      });
    }

    // Create work item
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json-patch+json',
        'Authorization': `Basic ${btoa(`:${config.pat}`)}`,
      },
      body: JSON.stringify(workItem),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ADO API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Store mapping in D1
    await env.VLM_DB.prepare(`
      INSERT INTO external_tickets (
        id, vulnerability_id, system_type, ticket_key, ticket_id, ticket_url, tenant_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `ticket-${crypto.randomUUID()}`,
      finding.id,
      'ADO',
      result.id.toString(),
      result.id,
      result._links.html.href,
      finding.tenant_id
    ).run();

    // Update vulnerability status
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status_vlm = 'IN_REMEDIATION',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(finding.id).run();

    return {
      success: true,
      ticket_key: result.id.toString(),
      ticket_url: result._links.html.href,
      system_type: 'ADO'
    };

  } catch (error) {
    console.error('ADO Work Item creation error:', error);
    return {
      success: false,
      error: 'Failed to create ADO work item'
    };
  }
}

