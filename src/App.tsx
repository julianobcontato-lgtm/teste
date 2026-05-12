import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Map as MapIcon, 
  LayoutGrid, 
  Plus, 
  TrendingUp, 
  Users, 
  CheckCircle,
  Menu,
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  Settings,
  AlertTriangle,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, loginWithGoogle, handleFirestoreError, OperationType, testConnection } from './lib/firebase';
import MapView from './components/Map';
import IssueCard from './components/IssueCard';
import ReportForm from './components/ReportForm';
import OnboardingModal from './components/OnboardingModal';
import AuthModal from './components/AuthModal';
import IssueDetailModal from './components/IssueDetailModal';
import { Issue, IssueCategory, User } from './types';

const ADMIN_EMAIL = 'julianob.contato@gmail.com';

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showReportForm, setShowReportForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [settingsCpf, setSettingsCpf] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');

  const [managerComment, setManagerComment] = useState('');
  const [managerPhotoUrl, setManagerPhotoUrl] = useState('');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  const isAdmin = userProfile?.role === 'admin';
  const isEditor = userProfile?.role === 'editor' || isAdmin;

  useEffect(() => {
    testConnection();
    
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch/Create user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as User;
          setUserProfile(profile);
          setSettingsCpf(profile.cpf || '');
          setSettingsPhone(profile.phone || '');
          
          // Sync display name if it changed or was initialized as default
          if (user.displayName && profile.displayName !== user.displayName) {
            try {
              await setDoc(doc(db, 'users', user.uid), { displayName: user.displayName }, { merge: true });
              setUserProfile(prev => prev ? { ...prev, displayName: user.displayName } : prev);
            } catch (e) {
              console.error("Failed to update display name", e);
            }
          }

          // Check for onboarding
          if (!profile.cpf || !profile.phone) {
            setShowOnboarding(true);
          } else {
            setShowOnboarding(false);
          }
        } else {
          try {
            const newProfile: User = {
              uid: user.uid,
              displayName: user.displayName || 'Cidadão',
              email: user.email,
              photoURL: user.photoURL,
              role: user.email === ADMIN_EMAIL ? 'admin' : 'citizen',
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setUserProfile(newProfile);
            setShowOnboarding(true);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          }
        }
      } else {
        setUserProfile(null);
        setShowOnboarding(false);
      }
      setIsLoading(false);
    });

    // Firestore Listener
    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        };
      }) as Issue[];
      setIssues(reportsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReports();
    };
  }, []);

  const filteredIssues = selectedCategory === 'all' 
    ? issues 
    : issues.filter(i => i.category === selectedCategory);

  const stats = {
    total: issues.length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    inProgress: issues.filter(i => i.status === 'in-progress').length,
    pending: issues.filter(i => i.status === 'pending').length,
  };

  const handleReportSubmit = async (data: any) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      await addDoc(collection(db, 'reports'), {
        ...data,
        status: 'pending',
        reporterName: data.isAnonymous ? 'Cidadão Anônimo' : (currentUser.displayName || 'Anonimo'),
        actualReporterName: currentUser.displayName || 'Identificado', // Always stored for admin
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleUpdateSettings = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        cpf: settingsCpf,
        phone: settingsPhone,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert('Configurações atualizadas!');
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleOnboardingSave = async (data: { displayName: string; cpf: string; phone: string }) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        displayName: data.displayName,
        cpf: data.cpf,
        phone: data.phone,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      const updatedProfile = { 
        ...userProfile, 
        ...data 
      } as User;
      
      setUserProfile(updatedProfile);
      setSettingsCpf(data.cpf);
      setSettingsPhone(data.phone);
      setShowOnboarding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleProposeEdit = async (id: string, proposedData: any) => {
    try {
      await setDoc(doc(db, 'reports', id), {
        proposedChanges: proposedData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert('Sua alteração foi enviada para aprovação do administrador!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const handleApproveChanges = async (id: string, proposed: any) => {
    try {
      const { title, description, category } = proposed;
      await setDoc(doc(db, 'reports', id), {
        title,
        description,
        category,
        proposedChanges: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert('Alterações aprovadas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Deseja excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const normalizeImageUrl = (url: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      if (u.hostname === 'imgur.com') {
        const id = u.pathname.split('/').pop();
        if (id && !id.includes('.')) {
          return `https://i.imgur.com/${id}.png`;
        }
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleAdminUpdate = async (id: string, status: string) => {
    try {
      const fixedUrl = normalizeImageUrl(managerPhotoUrl);
      await setDoc(doc(db, 'reports', id), {
        status,
        managerComment,
        managerPhotoUrl: fixedUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUpdatingReportId(null);
      setManagerComment('');
      setManagerPhotoUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await setDoc(doc(db, 'reports', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight tracking-tight">
                  Olá Prefeitura
                </h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Itapetininga</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid size={18} />
                  Feed
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <MapIcon size={18} />
                  Mapa
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                {currentUser ? (
                  <div className="flex items-center gap-4 border-r border-gray-100 pr-6">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowSettings(true)}>
                       {currentUser.photoURL ? (
                         <img src={currentUser.photoURL} className="w-8 h-8 rounded-full border border-gray-100 group-hover:border-blue-300 transition-all" alt="" referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-all">
                           <UserIcon size={16} />
                         </div>
                       )}
                       <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Minha Conta</span>
                         <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-all">{currentUser.displayName?.split(' ')[0]}</span>
                       </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      title="Sair"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 hover:bg-blue-50 rounded-xl"
                  >
                    Entrar
                  </button>
                )}

                <button 
                  onClick={() => setShowReportForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  <Plus size={20} />
                  Relatar
                </button>
              </div>
            </div>

            <button 
              className="md:hidden p-2 text-gray-500"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-12 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-6">
                Zeladoria Urbana Participativa
              </span>
              <h2 className="text-6xl sm:text-7xl font-black text-gray-900 leading-[0.95] tracking-tighter mb-8 italic italic-serif">
                Sua cidade, <br/>
                <span className="text-blue-600 not-italic">sob seus olhos.</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-lg mb-10">
                Uma Itapetininga mais limpa, iluminada e segura começa com você. Relate problemas urbanos em segundos e acompanhe a resolução em tempo real.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{stats.resolved}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resolvidos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-orange-500">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{stats.inProgress}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Em Andamento</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{stats.pending}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pendentes</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-blue-600/5 rounded-[4rem] blur-3xl -z-10"></div>
              <div className="bg-white p-4 rounded-[3rem] shadow-2xl shadow-blue-100 border border-white transform hover:-rotate-2 transition-transform duration-700">
                <div className="h-[400px] bg-gray-50 rounded-[2.5rem] overflow-hidden relative group">
                  <MapView issues={issues} />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-900 border border-white shadow-sm group-hover:scale-105 transition-transform">
                    LIVES FEED: ITAPETININGA
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pothole', 'lighting', 'trash', 'water', 'other'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-2xl text-xs font-bold transition-all border-2 ${selectedCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                {cat === 'all' ? 'Todos' : 
                 cat === 'pothole' ? 'Buracos' : 
                 cat === 'lighting' ? 'Iluminação' : 
                 cat === 'trash' ? 'Limpeza' : 
                 cat === 'water' ? 'Água/Esgoto' : 'Outros'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar ocorrências..." 
              className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* View Selection Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredIssues.map((issue: Issue) => (
                <div key={issue.id} className="relative group/card">
                  <IssueCard issue={issue} isAdmin={isAdmin} onClick={(i) => setSelectedIssue(i)} />
                  
                  {/* Administrative Controls overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-all flex flex-col gap-2">
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(issue.id); }}
                        className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                        title="Excluir Registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {isAdmin && issue.proposedChanges && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApproveChanges(issue.id, issue.proposedChanges); }}
                        className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                        title="Aprovar Alterações"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    
                    {isEditor && updatingReportId !== issue.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUpdatingReportId(issue.id); }}
                        className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                        title="Atualizar Status"
                      >
                        <Settings size={16} />
                      </button>
                    )}

                    {currentUser?.uid === issue.userId && issue.status !== 'resolved' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingIssue(issue); }}
                        className="p-2 bg-orange-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center font-bold text-[10px]"
                        title="Editar Registro"
                      >
                        EDIT
                      </button>
                    )}
                  </div>

                  {/* Editor Update Panel */}
                  <AnimatePresence>
                    {updatingReportId === issue.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-white rounded-2xl border-2 border-blue-100 shadow-inner space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Atualizar Acompanhamento</h4>
                          <button onClick={() => setUpdatingReportId(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <select 
                            value={issue.status}
                            onChange={(e) => handleAdminUpdate(issue.id, e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                          >
                            <option value="pending">Pendente</option>
                            <option value="in-progress">Em Andamento</option>
                            <option value="resolved">Resolvido</option>
                          </select>

                          <textarea 
                            placeholder="Comentário da prefeitura..."
                            value={managerComment}
                            onChange={(e) => setManagerComment(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-blue-300 transition-all resize-none"
                            rows={3}
                          />

                          <div className="space-y-1">
                            <input 
                              placeholder="Link da foto do serviço (URL)..."
                              value={managerPhotoUrl}
                              onChange={(e) => setManagerPhotoUrl(e.target.value)}
                              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-blue-300 transition-all font-mono"
                            />
                            <p className="text-[9px] text-gray-400 px-1 font-bold">Use links diretos (ex: terminando em .jpg, .png)</p>
                          </div>

                          {managerPhotoUrl && (
                            <div className="relative h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group/preview">
                               <img 
                                 src={normalizeImageUrl(managerPhotoUrl)} 
                                 alt="Preview" 
                                 className="w-full h-full object-cover"
                                 referrerPolicy="no-referrer"
                                 onError={(e) => {
                                   const target = e.currentTarget as HTMLImageElement;
                                   const parent = target.parentElement;
                                   if (parent) {
                                     parent.classList.add('flex', 'items-center', 'justify-center');
                                     parent.innerHTML = '<span class="text-[10px] text-red-500 font-bold px-4 text-center">Link Inválido: Use o link direto da imagem</span>';
                                   }
                                 }}
                               />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <span className="text-white text-[10px] font-bold">Preview do Serviço</span>
                               </div>
                            </div>
                          )}

                          <button 
                            onClick={() => handleAdminUpdate(issue.id, issue.status)}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
                          >
                            Salvar Atualização
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {filteredIssues.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Search size={40} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-800">Nenhum resultado encontrado</h4>
                  <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[600px] w-full"
            >
              <MapView issues={filteredIssues} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm font-medium">© 2026 Olá Prefeitura. Juntos por uma Itapetininga melhor.</p>
        </div>
      </footer>

      {/* Floating Action Button for mobile */}
      <div className="fixed bottom-8 right-8 md:hidden z-[100]">
        <button 
          onClick={() => setShowReportForm(true)}
          className="w-16 h-16 bg-blue-600 rounded-3xl text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReportForm && (
          <ReportForm 
            onClose={() => setShowReportForm(false)} 
            onSubmit={handleReportSubmit}
          />
        )}
        {editingIssue && (
          <ReportForm 
            title="Sugerir Alteração"
            initialData={editingIssue}
            onClose={() => setEditingIssue(null)} 
            onSubmit={(data) => handleProposeEdit(editingIssue.id, data)}
          />
        )}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
                <div>
                  <h2 className="text-xl font-bold">Configurações</h2>
                  <p className="text-gray-400 text-xs">Atualize seus dados cadastrais</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-gray-400">CPF (11 dígitos)</label>
                  <input
                    value={settingsCpf}
                    onChange={e => setSettingsCpf(e.target.value)}
                    className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl transition-all outline-none"
                    placeholder="Somente números"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Telefone / WhatsApp</label>
                  <input
                    value={settingsPhone}
                    onChange={e => setSettingsPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl transition-all outline-none"
                    placeholder="(15) 99999-9999"
                  />
                </div>
                <button
                  onClick={handleUpdateSettings}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Settings size={18} />
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showOnboarding && currentUser && (
          <OnboardingModal 
            initialName={currentUser.displayName || ''} 
            onSave={handleOnboardingSave} 
            onLogout={handleLogout}
          />
        )}
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}
        {selectedIssue && (
          <IssueDetailModal 
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
