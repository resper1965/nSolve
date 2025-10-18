"use client";

import { useState, useEffect } from "react";
import { Check, X, Key, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function IntegrationsPage() {
  const [jiraConfig, setJiraConfig] = useState({
    jira_url: "",
    jira_email: "",
    jira_token: "",
    jira_project: "",
    custom_field_id: "customfield_10001",
    enabled: true,
  });

  const [isConfigured, setIsConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJiraConfig();
  }, []);

  const fetchJiraConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://jira-integration.ness.workers.dev/jira/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setJiraConfig(data.data);
          setIsConfigured(true);
        }
      }
    } catch (error) {
      console.error('Error fetching Jira config:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://jira-integration.ness.workers.dev/jira/config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jiraConfig),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const endpoint = isConfigured ? '/jira/config' : '/jira/config';
      const method = isConfigured ? 'PUT' : 'POST';

      const response = await fetch(`https://jira-integration.ness.workers.dev${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...jiraConfig,
          tenant_id: 'tenant-1', // TODO: Get from JWT
        }),
      });

      if (response.ok) {
        setIsConfigured(true);
        alert('Jira configuration saved successfully!');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Integrations
        </h1>
        <p className="text-[#9CA3AF] mt-2">Configure external integrations</p>
      </div>

      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#00ADE8]" />
              Jira Integration
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF] text-sm">
                {isConfigured ? 'Configured' : 'Not configured'}
              </span>
              <Switch
                checked={jiraConfig.enabled}
                onCheckedChange={(checked) => setJiraConfig({ ...jiraConfig, enabled: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Jira URL</Label>
              <Input
                placeholder="https://your-domain.atlassian.net"
                value={jiraConfig.jira_url}
                onChange={(e) => setJiraConfig({ ...jiraConfig, jira_url: e.target.value })}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Email</Label>
              <Input
                type="email"
                placeholder="your-email@domain.com"
                value={jiraConfig.jira_email}
                onChange={(e) => setJiraConfig({ ...jiraConfig, jira_email: e.target.value })}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">API Token</Label>
              <Input
                type="password"
                placeholder="Your Jira API token"
                value={jiraConfig.jira_token}
                onChange={(e) => setJiraConfig({ ...jiraConfig, jira_token: e.target.value })}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
              <a 
                href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00ADE8] text-xs flex items-center gap-1 hover:underline"
              >
                Generate API Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Project Key</Label>
              <Input
                placeholder="VULN"
                value={jiraConfig.jira_project}
                onChange={(e) => setJiraConfig({ ...jiraConfig, jira_project: e.target.value })}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#EEF1F6]">Custom Field ID (for Vulnerability ID)</Label>
            <Input
              placeholder="customfield_10001"
              value={jiraConfig.custom_field_id}
              onChange={(e) => setJiraConfig({ ...jiraConfig, custom_field_id: e.target.value })}
              className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
            />
            <p className="text-[#9CA3AF] text-xs">
              This custom field will be used to store the vulnerability ID in Jira tickets
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 border rounded ${
              testResult.success 
                ? 'bg-green-900/20 border-green-500/30 text-green-400' 
                : 'bg-red-900/20 border-red-500/30 text-red-400'
            }`}>
              {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={testConnection}
              disabled={testing || !jiraConfig.jira_url || !jiraConfig.jira_token}
              variant="outline"
              className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={saveConfig}
              disabled={saving || !jiraConfig.jira_url || !jiraConfig.jira_token}
              className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

          <div className="border-t border-[#1B2030] pt-4 mt-4">
            <h3 className="text-[#EEF1F6] font-medium mb-2">How to configure:</h3>
            <ol className="list-decimal list-inside space-y-1 text-[#9CA3AF] text-sm">
              <li>Enter your Jira Cloud URL (e.g., https://yourcompany.atlassian.net)</li>
              <li>Generate an API token from your Atlassian account</li>
              <li>Enter your Jira email address</li>
              <li>Specify your project key (visible in Jira project settings)</li>
              <li>Optional: Set a custom field ID for vulnerability tracking</li>
              <li>Test the connection before saving</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
