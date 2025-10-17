import { ReactNode } from "react";
import { Shield, Zap, Lock, Globe } from "lucide-react";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh lg:grid-cols-2">
        {/* Right Panel - System Overview */}
        <div className="relative order-2 hidden h-full bg-gradient-to-br from-[#0B0C0E] via-[#111317] to-[#0B0C0E] lg:flex lg:flex-col lg:justify-between p-12 border-l border-[#1B2030]">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-baseline gap-1 text-4xl font-medium">
              <span className="text-[#EEF1F6]">n</span>
              <span className="text-[#00ADE8]">.</span>
              <span className="text-[#EEF1F6]">Solve</span>
            </div>
            <p className="text-[#9CA3AF] text-lg">Vulnerability Lifecycle Manager</p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-medium text-[#EEF1F6] mb-6">
                Centralize. Correlate. Resolve.
              </h2>
              <p className="text-[#9CA3AF] leading-relaxed">
                A comprehensive platform for managing security vulnerabilities across your entire infrastructure. 
                Intelligent automation, multi-tenant architecture, and seamless integration with your existing tools.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00ADE8]" strokeWidth={1.5} />
                  <h3 className="text-[#EEF1F6] font-medium">Unified Dashboard</h3>
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  Consolidate findings from multiple security tools into a single view
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00ADE8]" strokeWidth={1.5} />
                  <h3 className="text-[#EEF1F6] font-medium">Smart Correlation</h3>
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  Automatically correlate duplicate findings across tools and time
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#00ADE8]" strokeWidth={1.5} />
                  <h3 className="text-[#EEF1F6] font-medium">Enterprise Security</h3>
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  Multi-tenant RBAC with granular permissions and audit logging
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#00ADE8]" strokeWidth={1.5} />
                  <h3 className="text-[#EEF1F6] font-medium">AI Translation</h3>
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  Automatic translation of findings powered by Cloudflare AI
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-4 border-t border-[#1B2030] pt-8">
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-[#9CA3AF]">All systems operational</span>
              </div>
              <div className="text-[#9CA3AF]">Powered by Cloudflare Edge</div>
            </div>
            <div className="text-xs text-[#9CA3AF]">
              © {new Date().getFullYear()} <span className="text-[#EEF1F6]">ness</span>
              <span className="text-[#00ADE8]">.</span> All rights reserved.
            </div>
          </div>
        </div>

        {/* Left Panel - Auth Form */}
        <div className="relative order-1 flex h-full bg-[#0B0C0E]">{children}</div>
      </div>
    </main>
  );
}
