import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Target, 
  Clock, 
  Users, 
  ArrowRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Home,
  Eye,
  EyeOff
} from 'lucide-react';
import cytoscape from 'cytoscape';
import { supabase } from '@/integrations/supabase/client';

interface Connection {
  id: number;
  name1: string;
  name2: string;
  status: string;
}

interface Name {
  id: number;
  name: string;
  instagram?: string;
}

interface GameState {
  startPerson: string;
  targetPerson: string;
  currentPath: string[];
  gameStarted: boolean;
  gameWon: boolean;
  gameLost: boolean;
  attempts: number;
  maxAttempts: number;
  timeStarted: number;
  timeElapsed: number;
  score: number;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: number;
  totalScore: number;
}

const ConnectGame = () => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    startPerson: '',
    targetPerson: '',
    currentPath: [],
    gameStarted: false,
    gameWon: false,
    gameLost: false,
    attempts: 0,
    maxAttempts: 50,
    timeStarted: 0,
    timeElapsed: 0,
    score: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    bestTime: 0,
    totalScore: 0
  });
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [names, setNames] = useState<Name[]>([]);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch accepted connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id, name1, name2, status')
        .eq('status', 'accepted');

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        return;
      }

      // Fetch all names
      const { data: namesData, error: namesError } = await supabase
        .from('names')
        .select('id, name, instagram');

      if (namesError) {
        console.error('Error fetching names:', namesError);
        return;
      }

      setConnections(connectionsData || []);
      setNames(namesData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.gameStarted && !gameState.gameWon && !gameState.gameLost) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: Date.now() - prev.timeStarted
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.gameStarted, gameState.gameWon, gameState.gameLost]);

  // Load stats from memory (since localStorage is not available)
  useEffect(() => {
    // Initialize with default stats - in a real app, this would come from a database
    setGameStats({
      gamesPlayed: 0,
      gamesWon: 0,
      bestTime: 0,
      totalScore: 0
    });
  }, []);

  // Update Cytoscape graph
  useEffect(() => {
    if (!cyRef.current || !showGraph || !gameState.gameStarted) return;

    // Get all people involved in the current game
    const allPeople = new Set<string>();
    gameState.currentPath.forEach(person => allPeople.add(person));
    allPeople.add(gameState.targetPerson);
    
    // Get connections that might be relevant to the game
    const relevantConnections = connections.filter(conn => 
      allPeople.has(conn.name1) || allPeople.has(conn.name2) ||
      getConnections(gameState.currentPath[gameState.currentPath.length - 1]).includes(conn.name1) ||
      getConnections(gameState.currentPath[gameState.currentPath.length - 1]).includes(conn.name2)
    );

    // Add people from relevant connections
    relevantConnections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });

    const nodes = Array.from(allPeople).map(name => ({
      data: { 
        id: name, 
        label: name,
        isStart: name === gameState.startPerson,
        isTarget: name === gameState.targetPerson,
        isInPath: gameState.currentPath.includes(name),
        isCurrent: name === gameState.currentPath[gameState.currentPath.length - 1]
      }
    }));

    const edges = relevantConnections.map(conn => ({
      data: {
        id: `${conn.name1}-${conn.name2}`,
        source: conn.name1,
        target: conn.name2,
        isInPath: (gameState.currentPath.includes(conn.name1) && gameState.currentPath.includes(conn.name2) &&
                  Math.abs(gameState.currentPath.indexOf(conn.name1) - gameState.currentPath.indexOf(conn.name2)) === 1)
      }
    }));

    const cytoscapeInstance = cytoscape({
      container: cyRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#e5e7eb',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#374151',
            'font-size': '12px',
            'font-weight': 'bold',
            'width': '60px',
            'height': '60px',
            'border-width': '2px',
            'border-color': '#9ca3af',
            'text-outline-width': '2px',
            'text-outline-color': '#ffffff'
          }
        },
        {
          selector: 'node[isStart = true]',
          style: {
            'background-color': '#3b82f6',
            'border-color': '#1d4ed8',
            'color': '#ffffff'
          }
        },
        {
          selector: 'node[isTarget = true]',
          style: {
            'background-color': '#8b5cf6',
            'border-color': '#7c3aed',
            'color': '#ffffff'
          }
        },
        {
          selector: 'node[isCurrent = true]',
          style: {
            'background-color': '#10b981',
            'border-color': '#059669',
            'color': '#ffffff',
            'border-width': '4px'
          }
        },
        {
          selector: 'node[isInPath = true]',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#d97706',
            'color': '#ffffff'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': '2px',
            'line-color': '#d1d5db',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge[isInPath = true]',
          style: {
            'line-color': '#f59e0b',
            'width': '4px',
            'opacity': 1
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 80,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 20,
        randomize: false,
        componentSpacing: 40,
        nodeRepulsion: 100000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 50,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    setCy(cytoscapeInstance);

    return () => {
      cytoscapeInstance.destroy();
    };
  }, [showGraph, gameState.currentPath, gameState.startPerson, gameState.targetPerson, connections, gameState.gameStarted]);

  // Find connections for a person
  const getConnections = (personName: string): string[] => {
    return connections
      .filter(conn => conn.name1 === personName || conn.name2 === personName)
      .map(conn => conn.name1 === personName ? conn.name2 : conn.name1);
  };

  // Check if two people are directly connected
  const areDirectlyConnected = (person1: string, person2: string): boolean => {
    return connections.some(conn => 
      (conn.name1 === person1 && conn.name2 === person2) ||
      (conn.name1 === person2 && conn.name2 === person1)
    );
  };

  // Find shortest path between two people (for hints and validation)
  const findShortestPath = (start: string, target: string): string[] | null => {
    if (start === target) return [start];
    
    const visited = new Set<string>();
    const queue: { person: string; path: string[] }[] = [{ person: start, path: [start] }];
    
    while (queue.length > 0) {
      const { person, path } = queue.shift()!;
      
      if (visited.has(person)) continue;
      visited.add(person);
      
      const personConnections = getConnections(person);
      
      for (const connection of personConnections) {
        if (connection === target) {
          return [...path, connection];
        }
        
        if (!visited.has(connection)) {
          queue.push({ person: connection, path: [...path, connection] });
        }
      }
    }
    
    return null;
  };

  // Start new game
  const startNewGame = async () => {
    if (loading || connections.length === 0) return;
    
    // Find two people without direct connection
    let startPerson = '';
    let targetPerson = '';
    let attempts = 0;
    const maxAttempts = 100;
    
    // Get all unique names from connections
    const allPeople = new Set<string>();
    connections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });
    const peopleArray = Array.from(allPeople);
    
    while (attempts < maxAttempts && peopleArray.length >= 2) {
      const randomStart = peopleArray[Math.floor(Math.random() * peopleArray.length)];
      const randomTarget = peopleArray[Math.floor(Math.random() * peopleArray.length)];
      
      if (randomStart !== randomTarget && 
          !areDirectlyConnected(randomStart, randomTarget)) {
        // Check if there's at least one path between them
        const path = findShortestPath(randomStart, randomTarget);
        if (path && path.length > 2 && path.length <= 6) { // Ensure it's challenging but solvable
          startPerson = randomStart;
          targetPerson = randomTarget;
          break;
        }
      }
      attempts++;
    }
    
    // Fallback if no suitable pair found
    if (!startPerson || !targetPerson) {
      if (peopleArray.length >= 2) {
        startPerson = peopleArray[0];
        targetPerson = peopleArray[peopleArray.length - 1];
      } else {
        alert('Não há conexões suficientes para iniciar o jogo!');
        return;
      }
    }
    
    setGameState({
      startPerson,
      targetPerson,
      currentPath: [startPerson],
      gameStarted: true,
      gameWon: false,
      gameLost: false,
      attempts: 0,
      maxAttempts: 6,
      timeStarted: Date.now(),
      timeElapsed: 0,
      score: 0
    });
    
    setSearchQuery('');
    setSuggestions([]);
    setShowHint(false);
  };

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim() && gameState.gameStarted && !gameState.gameWon && !gameState.gameLost) {
      const currentPerson = gameState.currentPath[gameState.currentPath.length - 1];
      const personConnections = getConnections(currentPerson);
      
      const filtered = personConnections.filter(name =>
        name.toLowerCase().includes(value.toLowerCase()) &&
        !gameState.currentPath.includes(name)
      );
      
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  // Add person to path
  const addPersonToPath = (personName: string) => {
    const currentPerson = gameState.currentPath[gameState.currentPath.length - 1];
    
    // Verify connection exists
    if (!areDirectlyConnected(currentPerson, personName)) {
      return; // Invalid move
    }
    
    const newPath = [...gameState.currentPath, personName];
    const newAttempts = gameState.attempts + 1;
    
    // Check if won
    if (personName === gameState.targetPerson) {
      const timeBonus = Math.max(0, 300 - Math.floor(gameState.timeElapsed / 1000));
      const pathBonus = Math.max(0, (6 - newPath.length) * 50);
      const newScore = 1000 + timeBonus + pathBonus;
      
      setGameState(prev => ({
        ...prev,
        currentPath: newPath,
        attempts: newAttempts,
        gameWon: true,
        score: newScore
      }));
      
      // Update stats
      setGameStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
        bestTime: prev.bestTime === 0 ? gameState.timeElapsed : Math.min(prev.bestTime, gameState.timeElapsed),
        totalScore: prev.totalScore + newScore
      }));
      
    } else if (newAttempts >= gameState.maxAttempts) {
      // Game lost
      setGameState(prev => ({
        ...prev,
        currentPath: newPath,
        attempts: newAttempts,
        gameLost: true
      }));
      
      setGameStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1
      }));
      
    } else {
      // Continue game
      setGameState(prev => ({
        ...prev,
        currentPath: newPath,
        attempts: newAttempts
      }));
    }
    
    setSearchQuery('');
    setSuggestions([]);
  };

  // Get hint
  const getHint = () => {
    if (!gameState.gameStarted || gameState.gameWon || gameState.gameLost) return;
    
    const currentPerson = gameState.currentPath[gameState.currentPath.length - 1];
    const personConnections = getConnections(currentPerson);
    
    // Find which connection leads to target
    for (const connection of personConnections) {
      const pathToTarget = findShortestPath(connection, gameState.targetPerson);
      if (pathToTarget && pathToTarget.length <= gameState.maxAttempts - gameState.attempts) {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 3000);
        return connection;
      }
    }
    
    return personConnections[0] || '';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const hintPerson = showHint ? getHint() : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-purple-600">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="absolute left-0"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Target className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-purple-800">Connect Porto Alegre</h1>
          </div>
          <p className="text-purple-600">Conecte duas pessoas através de relacionamentos em comum!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{gameStats.gamesPlayed}</div>
            <div className="text-sm text-muted-foreground">Jogos</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{gameStats.gamesWon}</div>
            <div className="text-sm text-muted-foreground">Vitórias</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {gameStats.bestTime > 0 ? formatTime(gameStats.bestTime) : '--'}
            </div>
            <div className="text-sm text-muted-foreground">Melhor Tempo</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{gameStats.totalScore}</div>
            <div className="text-sm text-muted-foreground">Pontuação Total</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Area */}
          <Card className="p-6">
            {!gameState.gameStarted ? (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Como Jogar</h2>
                  <div className="text-left max-w-md mx-auto space-y-2 text-sm text-muted-foreground">
                    <p>• Você receberá duas pessoas que não se tem conexão diretamente</p>
                    <p>• Seu objetivo é conectá-las através de relacionamentos mútuos</p>
                    <p>• Digite nomes de pessoas conectadas à pessoa atual</p>
                    <p>• Pontuação baseada em velocidade e eficiência</p>
                    <p>• Use o grafo visual para ver as conexões</p>
                  </div>
                </div>
                <Button 
                  onClick={startNewGame} 
                  size="lg" 
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={connections.length === 0}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {connections.length === 0 ? 'Sem conexões disponíveis' : 'Iniciar Jogo'}
                </Button>
                {connections.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ainda não há conexões aprovadas suficientes para jogar.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Game Status */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(gameState.timeElapsed)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{gameState.attempts}/{gameState.maxAttempts}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGraph(!showGraph)}
                    >
                      {showGraph ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {showGraph ? 'Ocultar' : 'Ver'} Grafo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getHint()}
                      disabled={showHint}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Dica
                    </Button>
                  </div>
                </div>

                {/* Game Path */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Conecte:</div>
                    <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
                      <span className="text-blue-600">{gameState.startPerson}</span>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <span className="text-purple-600">{gameState.targetPerson}</span>
                    </div>
                  </div>

                  {/* Current Path */}
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Caminho atual:</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {gameState.currentPath.map((person, index) => (
                        <div key={index} className="flex items-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            index === 0 ? 'bg-blue-100 text-blue-700' :
                            person === gameState.targetPerson ? 'bg-purple-100 text-purple-700' :
                            index === gameState.currentPath.length - 1 ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {person}
                          </span>
                          {index < gameState.currentPath.length - 1 && (
                            <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search Input */}
                  {!gameState.gameWon && !gameState.gameLost && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Quem {gameState.currentPath[gameState.currentPath.length - 1]} conhece?
                        {showHint && hintPerson && (
                          <span className="ml-2 text-orange-600 font-medium">
                            💡 Tente: {hintPerson}
                          </span>
                        )}
                      </div>
                      <Input
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Digite o nome de uma pessoa..."
                        className="text-lg"
                      />
                      
                      {/* Suggestions */}
                      {suggestions.length > 0 && (
                        <div className="grid gap-2">
                          {suggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="outline"
                              onClick={() => addPersonToPath(suggestion)}
                              className="justify-start"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Game End Messages */}
                  {gameState.gameWon && (
                    <div className="text-center space-y-4 p-6 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-green-800">Parabéns! 🎉</h3>
                        <p className="text-green-700">
                          Você conectou {gameState.startPerson} e {gameState.targetPerson}!
                        </p>
                        <div className="text-lg font-semibold text-green-800">
                          Pontuação: {gameState.score} pontos
                        </div>
                        <div className="text-sm text-green-600">
                          Tempo: {formatTime(gameState.timeElapsed)} | Passos: {gameState.currentPath.length - 1}
                        </div>
                      </div>
                    </div>
                  )}

                  {gameState.gameLost && (
                    <div className="text-center space-y-4 p-6 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="w-16 h-16 text-red-600 mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-red-800">Game Over</h3>
                        <p className="text-red-700">
                          Não foi possível conectar {gameState.startPerson} e {gameState.targetPerson}
                        </p>
                        <div className="text-sm text-red-600">
                          Tentativas esgotadas: {gameState.attempts}/{gameState.maxAttempts}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(gameState.gameWon || gameState.gameLost) && (
                    <div className="flex justify-center space-x-4">
                      <Button onClick={startNewGame} className="bg-purple-600 hover:bg-purple-700">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Novo Jogo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Graph Visualization */}
          {showGraph && gameState.gameStarted && (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Visualização da Rede</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Início</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span>Objetivo</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Atual</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Caminho</span>
                    </div>
                  </div>
                </div>
                <div
                  ref={cyRef}
                  className="w-full h-[500px] bg-gradient-to-br from-secondary/20 to-background border rounded-lg"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectGame;