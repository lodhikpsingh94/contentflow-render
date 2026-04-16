import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Plus, Workflow, Edit, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { getJourneys } from '../../lib/journeys';
import { Journey } from '../../lib/journeys/types';

interface JourneysViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export default function JourneysView({ onNavigate }: JourneysViewProps) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const response = await getJourneys();
        setJourneys(response.data || []); // Mock or real data
      } catch (err) {
        setError("Failed to load journeys.");
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
    </div>
  }

  if (error) {
    return <Card className="p-8 text-center text-destructive">{error}</Card>;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Journeys</h2>
            <Button onClick={() => onNavigate('journey-builder')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Journey
            </Button>
        </div>

        {journeys.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
                <Workflow className="w-16 h-16 text-muted-foreground mb-4" />
                <CardTitle>No Journeys Created Yet</CardTitle>
                <p className="text-muted-foreground mt-2 mb-6">Create an automated journey to engage users based on their actions.</p>
                <Button onClick={() => onNavigate('journey-builder')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Journey
                </Button>
            </Card>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {journeys.map(journey => (
                    <Card key={journey._id}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>{journey.name}</CardTitle>
                                <Badge variant={journey.status === 'active' ? 'default' : 'secondary'} className="mt-2">{journey.status}</Badge>
                            </div>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4"/></Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{journey.description || 'No description.'}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Nodes: {journey.nodes.length}</span>
                                <span>Last updated: {new Date(journey.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => onNavigate('journey-builder', { journeyId: journey._id })}>
                                <Edit className="w-3 h-3 mr-2" />
                                Edit Journey
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
    </div>
  );
}