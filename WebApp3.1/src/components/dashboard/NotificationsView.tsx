import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  MoreHorizontal,
  Archive,
  Star,
  Clock,
  User,
  Activity,
  Zap,
  Shield,
  TrendingUp,
  Settings,
  Mail,
  Smartphone,
  Plus
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

const notifications = [
  {
    id: 1,
    type: 'success',
    title: 'Campaign Published Successfully',
    message: 'Your "Summer Sale Banner" campaign is now live and reaching users.',
    timestamp: '2 minutes ago',
    read: false,
    category: 'campaign',
    actor: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face',
    actions: ['View Campaign', 'View Analytics']
  },
  {
    id: 2,
    type: 'warning',
    title: 'Low API Rate Limit',
    message: 'You have used 85% of your monthly API calls. Consider upgrading your plan.',
    timestamp: '15 minutes ago',
    read: false,
    category: 'system',
    actor: 'ContentFlow System',
    avatar: '',
    actions: ['Upgrade Plan', 'View Usage']
  },
  {
    id: 3,
    type: 'info',
    title: 'New Team Member Added',
    message: 'David Kim has been added to your team with Editor permissions.',
    timestamp: '1 hour ago',
    read: true,
    category: 'team',
    actor: 'Marcus Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    actions: ['View Team', 'Manage Permissions']
  },
  {
    id: 4,
    type: 'error',
    title: 'Campaign Failed to Deploy',
    message: 'The "Weekend Promotion" campaign failed to deploy due to targeting configuration errors.',
    timestamp: '2 hours ago',
    read: true,
    category: 'campaign',
    actor: 'Emily Johnson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face',
    actions: ['Fix Campaign', 'View Logs']
  },
  {
    id: 5,
    type: 'success',
    title: 'Integration Connected',
    message: 'Firebase integration has been successfully configured and is now active.',
    timestamp: '3 hours ago',
    read: true,
    category: 'integration',
    actor: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face',
    actions: ['Test Integration', 'View Settings']
  },
  {
    id: 6,
    type: 'info',
    title: 'Weekly Report Available',
    message: 'Your weekly analytics report for campaigns is ready for review.',
    timestamp: '1 day ago',
    read: true,
    category: 'analytics',
    actor: 'ContentFlow System',
    avatar: '',
    actions: ['View Report', 'Download PDF']
  }
];

const activityLogs = [
  {
    id: 1,
    action: 'created',
    entity: 'campaign',
    entityName: 'Holiday Special Banner',
    user: 'Sarah Chen',
    timestamp: '5 minutes ago',
    details: 'Created new banner campaign targeting premium users',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face'
  },
  {
    id: 2,
    action: 'updated',
    entity: 'segment',
    entityName: 'Mobile Users',
    user: 'Marcus Rodriguez',
    timestamp: '12 minutes ago',
    details: 'Modified targeting criteria to include tablet users',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
  },
  {
    id: 3,
    action: 'deleted',
    entity: 'asset',
    entityName: 'old-banner-v2.jpg',
    user: 'Emily Johnson',
    timestamp: '25 minutes ago',
    details: 'Removed outdated banner asset from content library',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face'
  },
  {
    id: 4,
    action: 'published',
    entity: 'campaign',
    entityName: 'New Feature Popup',
    user: 'David Kim',
    timestamp: '1 hour ago',
    details: 'Campaign went live and started serving to users',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face'
  },
  {
    id: 5,
    action: 'invited',
    entity: 'user',
    entityName: 'Lisa Wang',
    user: 'Sarah Chen',
    timestamp: '2 hours ago',
    details: 'Sent team invitation with Viewer role permissions',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face'
  }
];

export default function NotificationsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'campaign': return <Zap className="w-4 h-4" />;
      case 'team': return <User className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      case 'integration': return <Activity className="w-4 h-4" />;
      case 'analytics': return <TrendingUp className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated': return <Settings className="w-4 h-4 text-blue-500" />;
      case 'deleted': return <X className="w-4 h-4 text-red-500" />;
      case 'published': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'invited': return <User className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesRead = readFilter === 'all' || 
                       (readFilter === 'unread' && !notification.read) ||
                       (readFilter === 'read' && notification.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    // Mock function - would update notification state
    console.log(`Mark notification ${id} as read`);
  };

  const markAllAsRead = () => {
    // Mock function - would update all notifications
    console.log('Mark all notifications as read');
  };

  const deleteNotification = (id: number) => {
    // Mock function - would delete notification
    console.log(`Delete notification ${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.floor(Math.random() * 5) + 2} today
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Alerts</CardTitle>
            <Shield className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notifications.filter(n => n.category === 'system').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform updates
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaign Alerts</CardTitle>
            <Zap className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notifications.filter(n => n.category === 'campaign').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Campaign updates
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Filters and Actions */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full md:w-64"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={readFilter} onValueChange={setReadFilter}>
                    <SelectTrigger className="w-full md:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <Check className="w-4 h-4 mr-1" />
                    Mark All Read
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Preferences
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Notifications ({filteredNotifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-4 p-4 rounded-lg border transition-colors ${
                      notification.read ? 'bg-background' : 'bg-muted/30 border-primary/20'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            <div className="flex items-center space-x-1">
                              {getCategoryIcon(notification.category)}
                              <span>{notification.category}</span>
                            </div>
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              {!notification.read && (
                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark as Read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Star className="w-4 h-4 mr-2" />
                                Star
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          {notification.actor && notification.avatar && (
                            <>
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={notification.avatar} />
                                <AvatarFallback className="text-xs">
                                  {notification.actor.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span>{notification.actor}</span>
                              <span>•</span>
                            </>
                          )}
                          <Clock className="w-3 h-3" />
                          <span>{notification.timestamp}</span>
                        </div>
                        
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex items-center space-x-2">
                            {notification.actions.slice(0, 2).map((action, index) => (
                              <Button key={index} variant="outline" size="sm" className="text-xs h-6">
                                {action}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{log.user}</span>
                          {' '}<span className="text-muted-foreground">{log.action}</span>{' '}
                          <span className="font-medium">{log.entity}</span>{' '}
                          <span className="font-medium">"{log.entityName}"</span>
                        </p>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {log.details}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={log.avatar} />
                          <AvatarFallback className="text-xs">
                            {log.user.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}