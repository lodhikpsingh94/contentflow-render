import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Save, Play, Workflow } from 'lucide-react';

const initialNodes: Node[] = [
  { id: '1', type: 'default', data: { label: 'Trigger: User Signs Up' }, position: { x: 250, y: 5 } },
];
const initialEdges: Edge[] = [];

export default function JourneyBuilderView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [journeyName, setJourneyName] = useState('New User Welcome Journey');

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const saveJourney = () => {
    // In a real app, this would make an API call
    console.log("Saving Journey:", { name: journeyName, nodes, edges });
    alert("Journey saved to console!");
    onNavigate('journeys');
  };

  return (
    <div className="flex flex-col h-full">
      {/* --- Header --- */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
            <Workflow className="w-6 h-6" />
            <Input 
                className="text-lg font-semibold w-96" 
                value={journeyName} 
                onChange={(e) => setJourneyName(e.target.value)} 
            />
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onNavigate('journeys')}>Cancel</Button>
            <Button variant="secondary"><Play className="w-4 h-4 mr-2" />Activate</Button>
            <Button onClick={saveJourney}><Save className="w-4 h-4 mr-2" />Save Journey</Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* --- Node Palette --- */}
        <Card className="w-64 rounded-none border-r border-t-0">
            <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">TRIGGERS</h3>
                <Button variant="outline" className="w-full justify-start">User Signs Up</Button>
                <Button variant="outline" className="w-full justify-start">App Opens</Button>
                
                <h3 className="text-sm font-medium text-muted-foreground pt-4">ACTIONS</h3>
                <Button variant="outline" className="w-full justify-start">Show Campaign</Button>
                <Button variant="outline" className="w-full justify-start">Wait (Delay)</Button>
                <Button variant="outline" className="w-full justify-start">Check Condition</Button>
            </CardContent>
        </Card>

        {/* --- React Flow Canvas --- */}
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}