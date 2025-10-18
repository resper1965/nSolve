/**
 * GitHub Issue Creator
 * Cria issues no GitHub para vulnerabilidades
 */

import { NSolveFinding } from '../../shared/types';

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

/**
 * Map severity to GitHub labels
 */
function mapSeverityToLabels(severity: string): string[] {
  const baseLabels = ['vulnerability', 'security'];
  
  switch (severity) {
    case 'CRITICAL': return [...baseLabels, 'critical', 'priority-high'];
    case 'HIGH': return [...baseLabels, 'high-severity'];
    case 'MEDIUM': return [...baseLabels, 'medium-severity'];
    case 'LOW': return [...baseLabels, 'low-severity'];
    default: return baseLabels;
  }
}

/**
 * Create GitHub Issue
 */
export async function createGitHubIssue(
  finding: NSolveFinding,
  config: GitHubConfig,
  env: any
): Promise<any> {
  try {
    const issue = {
      title: `[Security] ${finding.titulo}`,
      body: `## 🔒 Security Vulnerability

**Severity:** ${finding.severidade_ajustada}  
**Status:** ${finding.status_vlm}  
**Source:** ${finding.source_tool}

### Description

${finding.description}

### Technical Details

- **CVE:** ${finding.cve || 'N/A'}
- **CVSS Score:** ${finding.cvss_score || 'N/A'}
- **CWE:** ${finding.cwe || 'N/A'}
- **Location Type:** ${finding.location_type}

### Compliance Mapping

${finding.control_mapping.map(c => `- ${c}`).join('\n')}

### n.Solve Reference

- **Vulnerability ID:** \`${finding.id}\`
- **Correlation Key:** \`${finding.correlation_key}\`
- **First Seen:** ${finding.first_seen_at || finding.created_at}

---
*This issue was automatically created by n.Solve*`,
      labels: mapSeverityToLabels(finding.severidade_ajustada),
    };

    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issue),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
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
      'GITHUB',
      result.number.toString(),
      result.id,
      result.html_url,
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
      ticket_key: result.number.toString(),
      ticket_url: result.html_url,
      system_type: 'GITHUB'
    };

  } catch (error) {
    console.error('GitHub issue creation error:', error);
    return {
      success: false,
      error: 'Failed to create GitHub issue'
    };
  }
}

/**
 * Post Comment to Pull Request
 * Shift-Left: Comenta em PRs com achados de SAST/SCA
 */
export async function postCommentToPullRequest(
  prNumber: number,
  finding: NSolveFinding,
  translatedRecommendation: string,
  config: GitHubConfig
): Promise<boolean> {
  try {
    const comment = `## 🔒 Security Finding Detected

**⚠️ ${finding.severidade_ajustada} Severity: ${finding.titulo}**

### Description
${finding.description}

### Recommendation (Translated)
${translatedRecommendation}

### Technical Details
- **CVE:** ${finding.cve || 'N/A'}
- **CWE:** ${finding.cwe || 'N/A'}
- **CVSS:** ${finding.cvss_score || 'N/A'}
- **Source:** ${finding.source_tool}

### Compliance Impact
This finding may affect compliance with:
${finding.control_mapping.map(c => `- ${c}`).join('\n')}

---
*Automated security check by n.Solve | [View Details](https://nsolve.ness.tec.br/dashboard/vulnerabilities/all)*`;

    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: comment }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`GitHub comment error: ${response.status} - ${errorData}`);
      return false;
    }

    console.log(`✅ Security comment posted to PR #${prNumber}`);
    return true;

  } catch (error) {
    console.error('Error posting PR comment:', error);
    return false;
  }
}

