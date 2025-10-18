"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Eye, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Vulnerability {
  id: string;
  title: string;
  raw_title?: string;
  title_user_edited?: string;
  description: string;
  severity: string;
  status: string;
  status_vlm?: string;
  cve?: string;
  cvss_score?: number;
  created_at: string;
  mitigated_date?: string;
}

export default function ResolvedVulnerabilitiesPage() {
  const router = useRouter();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResolvedVulnerabilities();
  }, []);

  const fetchResolvedVulnerabilities = async () => {
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
        const resolved = (data.vulnerabilities || data.data || []).filter(
          (v: Vulnerability) => 
            v.status_vlm === 'INACTIVE_MITIGATED' || 
            v.status === 'resolved' || 
            v.status === 'closed'
        );
        setVulnerabilities(resolved);
      }
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-900/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-900/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-blue-900/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-500/30';
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
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Resolved Issues
          </h1>
          <p className="text-[#9CA3AF] mt-2">Vulnerabilities that have been successfully mitigated or closed</p>
        </div>
      </div>

      <div className="space-y-4">
        {vulnerabilities.map((vuln) => (
          <Card key={vuln.id} className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <CardTitle className="text-[#EEF1F6]">
                      {vuln.title_user_edited || vuln.raw_title || vuln.title}
                    </CardTitle>
                    <p className="text-[#9CA3AF] text-sm mt-1">{vuln.description?.substring(0, 150)}...</p>
                  </div>
                </div>
                <Badge className={getSeverityColor(vuln.severity)}>
                  {vuln.severity?.toUpperCase() || 'UNKNOWN'}
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
                      <span className="text-[#EEF1F6] font-bold ml-1">{vuln.cvss_score}</span>
                    </div>
                  )}
                  {vuln.mitigated_date && (
                    <div className="text-sm">
                      <span className="text-[#9CA3AF]">Resolved:</span>
                      <span className="text-green-400 ml-1">
                        {new Date(vuln.mitigated_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <Badge className="bg-green-900/20 text-green-400 border-green-500/30">
                    {vuln.status_vlm || vuln.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#1B2030] text-[#EEF1F6]"
                    onClick={() => router.push(`/dashboard/vulnerabilities/${vuln.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
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
            <CheckCircle className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
            <p className="text-[#EEF1F6] text-lg font-medium">No Resolved Issues Found</p>
            <p className="text-[#9CA3AF] mt-2">Resolved vulnerabilities will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

