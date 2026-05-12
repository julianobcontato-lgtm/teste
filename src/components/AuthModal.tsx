import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, LogIn, UserPlus, X, AlertCircle } from 'lucide-react';
import { 
  auth, 
  loginWithGoogle 
} from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasUppercase = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    return hasMinLength && hasUppercase && hasNumber;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Nome é obrigatório');
        return;
      }
      if (!validatePassword(password)) {
        setError('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula e um número');
        return;
      }
    }

    if (mode === 'reset') {
      if (!email) {
        setError('Por favor, insira seu e-mail.');
        return;
      }
      setIsLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
        setTimeout(() => setMode('login'), 5000);
      } catch (err: any) {
        setError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
        alert('Conta criada! Por favor, verifique seu e-mail.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else if (err.code === 'auth/operation-not-allowed') setError('O cadastro por e-mail não está habilitado. Ative-o em "Authentication > Sign-in method" no Console do Firebase.');
      else if (err.code === 'auth/weak-password') setError('A senha fornecida é muito fraca.');
      else setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err) {
      setError('Falha no login com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-blue-600 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-black mb-2">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Crie sua conta' : 'Recuperar senha'}
          </h2>
          <p className="text-blue-100 text-sm">
            {mode === 'login' 
              ? 'Acesse sua conta para relatar e acompanhar ocorrências.' 
              : mode === 'signup' 
                ? 'Junte-se a nós para tornar Itapetininga uma cidade melhor.'
                : 'Insira seu e-mail para receber um link de redefinição.'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                  <User size={12} /> Nome Completo
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                <Mail size={12} /> E-mail
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                placeholder="seu@email.com"
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                    <Lock size={12} /> Senha
                  </label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                  placeholder="••••••••"
                />
                {mode === 'signup' && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Mínimo 8 caracteres, 1 maiúscula e 1 número.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl border border-green-100">
                {success}
              </div>
            )}

            <button
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mode === 'login' ? <LogIn size={18} /> : mode === 'signup' ? <UserPlus size={18} /> : <Mail size={18} />}
              {isLoading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Cadastrar' : 'Enviar Link')}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-white text-gray-400 uppercase tracking-widest font-bold">Ou continue com</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-[1.5rem] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Google Login
              </button>
            </>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setError(null);
                setSuccess(null);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {mode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
