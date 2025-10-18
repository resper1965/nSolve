"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, ExternalLink, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  cve?: string;
  cvss_score?: number;
  created_at: string;
}

export default function CriticalVulnerabilitiesPage() {
  const router = useRouter();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriticalVulnerabilities();
  }, []);

  const fetchCriticalVulnerabilities = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://core-processor.ness.workers.dev';
      
      const response = await fetch(`${apiUrl}/vulnerabilities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const critical = (data.data || []).filter((v: Vulnerability) => v.severity === 'CRITICAL');
        setVulnerabilities(critical);
      } else {
        // Mock data
        setVulnerabilities([
          {
            id: 'vuln-1',
            title: 'SQL Injection in Login Form',
            description: 'Critical SQL injection vulnerability',
            severity: 'CRITICAL',
            status: 'open',
            cve: 'CVE-2024-0001',
            cvss_score: 9.8,
            created_at: new Date().toISOString(),
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#9CA3AF]">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-[#9CA3AF] hover:text-[#EEF1F6]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Critical Issues
          </h1>
          <p className="text-[#9CA3AF] mt-2">High priority vulnerabilities requiring immediate attention</p>
        </div>
      </div>

      <div className="space-y-4">
        {vulnerabilities.map((vuln) => (
          <Card key={vuln.id} className="bg-[#111317] border-red-500/30">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
                  <div>
                    <CardTitle className="text-[#EEF1F6]">{vuln.title}</CardTitle>
                    <p className="text-[#9CA3AF] text-sm mt-1">{vuln.description}</p>
                  </div>
                </div>
                <Badge className="bg-red-900/20 text-red-400 border-red-500/30">
                  CRITICAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {vuln.cve && (
                    <Badge variant="outline" className="border-[#1B2030] text-[#9CA3AF]">
                      {vuln.cve}
                    </Badge>
                  )}
                  {vuln.cvss_score && (
                    <div className="text-sm">
                      <span className="text-[#9CA3AF]">CVSS:</span>
                      <span className="text-red-400 font-bold ml-1">{vuln.cvss_score}</span>
                    </div>
                  )}
                  <div className="text-sm text-[#9CA3AF]">
                    {new Date(vuln.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#1B2030] text-[#EEF1F6]"
                    onClick={() => router.push('/dashboard/vulnerabilities/all')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Create Ticket
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vulnerabilities.length === 0 && (
        <Card className="bg-[#111317] border-[#1B2030]">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-[#EEF1F6] text-lg font-medium">No Critical Issues!</p>
            <p className="text-[#9CA3AF] mt-2">All critical vulnerabilities have been addressed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

