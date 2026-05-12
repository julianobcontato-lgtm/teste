import React from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Clock, User, Shield, AlertCircle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { Issue } from '../types';
import { normalizeImageUrl } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IssueDetailModalProps {
  issue: Issue;
  onClose: () => void;
}

export default function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  const statusConfig = {
    pending: { color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle, label: 'Pendente' },
    'in-progress': { color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock, label: 'Em Andamento' },
    resolved: { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, label: 'Resolvido' },
  };

  const { color, bg, icon: StatusIcon, label } = statusConfig[issue.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 overflow-hidden shrink-0 bg-blue-100 flex items-center justify-center">
          {issue.imageUrl ? (
            <img 
              src={normalizeImageUrl(issue.imageUrl)} 
              alt={issue.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-blue-400">
              <ShieldCheck size={48} />
              <span className="text-xs font-bold uppercase tracking-widest">Itapetininga Sustentável</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-6 left-8 right-8">
             <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${bg} ${color} text-xs font-bold mb-3`}>
               <StatusIcon size={14} />
               {label}
             </div>
             <h2 className="text-3xl font-black text-white leading-tight">{issue.title}</h2>
          </div>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
               <div className="flex items-center gap-2">
                 <Clock size={14} className="text-blue-500" />
                 {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true, locale: ptBR })}
               </div>
               <div className="flex items-center gap-2">
                 <User size={14} className="text-blue-500" />
                 {issue.reporterName}
               </div>
               <div className="flex items-center gap-2">
                 <Info size={14} className="text-blue-500" />
                 {issue.category === 'pothole' ? 'Buraco' : 
                  issue.category === 'lighting' ? 'Iluminação' : 
                  issue.category === 'trash' ? 'Limpeza' : 
                  issue.category === 'water' ? 'Água/Esgoto' : 'Outros'}
               </div>
            </div>

            <p className="text-gray-600 leading-relaxed text-lg">
              {issue.description}
            </p>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <MapPin className="text-blue-600 mt-1 shrink-0" size={20} />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Localização</p>
                <p className="text-sm font-medium text-gray-700">{issue.address || 'Localização marcada no mapa'}</p>
              </div>
            </div>
          </section>

          {(issue.managerComment || issue.managerPhotoUrl) && (
            <section className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="text-blue-600" size={24} />
                <h3 className="text-lg font-black text-blue-900 leading-none">Resposta da Prefeitura</h3>
              </div>
              
              {issue.managerComment && (
                <p className="text-blue-800 leading-relaxed font-medium">
                  {issue.managerComment}
                </p>
              )}

              {issue.managerPhotoUrl && (
                <div className="space-y-4">
                  <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest bg-blue-100/50 px-3 py-1 rounded-full self-start inline-block">Evidência do Serviço Realizado</p>
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-video bg-gray-200">
                    <img 
                      src={normalizeImageUrl(issue.managerPhotoUrl)} 
                      alt="Serviço realizado"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const msg = document.createElement('div');
                          msg.className = 'absolute inset-0 flex flex-col items-center justify-center text-blue-600 font-bold p-6 text-center';
                          msg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><p class="mt-2 text-sm uppercase tracking-widest">Imagem indisponível</p><p class="text-[10px] font-medium opacity-60">O link fornecido não pode ser carregado diretamente</p>';
                          parent.appendChild(msg);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
