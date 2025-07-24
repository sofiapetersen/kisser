import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddConnectionProps {
  onConnectionAdded: () => void;
  userEmail: string;
  userName: string;
}

const AddConnection = ({ onConnectionAdded, userEmail, userName }: AddConnectionProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    person1Name: '',
    person1Instagram: '',
    person2Name: '',
    person2Instagram: ''
  });
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateAndEnsureNameExists = async (name: string, instagram: string, personNumber: number) => {
    if (!name.trim()) return;
    
    // Check if name already exists
    const { data: existingName } = await supabase
      .from('names')
      .select('id')
      .eq('name', name.trim())
      .maybeSingle();

    if (!existingName) {
      // Se o nome não existe no banco e não foi fornecido Instagram, retorna erro
      if (!instagram.trim()) {
        throw new Error(`Para adicionar "${name.trim()}" pela primeira vez, é necessário informar o Instagram também.`);
      }
      
      // Insert new name with Instagram
      const { error: nameError } = await supabase
        .from('names')
        .insert([{
          name: name.trim(),
          instagram: instagram.trim()
        }]);

      if (nameError) {
        console.error('Error inserting name:', nameError);
        throw nameError;
      }
    }
    // Se o nome já existe, não precisa fazer nada adicional
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate and ensure both names exist in the names table
      await validateAndEnsureNameExists(formData.person1Name, formData.person1Instagram, 1);
      await validateAndEnsureNameExists(formData.person2Name, formData.person2Instagram, 2);

      // Get the current user's name from user_metadata or fallback to email
      const { data: { user } } = await supabase.auth.getUser();
      const createdByName = user?.user_metadata?.name || userName || userEmail;

      // Get current date and time in Brazilian format
      const now = new Date();
      const brazilianDateTime = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log('Creating connection with created_by:', createdByName); // Debug log
      console.log('Brazilian date/time:', brazilianDateTime); // Debug log

      // Insert connection with created_by and created_at
      const { error } = await supabase
        .from('connections')
        .insert([{
          name1: formData.person1Name.trim(),
          name2: formData.person2Name.trim(),
          status: 'pending',
          created_by: createdByName, // Usar o nome correto do usuário
          created_at: brazilianDateTime // Data e hora em formato brasileiro
        }]);

      if (error) {
        console.error('Error creating connection:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar conexão. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conexão criada!",
        description: "A conexão foi enviada para um admin aprovar!",
      });

      // Reset form
      setFormData({
        person1Name: '',
        person1Instagram: '',
        person2Name: '',
        person2Instagram: ''
      });

      onConnectionAdded();
    } catch (error) {
      console.error('Error creating connection:', error);
      
      // Check if it's our custom validation error
      if (error instanceof Error && error.message.includes('é necessário informar o Instagram')) {
        toast({
          title: "Instagram obrigatório",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Heart className="w-6 h-6 text-primary" />
          <CardTitle>Adicionar Conexão</CardTitle>
        </div>
        <CardDescription>
          Conte para todos sobre uma conexão que rolou! Essa conexão será revisada por um admin antes de aparecer na rede.
          <br />
          <span className="text-sm text-muted-foreground mt-1 block">
            * Se a pessoa ainda não está no sistema, o Instagram é obrigatório.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pessoa 1 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Primeira Pessoa</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="person1Name">Nome *</Label>
                <Input
                  id="person1Name"
                  name="person1Name"
                  type="text"
                  placeholder="Nome da primeira pessoa"
                  value={formData.person1Name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="person1Instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="person1Instagram"
                    name="person1Instagram"
                    type="text"
                    placeholder="username"
                    value={formData.person1Instagram}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Pessoa 2 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Segunda Pessoa</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="person2Name">Nome *</Label>
                <Input
                  id="person2Name"
                  name="person2Name"
                  type="text"
                  placeholder="Nome da segunda pessoa"
                  value={formData.person2Name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="person2Instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="person2Instagram"
                    name="person2Instagram"
                    type="text"
                    placeholder="username"
                    value={formData.person2Instagram}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adicionando...' : 'Adicionar Conexão'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddConnection;