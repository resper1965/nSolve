"use client";

import { useState, useEffect } from "react";
import { Check, X, AlertCircle, ExternalLink, Key, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IntegrationStatus {
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  lastChecked: string;
}

export default function IntegrationsTestPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [testing, setTesting] = useState(false);

  const integrationEndpoints = [
    {
      name: 'Auth Service',
      url: 'https://auth-service.ness.workers.dev/auth/me',
      method: 'GET'
    },
    {
      name: 'Core Processor',
      url: 'https://core-processor.ness.workers.dev/vulnerabilities',
      method: 'GET'
    },
    {
      name: 'Jira Integration',
      url: 'https://jira-integration.ness.workers.dev/jira/config',
      method: 'GET'
    },
    {
      name: 'Analytics Agent',
      url: 'https://analytics-agent.ness.workers.dev/metrics',
      method: 'GET'
    },
    {
      name: 'Translation Agent',
      url: 'https://translation-agent.ness.workers.dev/translate',
      method: 'POST'
    },
    {
      name: 'SLA Monitor',
      url: 'https://sla-monitor.ness.workers.dev/health',
      method: 'GET'
    },
    {
      name: 'UAN Agent',
      url: 'https://uan-agent.ness.workers.dev/health',
      method: 'GET'
    },
    {
      name: 'Governance API',
      url: 'https://governance-api.ness.workers.dev/health',
      method: 'GET'
    }
  ];

  const testIntegration = async (endpoint: any): Promise<IntegrationStatus> => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(endpoint.method === 'POST' && {
          body: JSON.stringify({ text: 'test', target_language: 'en' })
        })
      });

      const status: IntegrationStatus = {
        name: endpoint.name,
        url: endpoint.url,
        status: response.ok ? 'connected' : 'error',
        message: response.ok ? 'Service is responding' : `HTTP ${response.status}: ${response.statusText}`,
        lastChecked: new Date().toLocaleString()
      };

      return status;
    } catch (error) {
      return {
        name: endpoint.name,
        url: endpoint.url,
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toLocaleString()
      };
    }
  };

  const testAllIntegrations = async () => {
    setTesting(true);
    const results: IntegrationStatus[] = [];

    for (const endpoint of integrationEndpoints) {
      const result = await testIntegration(endpoint);
      results.push(result);
    }

    setIntegrations(results);
    setTesting(false);
  };

  useEffect(() => {
    testAllIntegrations();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="w-5 h-5 text-green-400" />;
      case 'disconnected':
        return <X className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-900/20 text-green-400 border-green-500/30">Connected</Badge>;
      case 'disconnected':
        return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-500/30">Disconnected</Badge>;
      case 'error':
        return <Badge className="bg-red-900/20 text-red-400 border-red-500/30">Error</Badge>;
      default:
        return <Badge className="bg-gray-900/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Integration Status
          </h1>
          <p className="text-[#9CA3AF] mt-2">Test all external integrations and services</p>
        </div>
        <Button
          onClick={testAllIntegrations}
          disabled={testing}
          className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
        >
          {testing ? 'Testing...' : 'Refresh All'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration, index) => (
          <Card key={index} className="bg-[#111317] border-[#1B2030]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#EEF1F6] text-lg flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  {integration.name}
                </CardTitle>
                {getStatusBadge(integration.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-[#9CA3AF]">URL:</span>
                <div className="text-[#EEF1F6] font-mono text-xs break-all">
                  {integration.url}
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-[#9CA3AF]">Status:</span>
                <div className="text-[#EEF1F6]">{integration.message}</div>
              </div>
              
              <div className="text-sm">
                <span className="text-[#9CA3AF]">Last Checked:</span>
                <div className="text-[#EEF1F6]">{integration.lastChecked}</div>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
                  onClick={() => window.open(integration.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Test URL
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00ADE8]" />
            Integration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {integrations.filter(i => i.status === 'connected').length}
              </div>
              <div className="text-[#9CA3AF] text-sm">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {integrations.filter(i => i.status === 'disconnected').length}
              </div>
              <div className="text-[#9CA3AF] text-sm">Disconnected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {integrations.filter(i => i.status === 'error').length}
              </div>
              <div className="text-[#9CA3AF] text-sm">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
