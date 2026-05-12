import { motion } from 'motion/react';
import React from 'react';
import { MapPin, Clock, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Issue } from '../types';
import { normalizeImageUrl } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IssueCardProps {
  issue: Issue;
  isAdmin?: boolean;
  onClick: (issue: Issue) => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, isAdmin, onClick }) => {
  const statusConfig = {
    pending: { color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle, label: 'Pendente' },
    'in-progress': { color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock, label: 'Em Andamento' },
    resolved: { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, label: 'Resolvido' },
  };

  const { color, bg, icon: StatusIcon, label } = statusConfig[issue.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(issue)}
      className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col gap-3"
    >
      <div className="flex justify-between items-start">
        <div className={`px-3 py-1 rounded-full ${bg} ${color} text-xs font-semibold flex items-center gap-1.5`}>
          <StatusIcon size={14} />
          {label}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
          {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{issue.title}</h3>
        <p className="text-gray-500 text-sm line-clamp-2 mt-1">{issue.description}</p>
        <div className="mt-2 flex flex-col gap-1">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded border border-gray-100 self-start">
             Relator: {issue.reporterName}
           </span>
           {isAdmin && issue.isAnonymous && (
             <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded border border-blue-100 self-start">
               Real: {issue.actualReporterName || 'N/A'} {issue.cpf ? `(CPF: ${issue.cpf})` : ''}
             </span>
           )}
           {issue.proposedChanges && (
             <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 self-start mt-1">
               💡 ALTERAÇÃO PENDENTE DE APROVAÇÃO
             </span>
           )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <MapPin size={14} />
          <span className="truncate max-w-[200px]">{issue.address || 'Localização via Mapa'}</span>
        </div>
      </div>

      {(issue.managerComment || issue.managerPhotoUrl) && (
        <div className="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 font-mono">Feedback da Prefeitura</p>
          {issue.managerComment && <p className="text-xs text-blue-800 line-clamp-2">{issue.managerComment}</p>}
          {issue.managerPhotoUrl && (
            <div className="relative group/manager mt-2">
              <img 
                src={normalizeImageUrl(issue.managerPhotoUrl)} 
                alt="Evidência" 
                className="w-full h-32 object-cover rounded-lg border border-blue-200" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=400';
                  target.classList.add('opacity-40', 'grayscale');
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/manager:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <span className="text-white text-[10px] font-bold uppercase transition-transform group-hover/manager:scale-110">Ver Detalhes</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
           Clique para ver detalhes
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  );
};

export default IssueCard;
