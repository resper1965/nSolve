"use client";

import { useState } from "react";
import { Settings, User, Shield, Bell, Database, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "Resper Silva",
    email: "resper@ness.com.br",
    role: "Admin",
    tenant: "ness.tec.br"
  });

  const [notifications, setNotifications] = useState({
    email: true,
    critical: true,
    updates: false,
    reports: true
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: "30",
    passwordExpiry: "90"
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Settings
        </h1>
        <p className="text-[#9CA3AF] mt-2">Manage your account and system preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-[#111317] border-[#1B2030]">
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#00ADE8] data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#00ADE8] data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-[#00ADE8] data-[state=active]:text-white">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-[#00ADE8] data-[state=active]:text-white">
            <Database className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <User className="w-5 h-5 text-[#00ADE8]" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Email</Label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Role</Label>
                  <Input
                    value={profile.role}
                    disabled
                    className="bg-[#0A0B0F] border-[#1B2030] text-[#9CA3AF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#EEF1F6]">Tenant</Label>
                  <Input
                    value={profile.tenant}
                    disabled
                    className="bg-[#0A0B0F] border-[#1B2030] text-[#9CA3AF]"
                  />
                </div>
              </div>
              <Button className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#00ADE8]" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EEF1F6] font-medium">Email Notifications</p>
                  <p className="text-[#9CA3AF] text-sm">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EEF1F6] font-medium">Critical Alerts</p>
                  <p className="text-[#9CA3AF] text-sm">Immediate alerts for critical vulnerabilities</p>
                </div>
                <Switch
                  checked={notifications.critical}
                  onCheckedChange={(checked) => setNotifications({...notifications, critical: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EEF1F6] font-medium">System Updates</p>
                  <p className="text-[#9CA3AF] text-sm">Notifications about system updates</p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) => setNotifications({...notifications, updates: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EEF1F6] font-medium">Report Generation</p>
                  <p className="text-[#9CA3AF] text-sm">Notifications when reports are ready</p>
                </div>
                <Switch
                  checked={notifications.reports}
                  onCheckedChange={(checked) => setNotifications({...notifications, reports: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00ADE8]" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EEF1F6] font-medium">Two-Factor Authentication</p>
                  <p className="text-[#9CA3AF] text-sm">Add an extra layer of security</p>
                </div>
                <Switch
                  checked={security.twoFactor}
                  onCheckedChange={(checked) => setSecurity({...security, twoFactor: checked})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Session Timeout (minutes)</Label>
                <Input
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({...security, sessionTimeout: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Password Expiry (days)</Label>
                <Input
                  value={security.passwordExpiry}
                  onChange={(e) => setSecurity({...security, passwordExpiry: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                />
              </div>
              <Button className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
                Update Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <Database className="w-5 h-5 text-[#00ADE8]" />
                External Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[#1B2030] rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#00ADE8]/10 rounded flex items-center justify-center">
                    <Key className="w-4 h-4 text-[#00ADE8]" />
                  </div>
                  <div>
                    <p className="text-[#EEF1F6] font-medium">Jira Integration</p>
                    <p className="text-[#9CA3AF] text-sm">Connect with Jira for ticket management</p>
                  </div>
                </div>
                <Button variant="outline" className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-[#1B2030] rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#00ADE8]/10 rounded flex items-center justify-center">
                    <Database className="w-4 h-4 text-[#00ADE8]" />
                  </div>
                  <div>
                    <p className="text-[#EEF1F6] font-medium">Webhook Endpoints</p>
                    <p className="text-[#9CA3AF] text-sm">Configure webhook receivers</p>
                  </div>
                </div>
                <Button variant="outline" className="border-[#1B2030] text-[#EEF1F6] hover:bg-[#111317]">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
