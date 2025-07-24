import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, User, Mail, Lock, Save, Eye, EyeOff, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileProps {
  user: SupabaseUser;
  onBack: () => void;
}

const Profile = ({ user, onBack }: ProfileProps) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editPassword, setEditPassword] = useState(false);

  const [displayName, setDisplayName] = useState(user.user_metadata?.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { name: displayName } });
      if (error) throw error;
      setEditName(false);
      showMessage('success', 'Nome atualizado com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao atualizar nome');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (email === user.email) {
      showMessage('error', 'O novo email deve ser diferente do atual');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setEditEmail(false);
      showMessage('success', 'Um link de confirmação foi enviado para o novo email');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao atualizar email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
      showMessage('error', 'Verifique os campos de senha');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) throw new Error('Senha atual incorreta');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditPassword(false);

      showMessage('success', 'Senha atualizada com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    const doubleConfirm = window.confirm('Última chance! Confirma mesmo?');
    if (!doubleConfirm) return;

    setLoading(true);
    try {
      showMessage('error', 'Funcionalidade em desenvolvimento. Contate o suporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Dados da Conta</span>
            </CardTitle>
            <CardDescription>Gerencie suas informações pessoais</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Nome */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label>Nome de Exibição</Label>
                <Button variant="ghost" size="icon" onClick={() => setEditName(!editName)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              {!editName ? (
                <p className="text-muted-foreground">{displayName}</p>
              ) : (
                <>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  <Button onClick={handleUpdateProfile} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> Salvar Nome
                  </Button>
                </>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label>Email</Label>
                <Button variant="ghost" size="icon" onClick={() => setEditEmail(!editEmail)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              {!editEmail ? (
                <p className="text-muted-foreground">{email}</p>
              ) : (
                <>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button onClick={handleUpdateEmail} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> Atualizar Email
                  </Button>
                </>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label>Senha</Label>
                <Button variant="ghost" size="icon" onClick={() => setEditPassword(!editPassword)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              {!editPassword ? (
                <p className="text-muted-foreground">********</p>
              ) : (
                <div className="space-y-3">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button onClick={handleUpdatePassword} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> Atualizar Senha
                  </Button>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="pt-4 border-t">
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
                Excluir Conta Permanentemente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
