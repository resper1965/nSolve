"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Eye, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  cve?: string;
  cvss_score?: number;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [filteredVulns, setFilteredVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatingTicket, setCreatingTicket] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  useEffect(() => {
    filterVulnerabilities();
  }, [vulnerabilities, searchTerm, severityFilter, statusFilter]);

  const fetchVulnerabilities = async () => {
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
        setVulnerabilities(data.vulnerabilities || []);
      } else {
        // Mock data for development
        setVulnerabilities([
          {
            id: "1",
            title: "SQL Injection in Login Form",
            description: "Critical SQL injection vulnerability found in the login form allowing unauthorized access to the database.",
            severity: "CRITICAL",
            status: "open",
            cve: "CVE-2024-0001",
            cvss_score: 9.8,
            created_at: "2024-01-15T10:30:00Z",
            updated_at: "2024-01-15T10:30:00Z",
            tenant_id: "tenant-1"
          },
          {
            id: "2",
            title: "Cross-Site Scripting (XSS)",
            description: "Reflected XSS vulnerability in the search functionality that could lead to session hijacking.",
            severity: "HIGH",
            status: "in_progress",
            cve: "CVE-2024-0002",
            cvss_score: 7.5,
            created_at: "2024-01-14T14:20:00Z",
            updated_at: "2024-01-16T09:15:00Z",
            tenant_id: "tenant-1"
          },
          {
            id: "3",
            title: "Weak Password Policy",
            description: "Password policy allows weak passwords that can be easily brute-forced.",
            severity: "MEDIUM",
            status: "resolved",
            cve: "CVE-2024-0003",
            cvss_score: 5.2,
            created_at: "2024-01-13T16:45:00Z",
            updated_at: "2024-01-17T11:30:00Z",
            tenant_id: "tenant-1"
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJiraTicket = async (vuln: Vulnerability) => {
    if (creatingTicket) return;
    setCreatingTicket(vuln.id);
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://jira-integration.ness.workers.dev/jira/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vulnerability_id: vuln.id,
          action: 'create',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Jira ticket created!\n\nKey: ${data.data.jira_key}\nURL: ${data.data.url}`);
      } else {
        const error = await response.json();
        alert(`❌ Failed: ${error.error}\n\nPlease configure Jira in Settings → Integrations`);
      }
    } catch (error) {
      console.error('Error creating Jira ticket:', error);
      alert('❌ Failed to create Jira ticket.\n\nPlease configure Jira in Settings → Integrations first.');
    } finally {
      setCreatingTicket(null);
    }
  };

  const handleEditVulnerability = (id: string) => {
    // TODO: Implement edit functionality
    alert(`Edit vulnerability: ${id}`);
  };

  const handleDeleteVulnerability = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vulnerability?')) {
      return;
    }

    setDeleting(id);

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://core-processor.ness.workers.dev';
      
      const response = await fetch(`${apiUrl}/vulnerabilities/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setVulnerabilities(vulnerabilities.filter(v => v.id !== id));
        alert('Vulnerability deleted successfully');
      } else {
        alert('Failed to delete vulnerability');
      }
    } catch (error) {
      console.error('Error deleting vulnerability:', error);
      alert('Failed to delete vulnerability');
    } finally {
      setDeleting(null);
    }
  };

  const filterVulnerabilities = () => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(vuln => 
        vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.cve?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(vuln => vuln.severity === severityFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(vuln => vuln.status === statusFilter);
    }

    setFilteredVulns(filtered);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-900/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-green-900/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-900/20 text-red-400';
      case 'in_progress': return 'bg-yellow-900/20 text-yellow-400';
      case 'resolved': return 'bg-green-900/20 text-green-400';
      case 'closed': return 'bg-gray-900/20 text-gray-400';
      default: return 'bg-gray-900/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9CA3AF]">Loading vulnerabilities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Vulnerabilities
          </h1>
          <p className="text-[#9CA3AF] mt-2">Manage and track security vulnerabilities</p>
        </div>
        <Button 
          className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
          onClick={() => window.location.href = '/dashboard/vulnerabilities/new'}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Vulnerability
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <CardTitle className="text-[#EEF1F6]">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
              <Input
                placeholder="Search vulnerabilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-[#111317] border-[#1B2030]">
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111317] border-[#1B2030]">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vulnerabilities List */}
      <div className="space-y-4">
        {filteredVulns.length === 0 ? (
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-[#9CA3AF]">No vulnerabilities found</p>
            </CardContent>
          </Card>
        ) : (
          filteredVulns.map((vuln) => (
            <Card key={vuln.id} className="bg-[#111317] border-[#1B2030] hover:border-[#00ADE8]/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-[#EEF1F6]">{vuln.title}</h3>
                      <Badge className={getSeverityColor(vuln.severity)}>
                        {vuln.severity}
                      </Badge>
                      <Badge className={getStatusColor(vuln.status)}>
                        {vuln.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-[#9CA3AF] mb-3">{vuln.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-[#9CA3AF]">
                      {vuln.cve && (
                        <span>CVE: {vuln.cve}</span>
                      )}
                      {vuln.cvss_score && (
                        <span>CVSS: {vuln.cvss_score}</span>
                      )}
                      <span>Created: {new Date(vuln.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#9CA3AF] hover:text-[#EEF1F6]"
                      onClick={() => handleCreateJiraTicket(vuln)}
                      title="Create Jira Ticket"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#9CA3AF] hover:text-[#EEF1F6]"
                      onClick={() => handleEditVulnerability(vuln.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#9CA3AF] hover:text-red-400"
                      onClick={() => handleDeleteVulnerability(vuln.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}