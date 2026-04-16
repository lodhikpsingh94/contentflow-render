import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { 
  MoreHorizontal, Calendar, Eye, MousePointer, Search, BarChart3,
  CheckCircle2, Clock, Pause, XCircle, Edit, Copy, Archive, Trash2, TrendingUp, Play, ChevronsUpDown
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, 
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal
} from '../ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '../ui/pagination';

import { getCampaigns, updateCampaignStatus, deleteCampaign } from '../../lib/campaigns';
import { Campaign } from '../../lib/campaigns/types';
import { getSegments } from '../../lib/segments';

interface CampaignsViewProps {
  onNavigate: (view: string, data?: any) => void;
}

// Interface for pagination state
interface PaginationState {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const CAMPAIGN_STATUSES: Campaign['status'][] = ['active', 'paused', 'scheduled', 'draft', 'completed', 'expired'];

const formatDate = (dateString?: string): string => dateString ? new Date(dateString).toLocaleDateString('en-CA') : 'N/A';

const timeAgo = (dateString: string): string => {
    if (!dateString) return 'just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    return `${Math.floor(seconds)} seconds ago`;
};

export default function CampaignsView({ onNavigate }: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  useEffect(() => {
    const fetchCampaignData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const [campaignsResult, segmentsResult] = await Promise.all([
              getCampaigns(pagination.page, pagination.limit),
              getSegments()
          ]);

          console.log('Campaigns Result:', campaignsResult); // Debug log

          const segmentsMap = new Map((segmentsResult.data || []).map(s => [s._id, s.name]));
          
          // Handle the actual API response structure
          const campaignsData = campaignsResult.data || [];
          const paginationData = campaignsResult.metadata?.pagination || null;
          
          console.log('Pagination Data:', paginationData); // Debug log
          
          const enrichedCampaigns = campaignsData.map((campaign: Campaign) => ({
              ...campaign,
              segmentDetails: (campaign.rules.segments || []).map(segId => ({
                  _id: segId,
                  name: segmentsMap.get(segId) || 'Unknown'
              }))
          }));

          setCampaigns(enrichedCampaigns);
          
          // Update pagination with API data
          if (paginationData) {
            console.log('Setting pagination:', paginationData); // Debug log
            setPagination(prev => ({
              ...prev,
              page: paginationData.page || prev.page,
              limit: paginationData.limit || prev.limit,
              total: paginationData.total || 0,
              totalPages: paginationData.totalPages || Math.ceil((paginationData.total || 0) / (paginationData.limit || prev.limit))
            }));
          } else {
            console.warn('No pagination data received from API');
            // Fallback if no pagination from API
            const total = campaignsData.length;
            setPagination(prev => ({
              ...prev,
              total,
              totalPages: Math.ceil(total / prev.limit) || 1
            }));
          }

        } catch (err) {
          console.error('Error fetching campaigns:', err);
          setError(err instanceof Error ? err.message : 'Failed to load campaigns.');
        } finally {
          setLoading(false);
        }
    };

    fetchCampaignData();
  }, [pagination.page, pagination.limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
        setPagination(prev => ({ ...prev, page: newPage }));
    }
  };
  
  const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
    const originalCampaigns = [...campaigns];
    setCampaigns(prev => prev.map(c => c._id === campaignId ? { ...c, status: newStatus } : c));
    try {
      await updateCampaignStatus(campaignId, newStatus);
    } catch (err) {
      setError(`Failed to update status for campaign ${campaignId}.`);
      setCampaigns(originalCampaigns);
    }
  };

  const openDeleteDialog = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    const originalCampaigns = [...campaigns];
    setCampaigns(prev => prev.filter(c => c._id !== campaignToDelete._id));
    setIsDeleteDialogOpen(false);
    try {
      await deleteCampaign(campaignToDelete._id);
    } catch (err) {
      setError(`Failed to delete campaign "${campaignToDelete.name}".`);
      setCampaigns(originalCampaigns);
    } finally {
      setCampaignToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      active: { className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", icon: <CheckCircle2 className="w-3 h-3" /> },
      scheduled: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
      paused: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", icon: <Pause className="w-3 h-3" /> },
      completed: { className: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: <CheckCircle2 className="w-3 h-3" /> },
      expired: { className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
      draft: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", icon: <Edit className="w-3 h-3" /> },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant="outline" className={`capitalize gap-1.5 font-medium ${config.className}`}>{config.icon}{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      banner: "border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      popup: "border-green-500/50 bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      modal: "border-purple-500/50 bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    };
    return <Badge variant="outline" className={`capitalize font-medium ${colors[type] || ''}`}>{type}</Badge>;
  };

  const handleSelectCampaign = (id: string, checked: boolean) => {
    setSelectedCampaigns(prev => checked ? [...prev, id] : prev.filter(cId => cId !== id));
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedCampaigns(checked ? filteredCampaigns.map(c => c._id) : []);
  };

  const filteredCampaigns = (campaigns || []).filter(c => c && c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <Skeleton className="w-full h-[600px]" />;
  
  if (error) return (
      <Card className="p-8 text-center text-destructive bg-destructive/10">
          <CardHeader><CardTitle>An Error Occurred</CardTitle></CardHeader>
          <CardContent>{error}</CardContent>
      </Card>
  );

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the <strong>{campaignToDelete?.name}</strong> campaign and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Campaigns ({filteredCampaigns.length})</CardTitle>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                      placeholder="Search by name..." 
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><Checkbox onCheckedChange={(c) => handleSelectAll(c as boolean)} /></TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length > 0 ? (
                    filteredCampaigns.map((campaign) => {
                        const totalImpressions = campaign.statistics?.impressions || 0;
                        const clickThroughRate = (campaign.statistics?.ctr || 0).toFixed(2);
                        const totalConversions = campaign.statistics?.conversions || 0;
                        return (
                            <TableRow key={campaign._id}>
                                <TableCell><Checkbox checked={selectedCampaigns.includes(campaign._id)} onCheckedChange={(c) => handleSelectCampaign(campaign._id, c as boolean)} /></TableCell>
                                <TableCell>
                                  <div className="font-medium text-foreground flex items-center gap-2">{campaign.name}</div>
                                  <div className="text-sm text-muted-foreground">Target: {campaign.segmentDetails?.[0]?.name || '...'}</div>
                                </TableCell>
                                <TableCell>{getTypeBadge(campaign.type)}</TableCell>
                                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                                <TableCell>
                                  <div className="space-y-1 text-sm">
                                      <div className="flex items-center gap-4">
                                          <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-muted-foreground" /> {totalImpressions.toLocaleString()}</span>
                                          <span className="flex items-center gap-1.5"><MousePointer className="w-3 h-3 text-muted-foreground" /> {clickThroughRate}%</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> {totalConversions.toLocaleString()} conversions</span>
                                      </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 text-sm"><Calendar className="w-3 h-3 text-muted-foreground" /> {formatDate(campaign.rules?.schedule?.startTime)}</div>
                                  <div className="text-sm text-muted-foreground ml-5">to {formatDate(campaign.rules?.schedule?.endTime)}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6"><AvatarFallback className="text-xs">{(campaign.createdBy || 'S').charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                                      <div>
                                          <div className="text-sm font-medium">{campaign.createdBy || 'System'}</div>
                                          <div className="text-xs text-muted-foreground">{timeAgo(campaign.updatedAt)}</div>
                                      </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onNavigate('analytics', { campaignId: campaign._id })}><BarChart3 className="w-4 h-4 mr-2" />View Analytics</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onNavigate('create-campaign', { campaignId: campaign._id })}><Edit className="w-4 h-4 mr-2" />Edit Campaign</DropdownMenuItem>
                                            <DropdownMenuItem><Copy className="w-4 h-4 mr-2" />Duplicate</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                              <DropdownMenuSubTrigger><ChevronsUpDown className="w-4 h-4 mr-2" />Change Status</DropdownMenuSubTrigger>
                                              <DropdownMenuPortal>
                                                <DropdownMenuSubContent>
                                                  {CAMPAIGN_STATUSES.map(status => (
                                                    <DropdownMenuItem 
                                                      key={status} 
                                                      disabled={campaign.status === status}
                                                      onClick={() => handleStatusChange(campaign._id, status)}
                                                    >
                                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </DropdownMenuItem>
                                                  ))}
                                                </DropdownMenuSubContent>
                                              </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(campaign)}>
                                              <Trash2 className="w-4 h-4 mr-2" />Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No campaigns found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* --- THIS BLOCK IS RESTORED --- */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center pt-6">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(pagination.page - 1); }}
                                    className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                            
                            {[...Array(pagination.totalPages)].map((_, i) => (
                                <PaginationItem key={i}>
                                    <PaginationLink 
                                        href="#"
                                        isActive={pagination.page === i + 1}
                                        onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext 
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(pagination.page + 1); }}
                                    className={pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
            {/* --- END OF RESTORED BLOCK --- */}
          </CardContent>
        </Card>
      </div>
    </>
  );
}