"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

export default function DashboardDefaultPage() {
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    open: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      const response = await fetch('https://api.ness.tec.br/vulnerabilities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const vulns = data.vulnerabilities || [];
        
        setStats({
          total: vulns.length,
          critical: vulns.filter((v: any) => v.severity === 'CRITICAL').length,
          high: vulns.filter((v: any) => v.severity === 'HIGH').length,
          open: vulns.filter((v: any) => v.status === 'open').length,
          resolved: vulns.filter((v: any) => v.status === 'resolved').length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-[#111317] border border-[#1B2030] rounded-lg p-6 hover:border-[#00ADE8]/30 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9CA3AF] mb-1">{title}</p>
          <p className={`text-3xl font-semibold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color === 'text-red-400' ? 'bg-red-900/20' : color === 'text-orange-400' ? 'bg-orange-900/20' : color === 'text-green-400' ? 'bg-green-900/20' : 'bg-[#00ADE8]/10'}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Dashboard
        </h1>
        <p className="text-[#9CA3AF] mt-2">Vulnerability lifecycle management overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vulnerabilities"
          value={stats.total}
          icon={Shield}
          color="text-[#00ADE8]"
        />
        <StatCard
          title="Critical Severity"
          value={stats.critical}
          icon={AlertTriangle}
          color="text-red-400"
        />
        <StatCard
          title="High Priority"
          value={stats.high}
          icon={TrendingUp}
          color="text-orange-400"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          color="text-green-400"
        />
      </div>

      <div className="bg-[#111317] border border-[#1B2030] rounded-lg p-6">
        <h2 className="text-xl font-medium text-[#EEF1F6] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/vulnerabilities/all"
            className="p-4 border border-[#1B2030] rounded-lg hover:border-[#00ADE8] hover:bg-[#111317] transition-all group"
          >
            <Shield className="w-8 h-8 text-[#00ADE8] mb-2" />
            <h3 className="text-[#EEF1F6] font-medium group-hover:text-[#00ADE8] transition-colors">
              View All Findings
            </h3>
            <p className="text-sm text-[#9CA3AF] mt-1">Browse all vulnerabilities</p>
          </a>
          
          <a
            href="/dashboard/vulnerabilities/critical"
            className="p-4 border border-[#1B2030] rounded-lg hover:border-red-400 hover:bg-[#111317] transition-all group"
          >
            <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
            <h3 className="text-[#EEF1F6] font-medium group-hover:text-red-400 transition-colors">
              Critical Issues
            </h3>
            <p className="text-sm text-[#9CA3AF] mt-1">Urgent attention required</p>
          </a>
          
          <a
            href="/dashboard/reports"
            className="p-4 border border-[#1B2030] rounded-lg hover:border-[#00ADE8] hover:bg-[#111317] transition-all group"
          >
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <h3 className="text-[#EEF1F6] font-medium group-hover:text-[#00ADE8] transition-colors">
              Generate Report
            </h3>
            <p className="text-sm text-[#9CA3AF] mt-1">Export findings data</p>
          </a>
        </div>
      </div>

      <div className="bg-[#111317] border border-[#1B2030] rounded-lg p-6">
        <h2 className="text-xl font-medium text-[#EEF1F6] mb-2">Welcome to n.Solve</h2>
        <p className="text-[#9CA3AF]">
          Your centralized platform for vulnerability lifecycle management. 
          Track, correlate, and resolve security findings across your entire infrastructure.
        </p>
      </div>
    </div>
  );
}
