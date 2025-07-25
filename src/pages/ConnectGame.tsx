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
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Home,
  Plus,
  Trophy,
  UserIcon,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import NetworkGraph from '@/components/NetworkGraph';
import Auth from '@/components/Auth';
import Profile from '@/components/Profile';
import type { User, Session } from '@supabase/supabase-js';

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    startPerson: '',
    targetPerson: '',
    revealedPeople: new Set(),
    revealedConnections: [],
    gameStarted: false,
    gameWon: false,
    gameLost: false,
    attempts: 0,
    maxAttempts: 100,
    timeStarted: 0,
    timeElapsed: 0,
    score: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [names, setNames] = useState<Name[]>([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  

  const checkAdminStatus = async (email?: string) => {
    if (!email) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('type')
        .eq('email', email)
        .single();

      if (!error && data) {
        setIsAdmin(data.type === 'admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowAddConnection(false);
    setShowAuth(false);
    setShowProfile(false);
    setShowUserDropdown(false);
  };

  const handleAuthSuccess = (userData: User, sessionData: Session) => {
    setUser(userData);
    setSession(sessionData);
    setShowAuth(false);
    if (userData.email) {
      checkAdminStatus(userData.email);
    }
  };

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.email);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.email);
      }
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

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

  // Clear search error when search query changes
  useEffect(() => {
    if (searchError) {
      setSearchError(null);
    }
  }, [searchQuery]);

  // Get all unique people from connections
  const getAllPeople = (): string[] => {
    const allPeople = new Set<string>();
    connections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });
    return Array.from(allPeople).sort();
  };

  // Filter suggestions based on search query
  const getFilteredSuggestions = (): string[] => {
    if (!searchQuery.trim()) return [];
    
    const allPeople = getAllPeople();
    const query = searchQuery.toLowerCase().trim();
    
    return allPeople
      .filter(name => 
        name.toLowerCase().includes(query) && 
        !gameState.revealedPeople.has(name)
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedSuggestionIndex(-1);
  };

  // Handle suggestion selection - MODIFICADO para fazer submit automático
  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Fazer submit automático após selecionar a sugestão
    setTimeout(() => {
      handleSearchWithName(suggestion);
    }, 0);
  };

  // Simple graph visualization
  const renderGraph = () => {
  if (!gameState.gameStarted) return null;

  const revealedPeopleArray = Array.from(gameState.revealedPeople);
  
  // Dimensões responsivas
  const isMobile = window.innerWidth < 768;
  const svgWidth = isMobile ? 350 : 1400;
  const svgHeight = isMobile ? 300 : 720;
  const radius = isMobile ? 80 : 150;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const nodeRadius = isMobile ? 20 : 30;
  const fontSize = isMobile ? 10 : 12;
  
  // Create a simple layout
  const nodePositions = revealedPeopleArray.reduce((acc, person, index) => {
    const angle = (index / revealedPeopleArray.length) * 2 * Math.PI;
    
    acc[person] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
    return acc;
  }, {} as Record<string, {x: number, y: number}>);

  return (
    <div className="w-full overflow-x-auto">
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        className="border rounded bg-white mx-auto"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
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
              stroke="#9b0c2f"
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
          const color = isStart ? '#dc1c54' : isTarget ? '#fe6285' : '#9b0c2f';
          
          return (
            <g key={person}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={color}
                stroke={isStart ? '#9b0c2f' : isTarget ? '#e31d55' : '#ffffff'}
                strokeWidth="3"
              />
              <text
                x={pos.x}
                y={pos.y + nodeRadius + 15}
                textAnchor="middle"
                fill="black"
                fontSize={fontSize}
                fontWeight="bold"
              >
                {person}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
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
      maxAttempts: 100,
      timeStarted: Date.now(),
      timeElapsed: 0,
      score: 0
    });
    
    setSearchQuery('');
    setShowSuggestions(false);
    setHint('');
    setSearchError(null);
  };

  // Handle search with specific name - NOVA FUNÇÃO
  const handleSearchWithName = (nameToSearch: string) => {
    if (!nameToSearch.trim() || gameState.gameWon || gameState.gameLost) return;

    const searchName = nameToSearch.trim();
    const newAttempts = gameState.attempts + 1;

    console.log('Searching for:', searchName);

    // Check if this person exists in our connections
    const allPeople = new Set<string>();
    connections.forEach(conn => {
      allPeople.add(conn.name1);
      allPeople.add(conn.name2);
    });

    if (!allPeople.has(searchName)) {
      console.log('Person not found in connections');
      setSearchError('Pessoa não encontrada no banco de dados');
      
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
      setShowSuggestions(false);
      return;
    }

    // Check if person is already revealed
    if (gameState.revealedPeople.has(searchName)) {
      setSearchError('Esta pessoa já foi revelada');
      setSearchQuery('');
      setShowSuggestions(false);
      return;
    }

    console.log('Person found, checking connections with revealed people...');

    // Check if this person has any connection with the revealed people
    const hasConnectionWithRevealed = Array.from(gameState.revealedPeople).some(revealedPerson => 
      areDirectlyConnected(searchName, revealedPerson)
    );

    if (!hasConnectionWithRevealed) {
      console.log('Person has no connections with revealed people');
      setSearchError('Esta pessoa não tem conexão com nenhuma das pessoas já reveladas');
      
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
      setShowSuggestions(false);
      return;
    }

    console.log('Person has connections with revealed people, adding...');

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

    console.log('New connections found:', newConnections);

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
    console.log('Game won?', gameWon);

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
    setShowSuggestions(false);
    setSearchError(null);
  };

  // Handle search submission - MODIFICADO para usar a nova função
  const handleSearch = () => {
    handleSearchWithName(searchQuery);
  };

  // Handle Enter key and arrow navigation
  const handleKeyPress = (e: React.KeyboardEvent) => {
    const suggestions = getFilteredSuggestions();
    
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectSuggestion(suggestions[selectedSuggestionIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
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
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-[#fe6285] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#fe6285]">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-[#9b0c2f] mx-auto" />
          <p className="text-[#9b0c2f]">{error}</p>
          <Button onClick={() => setError(null)} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const filteredSuggestions = getFilteredSuggestions();

  // Se estiver mostrando o modal de autenticação
  if (showAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
        <Auth onAuthSuccess={handleAuthSuccess} />
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={() => setShowAuth(false)}
          >
            Voltar para o jogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <a href='/'> <img src="/logo.png" alt="Logo Kisser" className="h-8" /></a>
            </div>
            
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  {/* User Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="hidden sm:flex items-center space-x-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        Olá, {user.user_metadata?.name || user.email}!
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>

                    {/* Mobile user button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="sm:hidden"
                    >
                      <UserIcon className="w-4 h-4" />
                    </Button>

                    {/* Dropdown Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <div className="px-3 py-2 text-sm text-muted-foreground border-b sm:hidden">
                            {user.user_metadata?.name || user.email}
                          </div>
                          <button
                            onClick={() => {
                              setShowProfile(true);
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm hover:bg-secondary transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Meu Perfil
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                window.location.href = '/admin';
                                setShowUserDropdown(false);
                              }}
                              className="flex items-center w-full px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Painel Admin
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleLogout();
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-destructive"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/admin'}
                      className="hidden lg:flex"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Painel Admin
                    </Button>
                  )}
                  
                  
                </>
              ) : (
                <>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAuth(true)}
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                </>
              )}
              <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/'}
                      className="hidden lg:flex"
                    >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </div>
            
          </div>
          
          {/* Mobile admin button - removido já que agora está no dropdown */}
        </div>
      </header>
      <br></br>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <img src="/game.png" alt="Kisser Game" className="h-12" />
          </div>
          <p className="text-[#fd6385]">Conecte duas pessoas digitando nomes que as ligam!</p>
        </div>
        <br></br>

        {/* Game Status */}
        {gameState.gameStarted && (
          <Card className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Conectar:</div>
                <div className="flex items-center space-x-2 text-lg font-semibold">
                  <span className="text-[#db1c55]">{gameState.startPerson}</span>
                  <ArrowLeftRight className="w-5 h-5" />
                  <span className="text-[#fe6487]">{gameState.targetPerson}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <p className="text-sm text-muted-foreground">
                    Pessoas reveladas: {gameState.revealedPeople.size} | 
                    Conexões: {gameState.revealedConnections.length}
                  </p>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(gameState.timeElapsed)}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={startNewGame} size="sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Novo Jogo
                </Button>
                <Button onClick={getHint} size="sm" variant="outline">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Dica
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
                <h3 className="text-xl font-bold text-green-800">Parabéns!</h3>
                <p className="text-green-700">Você conectou {gameState.startPerson} e {gameState.targetPerson}!</p>
                <div className="flex items-center justify-center space-x-4 mt-2">
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
                <p>• Digite nomes de pessoas que têm conexão com uma das duas</p>
                <p>• Continue até formar um caminho entre elas</p>
              </div>
            </div>
            <Button 
              onClick={startNewGame} 
              size="lg" 
              className="bg-[#0f172a] hover:bg-[#0f172a]/90"
              disabled={connections.length === 0}
            >
              <Play className="w-5 h-5 mr-2" />
              {connections.length === 0 ? 'Sem conexões disponíveis' : 'Iniciar Jogo'}
            </Button>
          </div>
        )}

        {/* Search Bar */}
        {gameState.gameStarted && !gameState.gameWon && !gameState.gameLost && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">
                Digite uma pessoa:
              </h3>
              <div className="max-w-md mx-auto relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onKeyDown={handleKeyPress}
                      onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                      placeholder="Digite o nome completo..."
                      className="text-lg"
                      autoComplete="off"
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div 
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
                      >
                        {filteredSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                              index === selectedSuggestionIndex ? 'bg-blue-50 text-blue-600' : ''
                            }`}
                            onClick={() => selectSuggestion(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleSearch} className="flex space-x-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
              
              {/* Search Error Display */}
              {searchError && (
                <div className="text-center p-3 bg-red-50 border border-red-200 rounded text-red-800">
                  ❌ {searchError}
                </div>
              )}
              
              {searchQuery.trim() && filteredSuggestions.length === 0 && !searchError && (
                <p className="text-sm text-yellow-600">
                  Nenhuma pessoa encontrada com esse nome
                </p>
              )}
            </div>
          </Card>
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
                <div className="w-4 h-4 bg-[#e31d55] rounded border-2 border-[#9b0c2f]"></div>
                <span>{gameState.startPerson}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#fe6186] rounded border-2 border-[#dc1c54]"></div>
                <span>{gameState.targetPerson}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#9b0c2f] rounded border-2 border-[#ffffff]"></div>
                <span>Pessoas reveladas</span>
              </div>
            </div>
          </Card>
        )}

        

      
    </div>
  );
};

export default ConnectGame;