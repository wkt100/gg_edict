import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Scroll, 
  ShieldCheck, 
  Gavel, 
  Settings, 
  Database, 
  FileText, 
  Cpu, 
  ShieldAlert, 
  Wrench, 
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ChevronRight,
  History,
  Globe
} from 'lucide-react';
import { Task, TaskStatus, AgentRole, AuditLog, SubTask } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Lang = 'en' | 'zh';

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    appTitle: 'Edict Architecture',
    appSubtitle: 'Multi-Agent Governance',
    systemOnline: 'System Online',
    issueNew: 'Issue New Decree',
    inputPlaceholder: 'Enter your command for the empire...',
    dispatch: 'Dispatch Decree',
    recentDecrees: 'Recent Decrees',
    auditTrail: 'Audit Trail',
    ministryExecution: 'Ministry Execution',
    awaitingDispatch: 'Awaiting Dispatch',
    imperialDecreeFulfilled: 'Imperial Decree Fulfilled',
    noDecreeSelected: 'No Decree Selected',
    noDecreeHint: 'Select a task from the history or issue a new one',
    TRIAGE: 'Triage',
    PLANNING: 'Planning',
    REVIEW: 'Review',
    EXECUTING: 'Executing',
    COMPLETED: 'Completed',
    PENDING: 'Pending',
    FAILED: 'Failed',
    ESCALATED: 'Escalated',
    escalationReason: 'Escalation Reason',
    escalationHint: 'This task was vetoed 3 times. Please review and either modify the prompt or resolve the issue.',
  },
  zh: {
    appTitle: 'Edict 架构',
    appSubtitle: '多智能体治理',
    systemOnline: '系统在线',
    issueNew: '发布新法令',
    inputPlaceholder: '输入帝国的命令...',
    dispatch: '派遣法令',
    recentDecrees: '近期法令',
    auditTrail: '审计追踪',
    ministryExecution: '部门执行',
    awaitingDispatch: '等待派遣',
    imperialDecreeFulfilled: '法令已完成',
    noDecreeSelected: '未选择法令',
    noDecreeHint: '从历史记录中选择任务或发布新法令',
    TRIAGE: '分类',
    PLANNING: '规划',
    REVIEW: '审核',
    EXECUTING: '执行中',
    COMPLETED: '完成',
    PENDING: '待处理',
    FAILED: '失败',
    ESCALATED: '已升级',
    escalationReason: '升级原因',
    escalationHint: '此任务已被否决3次。请检查并修改提示词或解决问题。',
  },
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('zh');

  const t = (key: string) => I18N[lang][key] || key;

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  };

  const fetchTaskDetails = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setSelectedTask(data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTask) {
      const interval = setInterval(() => fetchTaskDetails(selectedTask.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTask?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newPrompt })
      });
      const data = await res.json();
      setNewPrompt('');
      fetchTaskDetails(data.id);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case TaskStatus.FAILED: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case TaskStatus.ESCALATED: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case TaskStatus.EXECUTING: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
  };

  const getAgentIcon = (role: AgentRole) => {
    switch (role) {
      case AgentRole.TAIZI: return <Crown className="w-4 h-4" />;
      case AgentRole.ZHONGSHU: return <Scroll className="w-4 h-4" />;
      case AgentRole.MENXIA: return <ShieldCheck className="w-4 h-4" />;
      case AgentRole.SHANGSHU: return <Gavel className="w-4 h-4" />;
      case AgentRole.HUBU: return <Database className="w-4 h-4" />;
      case AgentRole.LIBU: return <FileText className="w-4 h-4" />;
      case AgentRole.BINGBU: return <Cpu className="w-4 h-4" />;
      case AgentRole.XINGBU: return <ShieldAlert className="w-4 h-4" />;
      case AgentRole.GONGBU: return <Wrench className="w-4 h-4" />;
      case AgentRole.LIBU_HR: return <Users className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
              <Gavel className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">{t('appTitle')}</h1>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{t('appSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-full border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-all text-xs font-mono"
              title={lang === 'en' ? 'Switch to 中文' : 'Switch to English'}
            >
              <Globe className="w-3 h-3" />
              <span>{lang === 'en' ? 'EN' : '中文'}</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full border border-zinc-700/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">{t('systemOnline')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        {/* Left Column: Task Creation & List */}
        <div className="col-span-4 space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Plus className="w-3 h-3" /> {t('issueNew')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-700"
              />
              <button
                disabled={loading || !newPrompt.trim()}
                className="w-full py-3 bg-zinc-100 hover:bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dispatch')}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
              <History className="w-3 h-3" /> {t('recentDecrees')}
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => fetchTaskDetails(task.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all group",
                    selectedTask?.id === task.id 
                      ? "bg-zinc-800/50 border-zinc-700" 
                      : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", getStatusColor(task.status))}>
                      {t(task.status)}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {new Date(task.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
                    {task.title}
                  </h3>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Task Details & Execution Flow */}
        <div className="col-span-8">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Task Header */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight mb-2">{selectedTask.title}</h2>
                      <p className="text-zinc-400 text-sm">{selectedTask.description}</p>
                    </div>
                    <div className="text-right">
                      <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs", getStatusColor(selectedTask.status))}>
                        {selectedTask.status === TaskStatus.EXECUTING && <Loader2 className="w-3 h-3 animate-spin" />}
                        {t(selectedTask.status)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Visualization */}
                  <div className="relative pt-8 pb-4">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-zinc-800 -translate-y-1/2" />
                    <div className="flex justify-between relative z-10">
                      {[TaskStatus.TRIAGE, TaskStatus.PLANNING, TaskStatus.REVIEW, TaskStatus.EXECUTING, TaskStatus.COMPLETED].map((s, i) => {
                        const stepIndex = [TaskStatus.TRIAGE, TaskStatus.PLANNING, TaskStatus.REVIEW, TaskStatus.EXECUTING, TaskStatus.COMPLETED].indexOf(selectedTask.status);
                        const isPast = stepIndex >= i;
                        const isCurrent = selectedTask.status === s;
                        return (
                          <div key={s} className="flex flex-col items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500",
                              isPast ? "bg-zinc-100 border-zinc-100 text-black" : "bg-zinc-950 border-zinc-800 text-zinc-700",
                              isCurrent && "ring-4 ring-zinc-100/20 scale-110"
                            )}>
                              {isPast && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                            </div>
                            <span className={cn("text-[10px] font-mono uppercase tracking-widest", isPast ? "text-zinc-300" : "text-zinc-600")}>
                              {t(s)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Escalation Reason */}
                {selectedTask.status === TaskStatus.ESCALATED && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6"
                  >
                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> {t('ESCALATED')} — {t('escalationReason')}
                    </h3>
                    {(selectedTask.metadata?.feedback || selectedTask.metadata?.reason) && (
                      <div className="mb-3 p-3 bg-zinc-950 border border-amber-500/10 rounded-xl">
                        <p className="text-xs text-zinc-300 leading-relaxed">{selectedTask.metadata.feedback || selectedTask.metadata.reason}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {selectedTask.logs
                        ?.filter((log: AuditLog) => log.action === 'VETOED')
                        .map((log: AuditLog, idx: number) => (
                          <div key={log.id} className="flex gap-2 items-start">
                            <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">VETO #{idx + 1}</span>
                            <p className="text-xs text-zinc-400 leading-relaxed flex-1">{log.content}</p>
                          </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-3 font-mono">
                      {t('escalationHint')}
                    </p>
                  </motion.div>
                )}

                {/* Execution Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Audit Logs */}
                  <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[400px]">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <History className="w-3 h-3" /> {t('auditTrail')}
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {selectedTask.logs?.map((log: AuditLog) => (
                        <div key={log.id} className="flex gap-3 group">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors">
                              {getAgentIcon(log.agent)}
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">{log.agent}</span>
                              <span className="text-[9px] font-mono text-zinc-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">{log.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Subtasks / Ministries */}
                  <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[400px]">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {t('ministryExecution')}
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {selectedTask.subtasks?.length > 0 ? (
                        selectedTask.subtasks.map((st: SubTask) => (
                          <div key={st.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-zinc-900 rounded flex items-center justify-center text-zinc-500">
                                  {getAgentIcon(st.ministry)}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{st.ministry}</span>
                              </div>
                              <span className={cn(
                                "text-[9px] font-mono px-2 py-0.5 rounded-full border",
                                st.status === 'COMPLETED' ? "text-emerald-500 border-emerald-500/20" : "text-blue-500 border-blue-500/20"
                              )}>
                                {st.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300">{st.description}</p>
                            {st.result && (
                              <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                <p className="text-[10px] text-zinc-500 font-mono italic line-clamp-2">{st.result}</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-2">
                          <Clock className="w-8 h-8 opacity-20" />
                          <p className="text-xs font-mono uppercase tracking-widest">{t('awaitingDispatch')}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Final Result */}
                {selectedTask.status === TaskStatus.COMPLETED && selectedTask.metadata?.finalResult && (
                  <motion.section
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8"
                  >
                    <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> {t('imperialDecreeFulfilled')}
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTask.metadata.finalResult}
                      </p>
                    </div>
                  </motion.section>
                )}
              </motion.div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center text-zinc-700 space-y-4 border-2 border-dashed border-zinc-800 rounded-3xl">
                <Scroll className="w-12 h-12 opacity-20" />
                <div className="text-center">
                  <p className="text-sm font-medium uppercase tracking-widest">{t('noDecreeSelected')}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('noDecreeHint')}</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
