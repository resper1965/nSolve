import { Env } from '../types/env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      // Authentication middleware
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      // TODO: Validate JWT token

      // Route handling
      if (url.pathname === '/jira/tickets' && method === 'GET') {
        return await getJiraTickets(env, corsHeaders);
      }

      if (url.pathname === '/jira/tickets' && method === 'POST') {
        const body = await request.json();
        return await createJiraTicket(env, body, corsHeaders);
      }

      if (url.pathname.startsWith('/jira/tickets/') && method === 'PUT') {
        const ticketId = url.pathname.split('/')[3];
        const body = await request.json();
        return await updateJiraTicket(env, ticketId, body, corsHeaders);
      }

      if (url.pathname.startsWith('/jira/tickets/') && method === 'GET') {
        const ticketId = url.pathname.split('/')[3];
        return await getJiraTicket(env, ticketId, corsHeaders);
      }

      if (url.pathname === '/jira/sync' && method === 'POST') {
        const body = await request.json();
        return await syncVulnerabilityWithJira(env, body, corsHeaders);
      }

      if (url.pathname === '/jira/config' && method === 'GET') {
        return await getJiraConfig(env, request, corsHeaders);
      }

      if (url.pathname === '/jira/config' && method === 'POST') {
        const body = await request.json();
        return await saveJiraConfig(env, body, corsHeaders);
      }

      if (url.pathname === '/jira/config' && method === 'PUT') {
        const body = await request.json();
        return await updateJiraConfig(env, body, corsHeaders);
      }

      if (url.pathname === '/jira/config/test' && method === 'POST') {
        const body = await request.json();
        return await testJiraConnection(env, body, corsHeaders);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Jira Integration Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

async function getJiraConfig(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Extract tenant_id from JWT token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.substring(7);
    // TODO: Decode JWT to get tenant_id
    const tenant_id = 'tenant-1'; // Placeholder

    const config = await env.VLM_DB.prepare(`
      SELECT id, tenant_id, jira_url, jira_email, jira_project, custom_field_id, enabled
      FROM jira_configurations 
      WHERE tenant_id = ?
    `).bind(tenant_id).first();

    if (!config) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: null,
        message: 'No Jira configuration found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Don't return the token in the response for security
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        id: config.id,
        jira_url: config.jira_url,
        jira_email: config.jira_email,
        jira_project: config.jira_project,
        custom_field_id: config.custom_field_id,
        enabled: config.enabled
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching Jira config:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function saveJiraConfig(env: Env, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { tenant_id, jira_url, jira_email, jira_token, jira_project, custom_field_id } = body;

    if (!tenant_id || !jira_url || !jira_email || !jira_token || !jira_project) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test connection first
    const testResult = await testJiraConnection(env, body, corsHeaders);
    const testData = await testResult.json();
    
    if (!testData.success) {
      return new Response(JSON.stringify({ 
        error: 'Jira connection test failed. Please verify your credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const configId = `jira-config-${tenant_id}`;

    await env.VLM_DB.prepare(`
      INSERT INTO jira_configurations (id, tenant_id, jira_url, jira_email, jira_token, jira_project, custom_field_id, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      configId,
      tenant_id,
      jira_url,
      jira_email,
      jira_token,
      jira_project,
      custom_field_id || 'customfield_10001',
      true,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Jira configuration saved successfully',
      data: { id: configId }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving Jira config:', error);
    return new Response(JSON.stringify({ error: 'Failed to save configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateJiraConfig(env: Env, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { tenant_id, jira_url, jira_email, jira_token, jira_project, custom_field_id, enabled } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (jira_url) {
      updates.push('jira_url = ?');
      values.push(jira_url);
    }
    if (jira_email) {
      updates.push('jira_email = ?');
      values.push(jira_email);
    }
    if (jira_token) {
      updates.push('jira_token = ?');
      values.push(jira_token);
    }
    if (jira_project) {
      updates.push('jira_project = ?');
      values.push(jira_project);
    }
    if (custom_field_id) {
      updates.push('custom_field_id = ?');
      values.push(custom_field_id);
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(enabled);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(tenant_id);

    await env.VLM_DB.prepare(`
      UPDATE jira_configurations 
      SET ${updates.join(', ')}
      WHERE tenant_id = ?
    `).bind(...values).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Jira configuration updated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating Jira config:', error);
    return new Response(JSON.stringify({ error: 'Failed to update configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testJiraConnection(env: Env, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { jira_url, jira_email, jira_token, jira_project } = body;

    if (!jira_url || !jira_email || !jira_token) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test authentication by fetching project details
    const response = await fetch(`${jira_url}/rest/api/3/project/${jira_project}`, {
    headers: {
        'Authorization': `Basic ${btoa(`${jira_email}:${jira_token}`)}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Connection failed. Please check your credentials and project key.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const project = await response.json();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Connection successful',
      data: {
        project_name: project.name,
        project_key: project.key
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing Jira connection:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Connection test failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getJiraConfigForTenant(env: Env, tenant_id: string): Promise<any> {
  const config = await env.VLM_DB.prepare(`
    SELECT * FROM jira_configurations WHERE tenant_id = ? AND enabled = TRUE
  `).bind(tenant_id).first();

  return config;
}

async function getJiraTickets(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // TODO: Get tenant_id from JWT
    const tenant_id = 'tenant-1';

    // Get Jira configuration from database
    const config = await getJiraConfigForTenant(env, tenant_id);

    if (!config) {
      return new Response(JSON.stringify({ error: 'Jira not configured for this tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch tickets from Jira
    const response = await fetch(`${config.jira_url}/rest/api/3/search?jql=project=${config.jira_project}`, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.jira_email}:${config.jira_token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Jira issues to our format
    const customFieldId = config.custom_field_id || 'customfield_10001';
    const tickets = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description,
      vulnerability_id: issue.fields[customFieldId],
    }));

    return new Response(JSON.stringify({ success: true, data: tickets }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching Jira tickets:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tickets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function createJiraTicket(env: Env, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { vulnerability_id, title, description, severity, cve, tenant_id } = body;

    if (!vulnerability_id || !title || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Jira configuration for tenant
    const config = await getJiraConfigForTenant(env, tenant_id);

    if (!config) {
      return new Response(JSON.stringify({ error: 'Jira not configured for this tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Map severity to Jira priority
    const priorityMap: Record<string, string> = {
      'CRITICAL': 'Highest',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low'
    };

    const jiraIssue = {
      fields: {
        project: { key: jiraProject },
        summary: `[VULN-${vulnerability_id}] ${title}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description || 'No description provided'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `\n\n**Vulnerability Details:**\n- Severity: ${severity}\n- CVE: ${cve || 'N/A'}\n- Vulnerability ID: ${vulnerability_id}`
                }
              ]
            }
          ]
        },
        issuetype: { name: 'Bug' },
        priority: { name: priorityMap[severity] || 'Medium' },
        labels: ['vulnerability', 'security', severity.toLowerCase()],
        [config.custom_field_id || 'customfield_10001']: vulnerability_id,
      }
    };

    const response = await fetch(`${config.jira_url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${config.jira_email}:${config.jira_token}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jiraIssue),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();

    // Store the mapping in D1
    await env.VLM_DB.prepare(`
      INSERT OR REPLACE INTO jira_issues (id, vulnerability_id, jira_key, jira_id, status, created_at, updated_at, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `jira-${result.id}`,
      vulnerability_id,
      result.key,
      result.id,
      'Open',
      new Date().toISOString(),
      new Date().toISOString(),
      body.tenant_id || 'default'
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      data: { 
        jira_key: result.key, 
        jira_id: result.id,
        url: `${config.jira_url}/browse/${result.key}`
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    return new Response(JSON.stringify({ error: 'Failed to create ticket' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateJiraTicket(env: Env, ticketId: string, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { status, assignee, comment, tenant_id } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = await getJiraConfigForTenant(env, tenant_id);

    if (!config) {
      return new Response(JSON.stringify({ error: 'Jira not configured for this tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updateData: any = {};

    if (status) {
      // Get available transitions
      const transitionsResponse = await fetch(`${config.jira_url}/rest/api/3/issue/${ticketId}/transitions`, {
        headers: {
          'Authorization': `Basic ${btoa(`${config.jira_email}:${config.jira_token}`)}`,
          'Content-Type': 'application/json',
        },
      });

      if (transitionsResponse.ok) {
        const transitions = await transitionsResponse.json();
        const targetTransition = transitions.transitions.find((t: any) => 
          t.name.toLowerCase() === status.toLowerCase()
        );

        if (targetTransition) {
          updateData.transition = { id: targetTransition.id };
        }
      }
    }

    if (assignee) {
      updateData.assignee = { name: assignee };
    }

    if (comment) {
      updateData.update = {
        comment: [{
          add: {
            body: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: comment }]
              }]
            }
          }
        }]
      };
    }

    const response = await fetch(`${config.jira_url}/rest/api/3/issue/${ticketId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${config.jira_email}:${config.jira_token}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    // Update local database
    await env.VLM_DB.prepare(`
      UPDATE jira_issues 
      SET status = ?, updated_at = ?
      WHERE jira_id = ?
    `).bind(status || 'Updated', new Date().toISOString(), ticketId).run();

    return new Response(JSON.stringify({ success: true, message: 'Ticket updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating Jira ticket:', error);
    return new Response(JSON.stringify({ error: 'Failed to update ticket' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getJiraTicket(env: Env, ticketId: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // TODO: Get tenant_id from JWT
    const tenant_id = 'tenant-1';

    const config = await getJiraConfigForTenant(env, tenant_id);

    if (!config) {
      return new Response(JSON.stringify({ error: 'Jira not configured for this tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(`${config.jira_url}/rest/api/3/issue/${ticketId}`, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.jira_email}:${config.jira_token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const issue = await response.json();

    const ticket = {
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description,
      vulnerability_id: issue.fields[config.custom_field_id || 'customfield_10001'],
      url: `${config.jira_url}/browse/${issue.key}`
    };

    return new Response(JSON.stringify({ success: true, data: ticket }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
      
    } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch ticket' }), {
          status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function syncVulnerabilityWithJira(env: Env, body: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const { vulnerability_id, action } = body;

    if (!vulnerability_id) {
      return new Response(JSON.stringify({ error: 'Missing vulnerability_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get vulnerability from database
    const vulnResult = await env.VLM_DB.prepare(`
      SELECT * FROM vulnerabilities WHERE id = ?
    `).bind(vulnerability_id).first();

    if (!vulnResult) {
      return new Response(JSON.stringify({ error: 'Vulnerability not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if Jira ticket already exists
    const existingTicket = await env.VLM_DB.prepare(`
      SELECT * FROM jira_issues WHERE vulnerability_id = ?
    `).bind(vulnerability_id).first();

    if (existingTicket && action === 'create') {
      return new Response(JSON.stringify({ 
        error: 'Jira ticket already exists',
        jira_key: existingTicket.jira_key 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create') {
      // Create new Jira ticket
      return await createJiraTicket(env, {
        vulnerability_id,
        title: vulnResult.title,
        description: vulnResult.description,
        severity: vulnResult.severity,
        cve: vulnResult.cve,
        tenant_id: vulnResult.tenant_id
      }, corsHeaders);
    }

    if (action === 'update' && existingTicket) {
      // Update existing Jira ticket
      return await updateJiraTicket(env, existingTicket.jira_id, {
        status: vulnResult.status,
        comment: `Vulnerability status updated to: ${vulnResult.status}`
      }, corsHeaders);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing with Jira:', error);
    return new Response(JSON.stringify({ error: 'Failed to sync with Jira' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}