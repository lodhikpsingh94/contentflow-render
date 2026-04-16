import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { useTheme } from './ThemeProvider';
import { 
  LayoutDashboard, 
  Megaphone, 
  Plus, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Workflow,
  FolderOpen,
  Bell,
  Target,
  Search,
  Sun,
  Moon,
  ChevronDown,
  HelpCircle
} from 'lucide-react';

// Import dashboard views
import DashboardOverview from './dashboard/DashboardOverview';
import CampaignsView from './dashboard/CampaignsView';
import CreateCampaignView from './dashboard/CreateCampaignView';
import AnalyticsView from './dashboard/AnalyticsView';
import SegmentsView from './dashboard/SegmentsView';
import ContentLibraryView from './dashboard/ContentLibraryView';
import SettingsView from './dashboard/SettingsView';
import NotificationsView from './dashboard/NotificationsView';
import JourneysView from './dashboard/JourneysView';
import JourneyBuilderView from './dashboard/JourneyBuilderView';

interface DashboardProps {
  onLogout: () => void;
}

type DashboardView = 
  | 'overview' 
  | 'campaigns' 
  | 'create-campaign' 
  | 'analytics' 
  | 'segments'
  | 'content-library'
  | 'settings'
  | 'journeys'
  | 'journey-builder'
  | 'notifications';

export default function Dashboard({ onLogout }: DashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications] = useState(3);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // NEW: Store navigation data like campaignId
  const [navigationData, setNavigationData] = useState<any>(null);

  const navigation = [
    { 
      name: 'Overview', 
      icon: LayoutDashboard, 
      view: 'overview' as DashboardView,
      description: 'Dashboard home and key metrics'
    },
    { 
      name: 'Campaigns', 
      icon: Megaphone, 
      view: 'campaigns' as DashboardView,
      description: 'Manage all campaigns'
    },
    { 
      name: 'Create Campaign', 
      icon: Plus, 
      view: 'create-campaign' as DashboardView,
      description: 'Launch new campaigns'
    },
    { 
      name: 'Analytics', 
      icon: BarChart3, 
      view: 'analytics' as DashboardView,
      description: 'Performance insights'
    },
    { 
      name: 'Audience', 
      icon: Target, 
      view: 'segments' as DashboardView,
      description: 'Segments and targeting'
    },
    { 
      name: 'Content Library', 
      icon: FolderOpen, 
      view: 'content-library' as DashboardView,
      description: 'Assets and media files'
    },
    { 
      name: 'Journeys', 
      icon: Workflow, 
      view: 'journeys' as DashboardView,
      description: 'Automate user engagement flows'
    },
  ];

  const bottomNavigation = [
    { 
      name: 'Notifications', 
      icon: Bell, 
      view: 'notifications' as DashboardView,
      badge: notifications > 0 ? notifications : undefined
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      view: 'settings' as DashboardView
    },
  ];

  // Navigation handler that accepts view and optional data
  const handleNavigate = (view: DashboardView, data?: any) => {
    setCurrentView(view);
    setNavigationData(data || null);
    setIsSidebarOpen(false);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview onNavigate={handleNavigate} />;
      case 'campaigns':
        return <CampaignsView onNavigate={handleNavigate} />;
      case 'create-campaign':
        return <CreateCampaignView 
          onCampaignCreated={() => {
            setCurrentView('campaigns');
            setNavigationData(null);
          }} 
          campaignId={navigationData?.campaignId}
        />;
      case 'analytics':
        return <AnalyticsView />;
      case 'segments':
        return <SegmentsView />;
      case 'content-library':
        return <ContentLibraryView 
          isUploadModalOpen={isUploadModalOpen}
          setIsUploadModalOpen={setIsUploadModalOpen} 
        />;
      case 'settings':
        return <SettingsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'journeys':
        return <JourneysView onNavigate={handleNavigate} />;
      case 'journey-builder':
        return <JourneyBuilderView onNavigate={handleNavigate} />;
      default:
        return <DashboardOverview onNavigate={handleNavigate} />;
    }
  };

  const getPageTitle = () => {
    const navItem = [...navigation, ...bottomNavigation].find(item => item.view === currentView);
    return navItem?.name || 'Dashboard';
  };

  const getPageDescription = () => {
    const navItem = navigation.find(item => item.view === currentView);
    return navItem?.description;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-sidebar-primary-foreground rounded-sm"></div>
            </div>
            <div>
              <h2 className="text-sidebar-foreground font-semibold">ContentFlow</h2>
              <p className="text-xs text-sidebar-foreground/60">Enterprise</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={currentView === item.view ? "default" : "ghost"}
                className={`w-full justify-start h-11 ${
                  currentView === item.view 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                onClick={() => handleNavigate(item.view)}
              >
                <item.icon className="w-4 h-4 mr-3" />
                <span className="flex-1 text-left">{item.name}</span>
              </Button>
            ))}
          </div>

          {/* Bottom Navigation */}
          <div className="absolute bottom-6 left-4 right-4">
            <div className="space-y-2 mb-4">
              {bottomNavigation.map((item) => (
                <Button
                  key={item.name}
                  variant={currentView === item.view ? "default" : "ghost"}
                  className={`w-full justify-start h-11 ${
                    currentView === item.view 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => handleNavigate(item.view)}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            <div className="border-t border-sidebar-border pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start h-11 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </Button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden mr-3"
            >
              <Menu className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns, segments, or content..."
                  className="pl-9 bg-input-background border-border"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
              <HelpCircle className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 relative"
              onClick={() => handleNavigate('notifications')}
            >
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-destructive-foreground text-[10px] leading-none">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                </div>
              )}
            </Button>

            <div className="flex items-center space-x-3 pl-3 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">Sarah Chen</p>
                <p className="text-xs text-muted-foreground">Marketing Manager</p>
              </div>
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=32&h=32&fit=crop&crop=face" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page Header */}
        <div className="bg-card/50 border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{getPageTitle()}</h1>
              {getPageDescription() && (
                <p className="text-sm text-muted-foreground mt-1">{getPageDescription()}</p>
              )}
            </div>
            
            {currentView === 'campaigns' && (
              <Button 
                onClick={() => {
                  setNavigationData(null);
                  setCurrentView('create-campaign');
                }}
                className="px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            )}
            
            {currentView === 'content-library' && (
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Assets
              </Button>
            )}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="p-4 lg:p-6">
            {renderCurrentView()}
          </div>
        </main>
      </div>
    </div>
  );
}