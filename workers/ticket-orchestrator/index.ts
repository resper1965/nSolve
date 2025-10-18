/**
 * n.Solve - Ticket Orchestrator
 * Roteamento modular para criação de tickets (Jira, ADO, GitHub)
 */

import { NSolveFinding, AssetConfig, SystemType } from '../shared/types';
import { createJiraIssue } from './integrations/jira-creator';
import { createAdoWorkItem } from './integrations/ado-creator';
import { createGitHubIssue } from './integrations/github-creator';

export interface Env {
  VLM_DB: D1Database;
}

/**
 * Route Ticket Creation
 * Roteamento modular baseado no system_type do asset
 */
export async function routeTicketCreation(
  finding: NSolveFinding,
  assetConfig: AssetConfig,
  env: Env
): Promise<{
  success: boolean;
  ticket_key?: string;
  ticket_url?: string;
  system_type?: SystemType;
  error?: string;
}> {
  try {
    // Apenas processa se status_vlm for VALIDATED
    if (finding.status_vlm !== 'VALIDATED') {
      return {
        success: false,
        error: `Finding status is ${finding.status_vlm}, must be VALIDATED`
      };
    }

    // Roteamento modular baseado no system_type
    switch (assetConfig.system_type) {
      case 'JIRA':
        if (!assetConfig.jira_config) {
          return { success: false, error: 'Jira configuration not found' };
        }
        return await createJiraIssue(finding, assetConfig.jira_config, env);

      case 'ADO':
        if (!assetConfig.ado_config) {
          return { success: false, error: 'ADO configuration not found' };
        }
        return await createAdoWorkItem(finding, assetConfig.ado_config, env);

      case 'GITHUB':
        if (!assetConfig.github_config) {
          return { success: false, error: 'GitHub configuration not found' };
        }
        return await createGitHubIssue(finding, assetConfig.github_config, env);

      default:
        return {
          success: false,
          error: `Unsupported system type: ${assetConfig.system_type}`
        };
    }

  } catch (error) {
    console.error('Ticket routing error:', error);
    return {
      success: false,
      error: 'Failed to route ticket creation'
    };
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // POST /create-ticket - Create ticket via orchestration
      if (url.pathname === '/create-ticket' && request.method === 'POST') {
        const body = await request.json() as any;
        const { finding_id, asset_id } = body;

        if (!finding_id || !asset_id) {
          return new Response(JSON.stringify({ error: 'finding_id and asset_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get finding
        const finding = await env.VLM_DB
          .prepare('SELECT * FROM vulnerabilities WHERE id = ?')
          .bind(finding_id)
          .first() as any;

        if (!finding) {
          return new Response(JSON.stringify({ error: 'Finding not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get asset config
        const assetConfig = await env.VLM_DB
          .prepare('SELECT * FROM asset_configs WHERE id = ?')
          .bind(asset_id)
          .first() as any;

        if (!assetConfig) {
          return new Response(JSON.stringify({ error: 'Asset configuration not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Route ticket creation
        const result = await routeTicketCreation(finding, assetConfig, env);

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Ticket Orchestrator Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

