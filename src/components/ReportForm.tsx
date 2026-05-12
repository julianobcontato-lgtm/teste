import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, MapPin, X, Send, Loader2, Sparkles } from 'lucide-react';
import { IssueCategory } from '../types';
import { useState, useEffect } from 'react';
import { categorizeIssue, enhanceDescription } from '../services/geminiService';

const formSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  category: z.enum(['pothole', 'lighting', 'trash', 'water', 'other']),
  isAnonymous: z.boolean(),
  cpf: z.string().optional().refine((val) => {
    if (!val) return true;
    return val.length === 11 && /^\d+$/.test(val);
  }, 'CPF deve ter 11 dígitos numéricos'),
  address: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ReportFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  title?: string;
}

export default function ReportForm({ onClose, onSubmit, initialData, title: customTitle }: ReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>(initialData?.address ? 'manual' : 'auto');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialData?.category || 'other',
      isAnonymous: initialData?.isAnonymous || false,
      title: initialData?.title || '',
      description: initialData?.description || '',
      cpf: initialData?.cpf || '',
      address: initialData?.address || ''
    }
  });

  const isAnonymous = watch('isAnonymous');
  const description = watch('description');
  const title = watch('title');

  // Skip location if editing proposal
  const isEditing = !!initialData;

  // Auto-categorize when description changes significantly
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (description && description.length > 20) {
        const category = await categorizeIssue(description);
        setValue('category', category);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [description, setValue]);

  const handleEnhance = async () => {
    if (!description || !title) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceDescription(title, description);
      setValue('description', enhanced);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    if (!data.isAnonymous && !data.cpf) {
      alert('CPF é obrigatório para registros não anônimos');
      return;
    }

    let finalLocation = initialData?.location || { lat: -23.5916, lng: -48.0531 };

    if (!isEditing) {
      if (locationMode === 'auto') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          finalLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        } catch (err) {
          console.error("Geolocation failed", err);
          finalLocation = { lat: -23.5916 + (Math.random() - 0.5) * 0.01, lng: -48.0531 + (Math.random() - 0.5) * 0.01 };
        }
      } else if (data.address) {
        finalLocation = { lat: -23.5916, lng: -48.0531 };
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        location: finalLocation,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-2xl font-bold">{customTitle || 'Relatar Problema'}</h2>
            <p className="text-blue-100 text-sm">Ajude a melhorar Itapetininga</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Título do Problema</label>
            <input
              {...register('title')}
              className="w-full text-lg font-medium p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none"
              placeholder="Ex: Buraco na Rua Principal"
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          {!isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Categoria</label>
                <select
                  {...register('category')}
                  className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="pothole">Buraco / Rua</option>
                  <option value="lighting">Iluminação</option>
                  <option value="trash">Limpeza / Lixo</option>
                  <option value="water">Água / Esgoto</option>
                  <option value="other">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Localização</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLocationMode('auto')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${locationMode === 'auto' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                  >
                    <MapPin size={14} /> Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${locationMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                  >
                    <MapPin size={14} /> Manual (Endereço)
                  </button>
                </div>
                {locationMode === 'manual' && (
                  <input
                    {...register('address')}
                    required
                    className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl transition-all outline-none text-sm"
                    placeholder="Rua, número, bairro..."
                  />
                )}
              </div>
            </div>
          )}

          {isEditing && (
             <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Categoria</label>
                <select
                  {...register('category')}
                  className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="pothole">Buraco / Rua</option>
                  <option value="lighting">Iluminação</option>
                  <option value="trash">Limpeza / Lixo</option>
                  <option value="water">Água / Esgoto</option>
                  <option value="other">Outros</option>
                </select>
              </div>
          )}

          {!isEditing && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">Registrar anonimamente?</label>
                <input
                  type="checkbox"
                  {...register('isAnonymous')}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {!isAnonymous && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Seu CPF</label>
                  <input
                    {...register('cpf')}
                    className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl transition-all outline-none"
                    placeholder="Apenas números (11 dígitos)"
                  />
                  {errors.cpf && <p className="text-red-500 text-xs">{errors.cpf.message}</p>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Descrição Detalhada</label>
              <button
                type="button"
                onClick={handleEnhance}
                disabled={isEnhancing || !description}
                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-lg transition-all"
              >
                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Melhorar com IA
              </button>
            </div>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none resize-none"
              placeholder="Descreva o que está acontecendo..."
            />
            {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-colors font-bold"
            >
              <Camera size={20} />
              Adicionar Foto
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              Enviar Relato
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
