"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Vulnerability {
  id: string;
  correlation_key: string;
  vulnerability_type: string;
  severity: string;
  status: string;
  url_target: string;
  affected_param: string;
  tool_source: string;
  created_at: string;
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  const fetchVulnerabilities = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://core-processor.ness.workers.dev';
      
      const response = await fetch(`${apiUrl}/vulnerabilities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVulnerabilities(data.vulnerabilities || []);
      }
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'CRITICAL': 'bg-red-900/20 text-red-400 border-red-800',
      'HIGH': 'bg-orange-900/20 text-orange-400 border-orange-800',
      'MEDIUM': 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
      'LOW': 'bg-blue-900/20 text-blue-400 border-blue-800',
      'INFORMATIONAL': 'bg-gray-700/20 text-gray-400 border-gray-700',
    };
    return colors[severity] || colors.INFORMATIONAL;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-[#9CA3AF]">Loading vulnerabilities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">Vulnerabilities</h1>
        <p className="text-[#9CA3AF] mt-2">Manage and track security findings across your infrastructure</p>
      </div>

      <div className="bg-[#111317] border border-[#1B2030] rounded-lg">
        <div className="p-6 border-b border-[#1B2030]">
          <h2 className="text-lg font-medium text-[#EEF1F6]">All Findings</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">{vulnerabilities.length} vulnerabilities found</p>
        </div>

        <div className="divide-y divide-[#1B2030]">
          {vulnerabilities.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="text-[#9CA3AF]">No vulnerabilities found</p>
              <p className="text-sm text-[#9CA3AF] mt-2">Start by sending data to the webhook endpoint</p>
            </div>
          ) : (
            vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="p-4 hover:bg-[#111317] transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(vuln.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[#EEF1F6] font-medium">{vuln.vulnerability_type}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[#9CA3AF] mb-2">{vuln.url_target}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
                      <span>Parameter: {vuln.affected_param}</span>
                      <span>•</span>
                      <span>Source: {vuln.tool_source}</span>
                      <span>•</span>
                      <span>{new Date(vuln.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

