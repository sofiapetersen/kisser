import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, Clock, User, Instagram, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Connection {
  id: number;
  name1: string;
  name2: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_by: string;
  created_at: string;
  person1_instagram?: string;
  person2_instagram?: string;
}

const Admin = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('users')
        .select('type')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
        return;
      }

      if (data?.type !== 'admin') {
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchAllConnections = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('connections')
        .select('id, name1, name2, status, created_by, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connections:', error);
        return;
      }

      const connectionsWithInstagram = await Promise.all(
        (data || []).map(async (connection) => {
          const { data: person1Data } = await supabase
            .from('names')
            .select('instagram')
            .eq('name', connection.name1)
            .maybeSingle();

          const { data: person2Data } = await supabase
            .from('names')
            .select('instagram')
            .eq('name', connection.name2)
            .maybeSingle();

          return {
            ...connection,
            status: connection.status as 'pending' | 'accepted' | 'rejected',
            person1_instagram: person1Data?.instagram || undefined,
            person2_instagram: person2Data?.instagram || undefined,
          };
        })
      );

      setConnections(connectionsWithInstagram);
      setPendingConnections(connectionsWithInstagram.filter(conn => conn.status === 'pending'));
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllConnections();
    }
  }, [isAdmin]);

  const handleApproval = async (connectionId: number, approved: boolean) => {
    try {
      const newStatus = approved ? 'accepted' : 'rejected';

      const { error } = await supabase
        .from('connections')
        .update({ status: newStatus })
        .eq('id', connectionId);

      if (error) {
        console.error('Error updating connection:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar conexão.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: approved ? "Conexão aprovada!" : "Conexão rejeitada!",
        description: approved 
          ? "A conexão agora aparece na rede." 
          : "A conexão foi rejeitada e não aparecerá na rede.",
      });

      fetchAllConnections();
    } catch (error) {
      console.error('Error handling approval:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (connectionId: number) => {
    if (!window.confirm('Tem certeza que deseja apagar esta conexão permanentemente?')) {
      return;
    }

    try {
      console.log('Tentando apagar conexão com ID:', connectionId);
      console.log('Tipo do connectionId:', typeof connectionId);
      
      // Primeiro, vamos verificar se a conexão existe e pegar todos os dados
      const { data: existingConnection, error: checkError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      console.log('Dados da conexão existente:', existingConnection);
      console.log('Erro na verificação:', checkError);

      if (checkError) {
        console.error('Erro ao verificar conexão:', checkError);
        toast({
          title: "Erro",
          description: "Conexão não encontrada.",
          variant: "destructive",
        });
        return;
      }

      if (!existingConnection) {
        toast({
          title: "Erro",
          description: "Conexão não encontrada no banco de dados.",
          variant: "destructive",
        });
        return;
      }

      // Vamos tentar com diferentes abordagens
      console.log('Tentativa 1: Delete com eq(id, connectionId)');
      const { error: deleteError1, data: deletedData1, count } = await supabase
        .from('connections')
        .delete({ count: 'exact' })
        .eq('id', connectionId)
        .select();

      console.log('Resultado delete 1:', { error: deleteError1, data: deletedData1, count });

      if (deleteError1) {
        console.error('Erro no delete 1:', deleteError1);
        
        // Tentativa 2: Verificar se é problema de tipo
        console.log('Tentativa 2: Delete convertendo ID para string');
        const { error: deleteError2, data: deletedData2 } = await supabase
          .from('connections')
          .delete()
          .eq('id', connectionId)
          .select();

        console.log('Resultado delete 2:', { error: deleteError2, data: deletedData2 });

        if (deleteError2) {
          console.error('Erro no delete 2:', deleteError2);
          
          // Tentativa 3: Usar match em vez de eq
          console.log('Tentativa 3: Delete com match');
          const { error: deleteError3, data: deletedData3 } = await supabase
            .from('connections')
            .delete()
            .match({ id: connectionId })
            .select();

          console.log('Resultado delete 3:', { error: deleteError3, data: deletedData3 });

          if (deleteError3) {
            toast({
              title: "Erro",
              description: `Erro ao apagar conexão: ${deleteError3.message}`,
              variant: "destructive",
            });
            return;
          }

          if (!deletedData3 || deletedData3.length === 0) {
            toast({
              title: "Erro de permissão",
              description: "Possível problema com políticas RLS. Verifique as permissões no Supabase.",
              variant: "destructive",
            });
            return;
          }

          // Se chegou até aqui, o delete 3 funcionou
          console.log('Delete 3 funcionou:', deletedData3);
        } else {
          // Delete 2 funcionou
          if (!deletedData2 || deletedData2.length === 0) {
            toast({
              title: "Erro de permissão", 
              description: "Possível problema com políticas RLS. Verifique as permissões no Supabase.",
              variant: "destructive",
            });
            return;
          }
          console.log('Delete 2 funcionou:', deletedData2);
        }
      } else {
        // Delete 1 funcionou
        if (!deletedData1 || deletedData1.length === 0) {
          toast({
            title: "Erro de permissão",
            description: "Possível problema com políticas RLS. Verifique as permissões no Supabase.",
            variant: "destructive",
          });
          return;
        }
        console.log('Delete 1 funcionou:', deletedData1);
      }

      console.log('Conexão deletada com sucesso!');

      toast({
        title: "Conexão apagada!",
        description: "A conexão foi removida permanentemente.",
      });

      // Atualiza a lista imediatamente removendo da state local
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setPendingConnections(prev => prev.filter(conn => conn.id !== connectionId));
      
      // E também busca novamente do banco para garantir sincronização
      await fetchAllConnections();

    } catch (error) {
      console.error('Erro inesperado ao apagar conexão:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao tentar apagar a conexão.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Se já está no formato brasileiro, retorna como está
      if (dateString.includes('/') && dateString.includes(',')) {
        return dateString;
      }

      // Tenta converter de ISO string ou outros formatos
      const date = new Date(dateString);
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida recebida:', dateString);
        return dateString; // Retorna a string original se não conseguir converter
      }

      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error, 'Data recebida:', dateString);
      return dateString; // Retorna a string original em caso de erro
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Acesso negado. Você não tem permissões de administrador.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Painel de Administração</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Button>
      </div>

      {pendingConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conexões Pendentes</CardTitle>
            <CardDescription>
              {pendingConnections.length} conexão(ões) aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingConnections.map(connection => (
                <Card key={connection.id} className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{connection.name1}</span>
                            {connection.person1_instagram && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Instagram className="w-3 h-3" />
                                <a 
                                  href={`https://www.instagram.com/${connection.person1_instagram}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {connection.person1_instagram}
                                </a>
                              </div>
                            )}
                          </div>
                          <span className="text-muted-foreground mx-2">💋</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{connection.name2}</span>
                            {connection.person2_instagram && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Instagram className="w-3 h-3" />
                                <a 
                                  href={`https://www.instagram.com/${connection.person2_instagram}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {connection.person2_instagram}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>Por: {connection.created_by || 'Usuário'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(connection.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproval(connection.id, true)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproval(connection.id, false)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conexões</CardTitle>
          <CardDescription>
            Todas as conexões solicitadas ({connections.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando conexões...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma conexão encontrada!</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conexão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Solicitado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{connection.name1}</span>
                            <span className="text-muted-foreground">💋</span>
                            <span className="font-medium">{connection.name2}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {connection.person1_instagram && (
                              <div className="flex items-center space-x-1">
                                <Instagram className="w-3 h-3" />
                                <a 
                                  href={`https://www.instagram.com/${connection.person1_instagram}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {connection.person1_instagram}
                                </a>
                              </div>
                            )}
                            {connection.person2_instagram && (
                              <div className="flex items-center space-x-1">
                                <Instagram className="w-3 h-3" />
                                <a 
                                  href={`https://www.instagram.com/${connection.person2_instagram}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {connection.person2_instagram}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(connection.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{connection.created_by || 'Usuário'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(connection.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {connection.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(connection.id, true)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(connection.id, false)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(connection.id)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;