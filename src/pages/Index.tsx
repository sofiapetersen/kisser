import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, LogOut, Plus, Shield, User as UserIcon, ChevronDown, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import NetworkGraph from '@/components/NetworkGraph';
import Auth from '@/components/Auth';
import AddConnection from '@/components/AddConnection';
import Profile from '@/components/Profile';
import type { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setShowProfile(false);
    if (userData.email) {
      checkAdminStatus(userData.email);
    }
  };

  const handleAddConnectionClick = () => {
    if (!user) {
      setShowAuth(true);
    } else {
      setShowAddConnection(!showAddConnection);
    }
  };

  const refreshConnections = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Se estiver mostrando o perfil
  if (showProfile && user) {
    return <Profile user={user} onBack={() => setShowProfile(false)} />;
  }
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
                Voltar para a rede
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
              <img src="/logo.png" alt="Logo Kisser" className="h-8" />
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
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddConnectionClick}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddConnectionClick}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                  
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
            </div>
          </div>
          
          {/* Mobile admin button - removido já que agora está no dropdown */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Add Connection Form - só mostra se estiver logado */}
        {user && showAddConnection && (
          <AddConnection
            userEmail={user.email || ''}
            userName={user.user_metadata?.name || user.email || ''}
            onConnectionAdded={() => {
              refreshConnections();
              setShowAddConnection(false);
            }}
          />
        )}

        {/* Network Graph - sempre visível */}
        <NetworkGraph refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
};

export default Index;