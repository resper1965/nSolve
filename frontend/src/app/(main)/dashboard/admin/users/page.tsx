"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Mail, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_platform_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUser, setNewUser] = useState({ email: '', name: '', role_name: 'User' });
  const [currentOrgId, setCurrentOrgId] = useState<string>('');

  useEffect(() => {
    // Get org ID from JWT
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentOrgId(payload.organization_id);
        fetchUsers(payload.organization_id);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  const fetchUsers = async (orgId: string) => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch(`https://admin-service.ness.workers.dev/organizations/${orgId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch(`https://admin-service.ness.workers.dev/organizations/${currentOrgId}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewUser({ email: '', name: '', role_name: 'User' });
        fetchUsers(currentOrgId);
      } else {
        alert('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch(`https://admin-service.ness.workers.dev/organizations/${currentOrgId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchUsers(currentOrgId);
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#9CA3AF]">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-[#EEF1F6]">
            <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Users
          </h1>
          <p className="text-[#9CA3AF] mt-2">Manage organization users and roles</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111317] border-[#1B2030]">
            <DialogHeader>
              <DialogTitle className="text-[#EEF1F6]">Add User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Name</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#EEF1F6]">Role</Label>
                <Select value={newUser.role_name} onValueChange={(value) => setNewUser({...newUser, role_name: value})}>
                  <SelectTrigger className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111317] border-[#1B2030]">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createUser} className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white">
                Add User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[#111317] border-[#1B2030]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#EEF1F6]">Users ({filteredUsers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border border-[#1B2030] rounded hover:bg-[#151820]">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#00ADE8]/20 flex items-center justify-center">
                    <span className="text-[#00ADE8] font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[#EEF1F6] font-medium">{user.name}</p>
                      {user.is_platform_admin && (
                        <Badge className="bg-purple-900/20 text-purple-400">
                          <Shield className="w-3 h-3 mr-1" />
                          Platform Admin
                        </Badge>
                      )}
                      <Badge className={user.is_active ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-[#9CA3AF] text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      <Badge className="bg-[#00ADE8]/20 text-[#00ADE8]">{user.role}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    onClick={() => deleteUser(user.id)}
                    disabled={user.is_platform_admin}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-[#9CA3AF]">
              {searchTerm ? 'No users found matching your search.' : 'No users found. Add your first user!'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

