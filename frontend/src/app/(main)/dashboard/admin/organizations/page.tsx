"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  max_users: number;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', domain: '', max_users: 10, subscription_plan: 'free' });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://admin-service.ness.workers.dev/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://admin-service.ness.workers.dev/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrg),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewOrg({ name: '', slug: '', domain: '', max_users: 10, subscription_plan: 'free' });
        fetchOrganizations();
      } else {
        alert('Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization');
    }
  };

  const deleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch(`https://admin-service.ness.workers.dev/organizations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchOrganizations();
      } else {
        alert('Failed to delete organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#9CA3AF]">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Organizations
          </h1>
          <p className="text-[#9CA3AF] mt-2">Manage multi-tenant organizations</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111317] border-[#1B2030]">
            <DialogHeader>
              <DialogTitle className="text-[#EEF1F6]">Create Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Name</Label>
                <Input
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({...newOrg, name: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Slug</Label>
                <Input
                  value={newOrg.slug}
                  onChange={(e) => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  placeholder="acme-corp"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Domain (optional)</Label>
                <Input
                  value={newOrg.domain}
                  onChange={(e) => setNewOrg({...newOrg, domain: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  placeholder="acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Max Users</Label>
                <Input
                  type="number"
                  value={newOrg.max_users}
                  onChange={(e) => setNewOrg({...newOrg, max_users: parseInt(e.target.value) || 10})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                />
              </div>
              <Button onClick={createOrganization} className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
                Create Organization
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <Card key={org.id} className="bg-[#111317] border-[#1B2030]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-[#EEF1F6] text-lg">{org.name}</CardTitle>
                  <p className="text-[#9CA3AF] text-sm mt-1">@{org.slug}</p>
                </div>
                <Badge className={org.is_active ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}>
                  {org.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {org.domain && (
                  <div className="text-sm">
                    <span className="text-[#9CA3AF]">Domain:</span>
                    <span className="text-[#EEF1F6] ml-2">{org.domain}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-[#9CA3AF]">Max Users:</span>
                  <span className="text-[#EEF1F6] ml-2">{org.max_users}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[#9CA3AF]">Plan:</span>
                  <Badge className="ml-2 bg-[#00ADE8]/20 text-[#00ADE8]">
                    {org.subscription_plan}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-[#1B2030] text-[#EEF1F6] hover:bg-[#151820]"
                    onClick={() => window.location.href = `/dashboard/admin/users`}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Users
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#1B2030] text-[#9CA3AF] hover:text-[#EEF1F6] hover:bg-[#151820]"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                    onClick={() => deleteOrganization(org.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card className="bg-[#111317] border-[#1B2030]">
          <CardContent className="py-12 text-center">
            <p className="text-[#9CA3AF]">No organizations found. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

