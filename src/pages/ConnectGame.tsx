import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  RotateCcw, 
  Target, 
  Clock, 
  Users, 
  ArrowRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Home,
  Plus,
  Trophy
} from 'lucide-react';
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
  revealedPeople: Set<string>;
  revealedConnections: Array<{source: string, target: string}>;
  gameStarted: boolean;
  gameWon: boolean;
  gameLost: boolean;
  attempts: number;
  maxAttempts: number;
  timeStarted: number;
  timeElapsed: number;
  score: number;
}

const ConnectGame = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    startPerson: '',
    targetPerson: '',
    revealedPeople: new Set(),
    revealedConnections: [],
    gameStarted: false,
    gameWon: false,
    gameLost: false,
    attempts: 0,
    maxAttempts: 8,
    timeStarted: 0,
    timeElapsed: 0,
    score: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [names, setNames] = useState<Name[]>([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id, name1, name2, status')
        .eq('status', 'accepted');

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        setError('Erro ao carregar conexões: ' + connectionsError.message);
        return;
      }

      const { data: namesData, error: namesError } = await supabase
        .from('names')
        .select('id, name, instagram');

      if (namesError) {
        console.error('Error fetching names:', namesError);
        setError('Erro ao carregar nomes: ' + namesError.message);
        return;
      }

      setConnections(connectionsData || []);
      setNames(namesData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
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

  // Simple graph visualization
  const renderGraph = () => {
    if (!gameState.gameStarted) return null;

    const revealedPeopleArray = Array.from(gameState.revealedPeople);
    
    // Create a simple layout
    const nodePositions = revealedPeopleArray.reduce((acc, person, index) => {
      const angle = (index / revealedPeopleArray.length) * 2 * Math.PI;
      const radius = 150;
      const centerX = 250;
      const centerY = 200;
      
      acc[person] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
      return acc;
    }, {} as Record<string, {x: number, y: number}>);

    return (
      <svg width="500" height="400" className="border rounded bg-white">
        {/* Draw connections */}
        {gameState.revealedConnections.map((conn, index) => {
          const sourcePos = nodePositions[conn.source];
          const targetPos = nodePositions[conn.target];
          if (!sourcePos || !targetPos) return null;
          
          return (
            <line
              key={index}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#059669"
              strokeWidth="3"
              opacity="0.8"
            />
          );
        })}
        
        {/* Draw nodes */}
        {revealedPeopleArray.map((person) => {
          const pos = nodePositions[person];
          if (!pos) return null;
          
          const isStart = person === gameState.startPerson;
          const isTarget = person === gameState.targetPerson;
          const color = isStart ? '#3b82f6' : isTarget ? '#8b5cf6' : '#10b981';
          
          return (
            <g key={person}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="30"
                fill={color}
                stroke={isStart ? '#1d4ed8' : isTarget ? '#7c3aed' : '#059669'}
                strokeWidth="3"
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dy="0.35em"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                {person.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

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

  // Check if the graph is connected using the provided connections
  const isGraphConnected = (revealedConnections: Array<{source: string, target: string}>, startPerson: string, targetPerson: string): boolean => {
    if (revealedConnections.length === 0) return false;
    
    // Use BFS to check if start and target are connected
    const visited = new Set<string>();
    const queue = [startPerson];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      if (current === targetPerson) return true;
      
      // Find connections in revealed connections
      revealedConnections.forEach(conn => {
        if (conn.source === current && !visited.has(conn.target)) {
          queue.push(conn.target);
        }
        if (conn.target === current && !visited.has(conn.source)) {
          queue.push(conn.source);
        }
      });
    }
    
    return false;
  };

  // Find shortest path
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
  const startNewGame = () => {
    if (loading || connections.length === 0) return;
    
    // Find two people with a path between them
    let startPerson = '';
    let targetPerson = '';
    let attempts = 0;
    const maxAttempts = 100;
    
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
        const path = findShortestPath(randomStart, randomTarget);
        if (path && path.length >= 3 && path.length <= 6) {
          startPerson = randomStart;
          targetPerson = randomTarget;
          break;
        }
      }
      attempts++;
    }
    
    if (!startPerson || !targetPerson) {
      if (peopleArray.length >= 2) {
        startPerson = peopleArray[0];
        targetPerson = peopleArray[1];
      } else {
        alert('Não há conexões suficientes para iniciar o jogo!');
        return;
      }
    }
    
    // Initialize game with only start and target visible
    const initialPeople = new Set([startPerson, targetPerson]);
    
    setGameState({
      startPerson,
      targetPerson,
      revealedPeople: initialPeople,
      revealedConnections: [],
      gameStarted: true,
      gameWon: false,
      gameLost: false,
      attempts: 0,
      maxAttempts: 8,
      timeStarted: Date.now(),
      timeElapsed: 0,
      score: 0
    });
    
    setSearchQuery('');
    setHint('');
  };

  // Handle search submission
  const handleSearch = () => {
    if (!searchQuery.trim() || gameState.gameWon || gameState.gameLost) return;

    const searchName = searchQuery.trim();
    const newAttempts = gameState.attempts + 1;

    console.log('Searching for:', searchName); // Debug log

    // Check if this person exists in our connections
    const allPeople = new Set<string>();
    connections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });

    console.log('All people:', Array.from(allPeople)); // Debug log

    if (!allPeople.has(searchName)) {
      console.log('Person not found in connections'); // Debug log
      // Person not found
      if (newAttempts >= gameState.maxAttempts) {
        setGameState(prev => ({
          ...prev,
          attempts: newAttempts,
          gameLost: true
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          attempts: newAttempts
        }));
      }
      setSearchQuery('');
      return;
    }

    console.log('Person found, checking connections...'); // Debug log

    // Find new connections this person has with already revealed people
    const newConnections: Array<{source: string, target: string}> = [];
    const newPeople = new Set(gameState.revealedPeople);
    
    newPeople.add(searchName);

    // Check connections with all revealed people
    gameState.revealedPeople.forEach(revealedPerson => {
      if (areDirectlyConnected(searchName, revealedPerson)) {
        newConnections.push({
          source: searchName,
          target: revealedPerson
        });
      }
    });

    console.log('New connections found:', newConnections); // Debug log

    // Update game state
    const updatedConnections = [...gameState.revealedConnections, ...newConnections];
    
    setGameState(prev => ({
      ...prev,
      revealedPeople: newPeople,
      revealedConnections: updatedConnections,
      attempts: newAttempts
    }));

    // Check if game is won (start and target are connected)
    const gameWon = isGraphConnected(updatedConnections, gameState.startPerson, gameState.targetPerson);
    console.log('Game won?', gameWon); // Debug log

    if (gameWon) {
      const timeBonus = Math.max(0, 300 - Math.floor(gameState.timeElapsed / 1000));
      const attemptsBonus = Math.max(0, (gameState.maxAttempts - newAttempts) * 50);
      const newScore = 1000 + timeBonus + attemptsBonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore
      }));
    } else if (newAttempts >= gameState.maxAttempts) {
      setGameState(prev => ({
        ...prev,
        gameLost: true
      }));
    }

    setSearchQuery('');
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get hint
  const getHint = () => {
    if (!gameState.gameStarted || gameState.gameWon || gameState.gameLost) return;

    // Find a person who connects to any revealed person and leads toward the target
    const allPeople = new Set<string>();
    connections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });

    for (const person of allPeople) {
      if (!gameState.revealedPeople.has(person)) {
        // Check if this person connects to any revealed person
        const connectsToRevealed = Array.from(gameState.revealedPeople).some(revealed => 
          areDirectlyConnected(person, revealed)
        );
        
        if (connectsToRevealed) {
          // Check if this person is on a path to target
          const pathToTarget = findShortestPath(person, gameState.targetPerson);
          if (pathToTarget && pathToTarget.length <= gameState.maxAttempts - gameState.attempts + 2) {
            setHint(`Tente: ${person}`);
            setTimeout(() => setHint(''), 5000);
            return;
          }
        }
      }
    }
    
    setHint('Não há dicas disponíveis no momento');
    setTimeout(() => setHint(''), 3000);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-600 mx-auto" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchData} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Target className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-purple-800">Connect Porto Alegre</h1>
          </div>
          <p className="text-purple-600">Conecte duas pessoas digitando nomes que as ligam!</p>
        </div>

        {/* Game Status */}
        {gameState.gameStarted && (
          <Card className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Conectar:</div>
                <div className="flex items-center space-x-2 text-lg font-semibold">
                  <span className="text-blue-600">{gameState.startPerson}</span>
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-purple-600">{gameState.targetPerson}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
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
                <Button onClick={getHint} size="sm" variant="outline">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Dica
                </Button>
                <Button onClick={startNewGame} size="sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Novo Jogo
                </Button>
              </div>
            </div>

            {/* Hint */}
            {hint && (
              <div className="mt-3 text-center p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                💡 {hint}
              </div>
            )}

            {/* Game End Messages */}
            {gameState.gameWon && (
              <div className="mt-4 text-center space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <h3 className="text-xl font-bold text-green-800">Parabéns! 🎉</h3>
                <p className="text-green-700">Você conectou {gameState.startPerson} e {gameState.targetPerson}!</p>
                <div className="text-lg font-semibold text-green-800">
                  Pontuação: {gameState.score} pontos
                </div>
                <div className="text-sm text-green-600">
                  Tempo: {formatTime(gameState.timeElapsed)} | Tentativas: {gameState.attempts}
                </div>
              </div>
            )}

            {gameState.gameLost && (
              <div className="mt-4 text-center space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="w-12 h-12 text-red-600 mx-auto" />
                <h3 className="text-xl font-bold text-red-800">Game Over</h3>
                <p className="text-red-700">
                  Não foi possível conectar {gameState.startPerson} e {gameState.targetPerson}
                </p>
                <div className="text-sm text-red-600">
                  Tentativas esgotadas: {gameState.attempts}/{gameState.maxAttempts}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Start Game Button */}
        {!gameState.gameStarted && (
          <div className="text-center space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-3">Como Jogar</h3>
              <div className="text-left space-y-2 text-sm text-muted-foreground">
                <p>• Você verá duas pessoas que não estão conectadas</p>
                <p>• Digite nomes de pessoas que conhecem uma das duas</p>
                <p>• Continue até formar um caminho entre elas</p>
                <p>• Cuidado com o limite de tentativas!</p>
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
          </div>
        )}

        {/* Game Graph */}
        {gameState.gameStarted && (
          <Card className="p-6">
            <div className="flex justify-center">
              {renderGraph()}
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-700"></div>
                <span>Início ({gameState.startPerson})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded border-2 border-purple-700"></div>
                <span>Objetivo ({gameState.targetPerson})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-700"></div>
                <span>Pessoas reveladas</span>
              </div>
            </div>
          </Card>
        )}

        {/* Search Bar */}
        {gameState.gameStarted && !gameState.gameWon && !gameState.gameLost && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">
                Digite o nome de alguém que conecta as pessoas no grafo:
              </h3>
              <div className="max-w-md mx-auto flex space-x-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite o nome completo..."
                  className="text-lg"
                />
                <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Pessoas reveladas: {gameState.revealedPeople.size} | 
                Conexões: {gameState.revealedConnections.length}
              </p>
            </div>
          </Card>
        )}

        {/* Statistics */}
        <Card className="p-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Estatísticas da Rede</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-purple-600">{connections.length}</div>
                <div className="text-muted-foreground">Conexões</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {new Set([...connections.map(c => c.name1), ...connections.map(c => c.name2)]).size}
                </div>
                <div className="text-muted-foreground">Pessoas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {connections.length > 0 ? Math.round((connections.length * 2) / new Set([...connections.map(c => c.name1), ...connections.map(c => c.name2)]).size * 10) / 10 : 0}
                </div>
                <div className="text-muted-foreground">Conexões/Pessoa</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {names.filter(n => n.instagram).length}
                </div>
                <div className="text-muted-foreground">Com Instagram</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ConnectGame;