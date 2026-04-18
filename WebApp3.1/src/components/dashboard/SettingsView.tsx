import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import {
  Settings,
  Users,
  CreditCard,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Plus,
  Trash2,
  Edit,
  Copy,
  Check,
  X,
  MoreHorizontal,
  ExternalLink,
  Download,
  Upload,
  Zap,
  Database,
  Webhook,
  Code,
  Mail,
  Smartphone,
  Scale,
  Moon,
  AlertTriangle,
  FileText,
  Lock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

const teamMembers = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah@contentflow.com",
    role: "Admin",
    status: "active",
    lastActive: "2 minutes ago",
    joinedDate: "2024-01-15",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face"
  },
  {
    id: 2,
    name: "Marcus Rodriguez",
    email: "marcus@contentflow.com",
    role: "Editor",
    status: "active",
    lastActive: "1 hour ago",
    joinedDate: "2024-02-20",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
  },
  {
    id: 3,
    name: "Emily Johnson",
    email: "emily@contentflow.com",
    role: "Viewer",
    status: "active",
    lastActive: "3 hours ago",
    joinedDate: "2024-03-10",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face"
  },
  {
    id: 4,
    name: "David Kim",
    email: "david@contentflow.com",
    role: "Editor",
    status: "pending",
    lastActive: "Never",
    joinedDate: "2024-12-15",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face"
  }
];

const integrations = [
  {
    id: 1,
    name: "Firebase",
    description: "Authentication and real-time database",
    category: "Backend",
    status: "connected",
    icon: <Database className="w-8 h-8 text-orange-500" />,
    lastSync: "2 minutes ago",
    config: { apiKey: "****-****-****-1234", projectId: "contentflow-prod" }
  },
  {
    id: 2,
    name: "Segment",
    description: "Customer data platform and analytics",
    category: "Analytics",
    status: "connected",
    icon: <Zap className="w-8 h-8 text-green-500" />,
    lastSync: "5 minutes ago",
    config: { writeKey: "****-****-****-5678" }
  },
  {
    id: 3,
    name: "Webhook",
    description: "Custom webhook endpoints for real-time events",
    category: "Developer",
    status: "configured",
    icon: <Webhook className="w-8 h-8 text-blue-500" />,
    lastSync: "1 hour ago",
    config: { endpoint: "https://api.yourapp.com/webhook" }
  },
  {
    id: 4,
    name: "Slack",
    description: "Team notifications and updates",
    category: "Communication",
    status: "disconnected",
    icon: <Bell className="w-8 h-8 text-purple-500" />,
    lastSync: "Never",
    config: {}
  }
];

const apiKeys = [
  {
    id: 1,
    name: "Production SDK",
    key: "cf_prod_****_****_****_1234",
    created: "2024-01-15",
    lastUsed: "2 minutes ago",
    permissions: ["read", "write"],
    environment: "production"
  },
  {
    id: 2,
    name: "Development SDK",
    key: "cf_dev_****_****_****_5678",
    created: "2024-01-15",
    lastUsed: "1 hour ago",
    permissions: ["read", "write"],
    environment: "development"
  },
  {
    id: 3,
    name: "Analytics Only",
    key: "cf_analytics_****_****_9012",
    created: "2024-02-10",
    lastUsed: "1 day ago",
    permissions: ["read"],
    environment: "production"
  }
];

