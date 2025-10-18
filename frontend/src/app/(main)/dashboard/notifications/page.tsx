"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'notif-1',
      type: 'critical',
      title: 'New Critical Vulnerability Detected',
      message: 'SQL Injection found in login form requiring immediate attention.',
      read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      type: 'success',
      title: 'Jira Ticket Created',
      message: 'Successfully created ticket VULN-123 for vulnerability CVE-2024-0001.',
      read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-3',
      type: 'info',
      title: 'Weekly Report Ready',
      message: 'Your weekly vulnerability report is ready for review.',
      read: true,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const [settings, setSettings] = useState({
    email: true,
    critical: true,
    updates: false,
    reports: true,
  });

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-900/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
      case 'info': return 'bg-blue-900/20 text-blue-400 border-blue-500/30';
      case 'success': return 'bg-green-900/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-500/30';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Notifications
          </h1>
          <p className="text-[#9CA3AF] mt-2">Manage your alerts and updates</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" className="border-[#1B2030] text-[#EEF1F6]">
            <Check className="w-4 h-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications List */}
        <div className="lg:col-span-2 space-y-4">
          {notifications.map((notif) => (
            <Card key={notif.id} className={`bg-[#111317] border-[#1B2030] ${!notif.read ? 'border-l-4 border-l-[#00ADE8]' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getIcon(notif.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[#EEF1F6] font-medium">{notif.title}</h3>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-[#00ADE8] rounded-full"></div>
                        )}
                      </div>
                      <p className="text-[#9CA3AF] text-sm">{notif.message}</p>
                      <p className="text-[#9CA3AF] text-xs mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getBadgeColor(notif.type)}>
                    {notif.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {!notif.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(notif.id)}
                      className="border-[#1B2030] text-[#EEF1F6]"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark as read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteNotification(notif.id)}
                    className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {notifications.length === 0 && (
            <Card className="bg-[#111317] border-[#1B2030]">
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-[#EEF1F6] text-lg font-medium">No notifications</p>
                <p className="text-[#9CA3AF] mt-2">You're all caught up!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notification Settings */}
        <div>
          <Card className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#00ADE8]" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-[#EEF1F6] font-medium">Email Notifications</Label>
                  <p className="text-[#9CA3AF] text-sm">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.email}
                  onCheckedChange={(checked) => setSettings({...settings, email: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-[#EEF1F6] font-medium">Critical Alerts</Label>
                  <p className="text-[#9CA3AF] text-sm">Immediate alerts for critical issues</p>
                </div>
                <Switch
                  checked={settings.critical}
                  onCheckedChange={(checked) => setSettings({...settings, critical: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-[#EEF1F6] font-medium">System Updates</Label>
                  <p className="text-[#9CA3AF] text-sm">Notifications about updates</p>
                </div>
                <Switch
                  checked={settings.updates}
                  onCheckedChange={(checked) => setSettings({...settings, updates: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-[#EEF1F6] font-medium">Report Generation</Label>
                  <p className="text-[#9CA3AF] text-sm">When reports are ready</p>
                </div>
                <Switch
                  checked={settings.reports}
                  onCheckedChange={(checked) => setSettings({...settings, reports: checked})}
                />
              </div>

              <Button className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#111317] border-[#1B2030] mt-6">
            <CardHeader>
              <CardTitle className="text-[#EEF1F6]">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Total</span>
                <span className="text-[#EEF1F6] font-semibold">{notifications.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Unread</span>
                <span className="text-[#00ADE8] font-semibold">{unreadCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Critical</span>
                <span className="text-red-400 font-semibold">
                  {notifications.filter(n => n.type === 'critical').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

