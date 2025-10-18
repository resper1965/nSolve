"use client";

import { useState } from "react";
import { Download, FileText, Calendar, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("summary");
  const [dateRange, setDateRange] = useState("30d");
  const [format, setFormat] = useState("pdf");

  const generateReport = async () => {
    // Implement report generation logic
    console.log('Generating report:', { reportType, dateRange, format });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Reports
        </h1>
        <p className="text-[#9CA3AF] mt-2">Generate and export vulnerability reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00ADE8]" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111317] border-[#1B2030]">
                      <SelectItem value="summary">Executive Summary</SelectItem>
                      <SelectItem value="detailed">Detailed Report</SelectItem>
                      <SelectItem value="critical">Critical Issues Only</SelectItem>
                      <SelectItem value="trends">Trend Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111317] border-[#1B2030]">
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Export Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111317] border-[#1B2030]">
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Include Charts</Label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-[#9CA3AF] text-sm">Include visual charts and graphs</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateReport}
                className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#00ADE8]" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total Vulnerabilities</span>
                <span className="text-[#EEF1F6] font-semibold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Critical Issues</span>
                <span className="text-red-400 font-semibold">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Resolved</span>
                <span className="text-green-400 font-semibold">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Open</span>
                <span className="text-yellow-400 font-semibold">8</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6]">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 border border-[#1B2030] rounded">
                <div>
                  <p className="text-[#EEF1F6] text-sm">Executive Summary</p>
                  <p className="text-[#9CA3AF] text-xs">Jan 15, 2024</p>
                </div>
                <Button size="sm" variant="ghost" className="text-[#9CA3AF] hover:text-[#EEF1F6]">
                  <Download className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 border border-[#1B2030] rounded">
                <div>
                  <p className="text-[#EEF1F6] text-sm">Critical Issues</p>
                  <p className="text-[#9CA3AF] text-xs">Jan 10, 2024</p>
                </div>
                <Button size="sm" variant="ghost" className="text-[#9CA3AF] hover:text-[#EEF1F6]">
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
