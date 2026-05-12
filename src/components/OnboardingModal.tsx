import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, CreditCard, Save, LogOut } from 'lucide-react';

interface OnboardingModalProps {
  initialName: string;
  onSave: (data: { displayName: string; cpf: string; phone: string }) => Promise<void>;
  onLogout: () => void;
}

export default function OnboardingModal({ initialName, onSave, onLogout }: OnboardingModalProps) {
  const [name, setName] = useState(initialName);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.length < 3) {
      setError('Nome muito curto');
      return;
    }
    if (cpf.length !== 11 || !/^\d+$/.test(cpf)) {
      setError('CPF deve ter 11 dígitos numéricos');
      return;
    }
    if (phone.length < 10) {
      setError('Telefone inválido');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ displayName: name, cpf, phone });
    } catch (err) {
      setError('Erro ao salvar dados. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="bg-blue-600 p-8 text-white">
          <h2 className="text-2xl font-black mb-2">Bem-vindo ao Olá Prefeitura!</h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            Para continuar, precisamos completar o seu cadastro. Isso garante a segurança e autenticidade dos relatos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                <User size={12} /> Nome Completo
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                  <CreditCard size={12} /> CPF (11 dígitos)
                </label>
                <input
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                  placeholder="000.000.000-00"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                  <Phone size={12} /> Telefone
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all outline-none font-medium"
                  placeholder="(15) 99999-9999"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button
              disabled={isSubmitting}
              className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {isSubmitting ? 'Salvando...' : 'Finalizar Cadastro'}
            </button>
            
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-4 text-gray-400 font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
