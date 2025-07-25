import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Heart, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NetworkGraphProps {
  refreshTrigger?: number;
}

interface Connection {
  id: number;
  name1: string;
  name2: string;
}

interface Name {
  id: number;
  name: string;
  instagram?: string;
}

const NetworkGraph = ({ refreshTrigger }: NetworkGraphProps) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [names, setNames] = useState<Name[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Fetch approved connections and names
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only accepted connections - com configuração para acesso público
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id, name1, name2, status')
        .eq('status', 'accepted');

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        setError('Erro ao carregar conexões');
        return;
      }

      // Fetch all names - com configuração para acesso público
      const { data: namesData, error: namesError } = await supabase
        .from('names')
        .select('id, name, instagram');

      if (namesError) {
        console.error('Error fetching names:', namesError);
        setError('Erro ao carregar nomes');
        return;
      }

      setConnections(connectionsData || []);
      setNames(namesData || []);
      
      if (!connectionsData || connectionsData.length === 0) {
        console.log('Nenhuma conexão aprovada encontrada');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erro inesperado ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Function to clear all highlights
  const clearHighlights = (cytoscapeInstance: cytoscape.Core) => {
    cytoscapeInstance.edges().removeClass('military-green');
    cytoscapeInstance.nodes().removeClass('connected-highlight selected-highlight');
  };

  // Function to highlight connections
  const highlightConnections = (nodeId: string, cytoscapeInstance: cytoscape.Core) => {
    // Clear previous highlights
    clearHighlights(cytoscapeInstance);
    
    // Find and highlight connected edges
    const connectedEdges = cytoscapeInstance.edges().filter(edge => 
      edge.source().id() === nodeId || edge.target().id() === nodeId
    );
    
    console.log('Conexões encontradas:', connectedEdges.length);
    connectedEdges.addClass('military-green');
    
    // Highlight connected nodes
    const connectedNodes = connectedEdges.connectedNodes().filter(node => node.id() !== nodeId);
    connectedNodes.addClass('connected-highlight');
    console.log('Nós conectados:', connectedNodes.map(n => n.id()));
    
    // Highlight the clicked node differently
    const clickedNode = cytoscapeInstance.$(`#${CSS.escape(nodeId)}`);
    clickedNode.addClass('selected-highlight');
  };

  // Initialize Cytoscape
  useEffect(() => {
    if (!cyRef.current || loading || connections.length === 0) return;

    // Filter connections based on search - show only connections OF the searched person
    let filteredConnections = connections;
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      // Find exact name match first
      const exactMatch = names.find(name => 
        name.name.toLowerCase() === searchLower
      );
      
      if (exactMatch) {
        // Show only connections where this person is involved
        filteredConnections = connections.filter(conn => 
          conn.name1.toLowerCase() === exactMatch.name.toLowerCase() || 
          conn.name2.toLowerCase() === exactMatch.name.toLowerCase()
        );
      } else {
        // Partial match - show connections where either person matches the search
        filteredConnections = connections.filter(conn => 
          conn.name1.toLowerCase().includes(searchLower) || 
          conn.name2.toLowerCase().includes(searchLower)
        );
      }
    }

    // Create unique nodes from filtered connections
    const nodeSet = new Set<string>();
    filteredConnections.forEach(conn => {
      nodeSet.add(conn.name1);
      nodeSet.add(conn.name2);
    });

    // Calculate connection counts for each node
    const connectionCounts = new Map<string, number>();
    filteredConnections.forEach(conn => {
      connectionCounts.set(conn.name1, (connectionCounts.get(conn.name1) || 0) + 1);
      connectionCounts.set(conn.name2, (connectionCounts.get(conn.name2) || 0) + 1);
    });

    const nodes = Array.from(nodeSet).map(name => ({
      data: { 
        id: name, 
        label: name,
        instagram: names.find(n => n.name === name)?.instagram || '',
        connections: connectionCounts.get(name) || 0
      }
    }));

    const edges = filteredConnections.map(conn => ({
      data: {
        id: `${conn.name1}-${conn.name2}`,
        source: conn.name1,
        target: conn.name2
      }
    }));

    const cytoscapeInstance = cytoscape({
      container: cyRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#fe6285',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#9b0c2f',
            'font-size': (ele: any) => {
              const connections = ele.data('connections') || 0;
              return Math.max(10, 8 + connections * 1.5) + 'px';
            },
            'font-weight': 'bold',
            'width': (ele: any) => {
              const connections = ele.data('connections') || 0;
              return Math.max(30, 25 + connections * 4) + 'px';
            },
            'height': (ele: any) => {
              const connections = ele.data('connections') || 0;
              return Math.max(30, 25 + connections * 4) + 'px';
            },
            'border-width': (ele: any) => {
              const connections = ele.data('connections') || 0;
              return Math.max(2, 1 + connections * 0.3) + 'px';
            },
            'border-color': 'hsl(0, 0%, 100%)',
            'text-outline-width': '2px',
            'text-outline-color': 'hsl(0, 0%, 100%)'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': '3px',
            'line-color': 'hsl(341, 100%, 85%)',
            'target-arrow-color': 'hsl(341, 100%, 85%)',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#215c37'
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'background-color': '#f58ab5',
            'border-color': '#ba124a',
            'border-width': '3px'
          }
        },
        {
          selector: 'edge.military-green',
          style: {
            'line-color': '#215c37', 
            'target-arrow-color': '#215c37',
            'width': '4px', 
            'opacity': 1
          }
        },
        {
          selector: 'node.connected-highlight',
          style: {
            'background-color': '#215c37'
          }
        },
        {
          selector: 'node.selected-highlight',
          style: {
            'background-color': '#3b82f6', // Bright blue for selected node
            'border-color': '#1d4ed8',
            'border-width': '4px'
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Add click event handler for nodes
    cytoscapeInstance.on('tap', 'node', (event) => {
      const clickedNode = event.target;
      const nodeId = clickedNode.id();
      
      console.log('Clicou no nó:', nodeId);
      
      // If clicking the same node, deselect
      if (selectedPerson === nodeId) {
        setSelectedPerson(null);
        clearHighlights(cytoscapeInstance);
        console.log('Deselecionado');
        return;
      }
      
      setSelectedPerson(nodeId);
      console.log('Selecionado:', nodeId);
      
      // Highlight connections
      highlightConnections(nodeId, cytoscapeInstance);
    });

    // Add click event handler for background (clicking outside nodes/edges)
    cytoscapeInstance.on('tap', (event) => {
      // Check if the target is the core (background) and not a node or edge
      if (event.target === cytoscapeInstance) {
        console.log('Clicou no fundo do grafo - deselecionando');
        setSelectedPerson(null);
        clearHighlights(cytoscapeInstance);
      }
    });

    setCy(cytoscapeInstance);

    return () => {
      cytoscapeInstance.destroy();
    };
  }, [connections, names, loading, searchQuery]);

  // Handle search - clear selection when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setSelectedPerson(null);
      if (cy) {
        clearHighlights(cy);
      }
    }
  }, [searchQuery, cy]);

  // Restore highlights after graph recreation (when needed)
  useEffect(() => {
    if (cy && selectedPerson && !searchQuery.trim()) {
      // Small delay to ensure the graph is fully rendered
      setTimeout(() => {
        highlightConnections(selectedPerson, cy);
      }, 100);
    }
  }, [cy, selectedPerson, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <Heart className="w-6 h-6 text-primary animate-pulse-slow" />
          <span className="text-muted-foreground">Carregando a rede...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center space-x-3 text-destructive">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <Users className="w-16 h-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Nenhuma conexão aprovada ainda
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              A rede de conexões ainda está vazia.
              Faça login ou cadastre-se para começar a mapear os relacionamentos.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full h-full">
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Pesquisar pessoas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Clique em qualquer nó para ver suas conexões</p>
          <p>Digite um nome para filtrar e ver apenas as conexões dessa pessoa</p>
        </div>
      </Card>
      
      <Card className="p-0 overflow-hidden">
        <div
          ref={cyRef}
          className="w-full h-[700px] bg-gradient-to-br from-secondary/20 to-background"
          style={{ minHeight: '700px' }}
        />
      </Card>
    </div>
  );
};

export default NetworkGraph;