"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Key, Settings, Webhook, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  description: string;
  status: 'active' | 'inactive';
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const webhookConfigs: WebhookConfig[] = [
    {
      id: 'pentest-tools',
      name: 'Pentest Tools',
      url: 'https://inbound-receiver.ness.workers.dev/webhook',
      method: 'POST',
      headers: {
        'X-Source-Tool': 'pentest-tools',
        'Content-Type': 'application/json'
      },
      description: 'Webhook para receber resultados de scans do pentest-tools.com',
      status: 'active'
    },
    {
      id: 'owasp-zap',
      name: 'OWASP ZAP',
      url: 'https://inbound-receiver.ness.workers.dev/webhook',
      method: 'POST',
      headers: {
        'X-Source-Tool': 'zap',
        'Content-Type': 'application/json'
      },
      description: 'Webhook para receber resultados de scans do OWASP ZAP',
      status: 'active'
    },
    {
      id: 'jira-status',
      name: 'Jira Status Updates',
      url: 'https://inbound-receiver.ness.workers.dev/jira-status-update',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      description: 'Webhook para receber atualizações de status do Jira',
      status: 'active'
    },
    {
      id: 'ado-service',
      name: 'Azure DevOps',
      url: 'https://inbound-receiver.ness.workers.dev/ado-service-hook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      description: 'Webhook para receber atualizações do Azure DevOps',
      status: 'active'
    }
  ];

  useEffect(() => {
    setWebhooks(webhookConfigs);
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-900/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-red-900/20 text-red-400 border-red-500/30">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-900/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  const generateWebhookPayload = (webhook: WebhookConfig) => {
    if (webhook.id === 'pentest-tools') {
      return {
        scan_id: "scan-12345",
        asset_id: "asset-web-app-1",
        findings: [
          {
            id: "finding-001",
            title: "SQL Injection Vulnerability",
            description: "A SQL injection vulnerability was found in the login form",
            severity: "HIGH",
            cwe: "CWE-89",
            location: {
              url: "https://example.com/login",
              parameter: "username",
              method: "POST"
            },
            recommendation: "Use parameterized queries to prevent SQL injection",
            references: [
              "https://owasp.org/www-community/attacks/SQL_Injection"
            ]
          }
        ],
        scan_metadata: {
          tool: "pentest-tools",
          version: "1.0.0",
          scan_date: new Date().toISOString(),
          target: "https://example.com"
        }
      };
    } else if (webhook.id === 'owasp-zap') {
      return {
        "@version": "1.0",
        "@timestamp": new Date().toISOString(),
        "site": [
          {
            "@name": "https://example.com",
            "alerts": [
              {
                "pluginid": "10021",
                "alert": "XSS Reflected",
                "name": "Cross Site Scripting (Reflected)",
                "risk": "High",
                "confidence": "Medium",
                "riskdesc": "High (Medium)",
                "desc": "Cross-site scripting (XSS) is a type of computer security vulnerability typically found in web applications.",
                "instances": [
                  {
                    "uri": "https://example.com/search",
                    "method": "GET",
                    "param": "q",
                    "attack": "<script>alert('XSS')</script>",
                    "evidence": "<script>alert('XSS')</script>"
                  }
                ]
              }
            ]
          }
        ]
      };
    }
    return {};
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Webhook Configuration
        </h1>
        <p className="text-[#9CA3AF] mt-2">Configure webhooks for external pentest tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-[#00ADE8]" />
                  {webhook.name}
                </CardTitle>
                {getStatusBadge(webhook.status)}
              </div>
              <p className="text-[#9CA3AF] text-sm">{webhook.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhook.url}
                    readOnly
                    className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6] font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                    className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
                  >
                    {copied === `url-${webhook.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Method</Label>
                <Badge variant="outline" className="border-[#1B2030] text-[#EEF1F6]">
                  {webhook.method}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Required Headers</Label>
                <div className="space-y-1">
                  {Object.entries(webhook.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <code className="bg-[#0A0B0F] px-2 py-1 rounded text-[#00ADE8]">{key}</code>
                      <span className="text-[#9CA3AF]">:</span>
                      <code className="bg-[#0A0B0F] px-2 py-1 rounded text-[#EEF1F6]">{value}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Sample Payload</Label>
                <Textarea
                  value={JSON.stringify(generateWebhookPayload(webhook), null, 2)}
                  readOnly
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6] font-mono text-xs h-32"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(JSON.stringify(generateWebhookPayload(webhook), null, 2), `payload-${webhook.id}`)}
                  className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
                >
                  {copied === `payload-${webhook.id}` ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy Payload
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
                  onClick={() => window.open(webhook.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Test URL
                </Button>
                <Button
                  size="sm"
                  className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
                  onClick={() => {
                    const payload = generateWebhookPayload(webhook);
                    fetch(webhook.url, {
                      method: webhook.method,
                      headers: webhook.headers,
                      body: JSON.stringify(payload)
                    }).then(response => {
                      if (response.ok) {
                        alert('Test webhook sent successfully!');
                      } else {
                        alert('Test webhook failed. Check console for details.');
                      }
                    }).catch(error => {
                      alert('Test webhook failed: ' + error.message);
                    });
                  }}
                >
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#00ADE8]" />
            Configuration Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-[#EEF1F6] font-medium">For Pentest Tools:</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#9CA3AF] text-sm">
              <li>Access your pentest-tools.com dashboard</li>
              <li>Go to Settings → Webhooks</li>
              <li>Add new webhook with the URL above</li>
              <li>Set the header <code className="bg-[#0A0B0F] px-1 rounded">X-Source-Tool: pentest-tools</code></li>
              <li>Configure to send POST requests with JSON payload</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="text-[#EEF1F6] font-medium">For OWASP ZAP:</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#9CA3AF] text-sm">
              <li>Install ZAP Jenkins plugin or use ZAP API</li>
              <li>Configure webhook in ZAP settings</li>
              <li>Set the header <code className="bg-[#0A0B0F] px-1 rounded">X-Source-Tool: zap</code></li>
              <li>Enable JSON reporting format</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="text-[#EEF1F6] font-medium">Security Notes:</h4>
            <ul className="list-disc list-inside space-y-1 text-[#9CA3AF] text-sm">
              <li>Webhooks are currently configured without HMAC verification</li>
              <li>Consider implementing signature verification for production</li>
              <li>Monitor webhook logs for suspicious activity</li>
              <li>Use HTTPS endpoints only</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
