"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, CreateVulnerabilityRequest } from "@/lib/api";

export default function NewVulnerabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateVulnerabilityRequest>({
    title: "",
    description: "",
    severity: "MEDIUM",
    cve: "",
    cvss_score: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.createVulnerability(formData);
      
      if (response.success) {
        router.push('/dashboard/vulnerabilities/all');
      } else {
        console.error('Failed to create vulnerability:', response.error);
        // Handle error (show toast, etc.)
      }
    } catch (error) {
      console.error('Error creating vulnerability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateVulnerabilityRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> New Vulnerability
          </h1>
          <p className="text-[#9CA3AF] mt-2">Create a new security vulnerability record</p>
        </div>
      </div>

      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#00ADE8]" />
            Vulnerability Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#EEF1F6]">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter vulnerability title"
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity" className="text-[#EEF1F6]">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => handleInputChange('severity', value)}
                >
                  <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111317] border-[#1B2030]">
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#EEF1F6]">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the vulnerability in detail..."
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6] min-h-[120px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cve" className="text-[#EEF1F6]">CVE ID</Label>
                <Input
                  id="cve"
                  value={formData.cve}
                  onChange={(e) => handleInputChange('cve', e.target.value)}
                  placeholder="CVE-2024-0000"
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvss_score" className="text-[#EEF1F6]">CVSS Score</Label>
                <Input
                  id="cvss_score"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.cvss_score || ''}
                  onChange={(e) => handleInputChange('cvss_score', parseFloat(e.target.value) || undefined)}
                  placeholder="7.5"
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-[#1B2030]">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Vulnerability
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