export default function SettingsView() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: true,
    security: true
  });

  const [billing] = useState({
    plan: "Professional",
    status: "active",
    nextBilling: "2025-02-06",
    usage: {
      campaigns: { current: 12, limit: 50 },
      users: { current: 4, limit: 10 },
      storage: { current: 2.3, limit: 10 },
      apiCalls: { current: 45620, limit: 100000 }
    }
  });

  // ─── Compliance / PDPL state ────────────────────────────────────────────────
  const [compliance, setCompliance] = useState({
    requireMarketingConsent: true,
    requireChannelConsent: true,
    requireLocationConsent: false,
    pdplEnforcement: true,
    defaultLanguage: 'ar',
    defaultTimezone: 'Asia/Riyadh',
    dataResidency: 'sa',
    reviewRequired: true,
    prayerBlackoutDefault: false,
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'configured': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'disconnected': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="compliance" className="text-amber-700 dark:text-amber-400">
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input id="org-name" defaultValue="ContentFlow Inc." className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="org-domain">Domain</Label>
                  <Input id="org-domain" defaultValue="contentflow.com" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="org-timezone">Timezone</Label>
                  <Select defaultValue="pst">
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pst">Pacific Standard Time</SelectItem>
                      <SelectItem value="est">Eastern Standard Time</SelectItem>
                      <SelectItem value="gmt">Greenwich Mean Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="org-language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Notification Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive campaign updates via email</p>
                    </div>
                    <Switch 
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch 
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Marketing Updates</p>
                      <p className="text-xs text-muted-foreground">Product updates and feature announcements</p>
                    </div>
                    <Switch 
                      checked={notifications.marketing}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Security Alerts</p>
                      <p className="text-xs text-muted-foreground">Important security notifications</p>
                    </div>
                    <Switch 
                      checked={notifications.security}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, security: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management */}
        <TabsContent value="team" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members ({teamMembers.length})</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-foreground">{member.name}</h4>
                          <Badge variant="outline" className={getRoleColor(member.role)}>
                            {member.role}
                          </Badge>
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {member.lastActive} • Joined {member.joinedDate}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Admin</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Create campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Edit campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Delete campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Manage team</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>View analytics</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Manage integrations</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Billing access</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>API keys</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Editor</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Create campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Edit campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Delete campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Manage team</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>View analytics</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Manage integrations</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Billing access</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>API keys</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Viewer</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Create campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Edit campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Delete campaigns</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Manage team</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>View analytics</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Manage integrations</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>Billing access</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <X className="w-3 h-3 text-red-500" />
                      <span>API keys</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>App Integrations</CardTitle>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Integrations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                  <Card key={integration.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {integration.icon}
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {integration.category}
                      </Badge>
                      {integration.lastSync !== "Never" && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {integration.lastSync}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {integration.status === 'connected' || integration.status === 'configured' ? (
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Settings className="w-3 h-3 mr-1" />
                            Configure
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm">
                          Connect
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Keys</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground">{apiKey.name}</h4>
                        <Badge variant="outline" className={
                          apiKey.environment === 'production' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }>
                          {apiKey.environment}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {apiKey.key}
                        </code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>Created: {apiKey.created}</span>
                        <span>Last used: {apiKey.lastUsed}</span>
                        <span>Permissions: {apiKey.permissions.join(', ')}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Key
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revoke Key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">SDK Integration</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Use these code snippets to integrate ContentFlow with your app.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">JavaScript</Label>
                    <div className="bg-background border rounded p-3 mt-1">
                      <code className="text-xs font-mono">
                        {`import ContentFlow from '@contentflow/sdk';

const cf = new ContentFlow({
  apiKey: 'your-api-key-here'
});`}
                      </code>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">iOS (Swift)</Label>
                    <div className="bg-background border rounded p-3 mt-1">
                      <code className="text-xs font-mono">
                        {`import ContentFlow

ContentFlow.configure(apiKey: "your-api-key-here")`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{billing.plan}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {billing.status} • Next billing: {billing.nextBilling}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">$99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-4">Usage Overview</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Active Campaigns</span>
                        <span className="text-sm font-medium">
                          {billing.usage.campaigns.current} / {billing.usage.campaigns.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(billing.usage.campaigns.current / billing.usage.campaigns.limit) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Team Members</span>
                        <span className="text-sm font-medium">
                          {billing.usage.users.current} / {billing.usage.users.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(billing.usage.users.current / billing.usage.users.limit) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Storage (GB)</span>
                        <span className="text-sm font-medium">
                          {billing.usage.storage.current} / {billing.usage.storage.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(billing.usage.storage.current / billing.usage.storage.limit) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">API Calls</span>
                        <span className="text-sm font-medium">
                          {billing.usage.apiCalls.current.toLocaleString()} / {billing.usage.apiCalls.limit.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(billing.usage.apiCalls.current / billing.usage.apiCalls.limit) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-4">Billing Actions</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Update Payment Method
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoices
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start">
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start text-destructive">
                      <X className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">Authenticator App</p>
                    <p className="text-xs text-muted-foreground">Use an app like Google Authenticator</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Enabled
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Login Sessions</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Chrome on macOS</p>
                        <p className="text-xs text-muted-foreground">San Francisco, CA • Active now</p>
                      </div>
                    </div>
                    <Badge variant="default">Current</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Mobile App</p>
                        <p className="text-xs text-muted-foreground">iPhone • 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Account Actions</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Account Data
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Compliance / PDPL ────────────────────────────────────────────────── */}
        <TabsContent value="compliance" className="space-y-6">

          {/* PDPL notice banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Saudi Arabia Personal Data Protection Law (PDPL)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                These settings control how ContentFlow enforces consent requirements for Saudi users in
                accordance with the PDPL (نظام حماية البيانات الشخصية). Changes take effect for new campaigns.
              </p>
            </div>
          </div>

          {/* Consent enforcement */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <CardTitle>Consent Enforcement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Require Marketing Consent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only deliver campaigns to users who have opted in to marketing communications.
                    Applies to all channels.
                  </p>
                </div>
                <Switch
                  checked={compliance.requireMarketingConsent}
                  onCheckedChange={(v) => setCompliance(p => ({ ...p, requireMarketingConsent: v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Require Channel-Specific Consent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enforce per-channel consent (push, SMS, WhatsApp) before delivering on those channels.
                    Recommended for PDPL compliance.
                  </p>
                </div>
                <Switch
                  checked={compliance.requireChannelConsent}
                  onCheckedChange={(v) => setCompliance(p => ({ ...p, requireChannelConsent: v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Require Location Consent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Block geo-targeted campaigns for users who have not consented to location tracking.
                  </p>
                </div>
                <Switch
                  checked={compliance.requireLocationConsent}
                  onCheckedChange={(v) => setCompliance(p => ({ ...p, requireLocationConsent: v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                    PDPL Opt-Out Enforcement
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Always exclude users who have exercised their PDPL opt-out right. Cannot be disabled.
                  </p>
                </div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300">
                  Always On
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Campaign approval */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle>Campaign Approval Workflow</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Require Admin Approval Before Publishing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Editors must submit campaigns for review. Admins approve before campaigns go live.
                    Recommended for regulated industries.
                  </p>
                </div>
                <Switch
                  checked={compliance.reviewRequired}
                  onCheckedChange={(v) => setCompliance(p => ({ ...p, reviewRequired: v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Default Prayer-Time Blackout</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically enable prayer-time blackout on all new campaigns. Editors can override per campaign.
                  </p>
                </div>
                <Switch
                  checked={compliance.prayerBlackoutDefault}
                  onCheckedChange={(v) => setCompliance(p => ({ ...p, prayerBlackoutDefault: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Regional defaults */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                <CardTitle>Regional Defaults</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select
                    value={compliance.defaultLanguage}
                    onValueChange={(v) => setCompliance(p => ({ ...p, defaultLanguage: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">🇸🇦 Arabic (العربية)</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Content tab shown first in campaign editor
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Timezone</Label>
                  <Select
                    value={compliance.defaultTimezone}
                    onValueChange={(v) => setCompliance(p => ({ ...p, defaultTimezone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">Arabia Standard Time (AST +3)</SelectItem>
                      <SelectItem value="Asia/Dubai">Gulf Standard Time (GST +4)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pre-filled when creating a new campaign
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Data Residency</Label>
                  <Select
                    value={compliance.dataResidency}
                    onValueChange={(v) => setCompliance(p => ({ ...p, dataResidency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sa">🇸🇦 Saudi Arabia</SelectItem>
                      <SelectItem value="ae">🇦🇪 UAE</SelectItem>
                      <SelectItem value="eu">🇪🇺 EU</SelectItem>
                      <SelectItem value="us">🇺🇸 US</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Region where user data is stored
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Save Compliance Settings</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}