'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
// import Tabs from '@/components/ui/Tabs';
import CommentTree from '@/components/dashboard/CommentTree';
import { SessionDetail } from '@/types/dashboard';
import { Map as MapIcon, FileText, MessageCircle, ArrowLeft, Sparkles, Users, ChevronDown, User as UserIcon, CheckCircle, ListTodo, Lightbulb, MoreHorizontal, FileEdit, Archive, Trash2, Calendar, Target, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { useSidebar } from '@/components/SidebarContext';
import { Menu as MenuIcon } from 'lucide-react';

// Dynamic import for Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Define simple user type for local use or import shared
interface User {
  id: number;
  role: string;
  org_role?: string;
  current_org_id?: number;
}

const COLOR_PALETTE = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Medium Turquoise
  '#45B7D1', // Sky Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Pale Green
  '#F06292', // Pink
  '#AED581', // Light Green
  '#7986CB', // Indigo
  '#9575CD', // Purple
  '#4DB6AC', // Teal
  '#FFD54F', // Amber
  '#4DD0E1', // Cyan
  '#BA68C8', // Lavender
  '#E57373', // Red Light
];

const POLICY_STATUSES = ["提案", "可決", "実行中", "完了"];

// グループカラーパレット（グループ番号に対応）
const GROUP_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', selectBg: '#f5f3ff' },
  { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300', selectBg: '#f0f9ff' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', selectBg: '#fffbeb' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', selectBg: '#fff1f2' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', selectBg: '#f0fdfa' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', selectBg: '#fff7ed' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '提案': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  '可決': { bg: 'bg-sage-100', text: 'text-sage-700', border: 'border-sage-300' },
  '実行中': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  '完了': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
};

const TODO_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '未着手': { bg: 'bg-slate-100', text: 'text-slate-600' },
  '進行中': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '完了': { bg: 'bg-green-100', text: 'text-green-700' },
};

// Helper to wrap text for Plotly tooltips
const wrapText = (text: string, maxLen: number = 30) => {
  if (!text) return '';
  // Split by existing newlines first
  const paragraphs = text.split('\n');

  return paragraphs.map(p => {
    if (p.length <= maxLen) return p;
    const regex = new RegExp(`.{1,${maxLen}}`, 'g');
    return p.match(regex)?.join('<br>') || p;
  }).join('<br>');
};

function SessionDetailContent() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetTitle = searchParams.get('title');
  const targetId = searchParams.get('issue_id');
  const { toggleMobileMenu, setIsSidebarHidden } = useSidebar();

  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Active Issue/Thread State
  const [activeIssue, setActiveIssue] = useState<any>(null);
  const [activeThreadRootId, setActiveThreadRootId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);

  useEffect(() => {
    // Component unmount cleanup just in case
    return () => setIsSidebarHidden(false);
  }, [setIsSidebarHidden]);

  // Group Members Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [isSavingGroups, setIsSavingGroups] = useState(false);
  const [tempGroupMembers, setTempGroupMembers] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (isGroupModalOpen) {
      const init: Record<number, string[]> = {};
      availableGroups.forEach(g => {
        const membersMatch = g.content.match(/members:\[(.*?)\]/);
        let memberIds: string[] = [];
        if (membersMatch) {
          memberIds = membersMatch[1].split(',').map((id: string) => id.trim()).filter(Boolean);
        }
        init[g.id] = memberIds;
      });
      setTempGroupMembers(init);
      setIsEditingGroups(false);
    }
  }, [isGroupModalOpen, availableGroups]);

  const handleMoveMember = (userId: string, fromGroupId: number, toGroupId: number) => {
    setTempGroupMembers(prev => {
      const next = { ...prev };
      next[fromGroupId] = next[fromGroupId].filter(id => id !== userId);
      if (!next[toGroupId]) next[toGroupId] = [];
      next[toGroupId] = [...next[toGroupId], userId];
      return next;
    });
  };

  const handleSaveGroups = async () => {
    if (!id) return;
    setIsSavingGroups(true);
    try {
      const promises = availableGroups.map(g => {
        const newMembers = tempGroupMembers[g.id] || [];
        const newContent = g.content.replace(/members:\[.*?\]/, `members:[${newMembers.join(', ')}]`);

        if (newContent !== g.content) {
          return axios.put(`/api/dashboard/comments/${g.id}`, { content: newContent }, { withCredentials: true });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);

      const updateContent = (c: any) => {
        if (tempGroupMembers[c.id]) {
          return { ...c, content: c.content.replace(/members:\[.*?\]/, `members:[${tempGroupMembers[c.id].join(', ')}]`) };
        }
        return c;
      };

      setAvailableGroups(prev => prev.map(updateContent));
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, comments: prev.comments.map(updateContent) };
      });

      setIsEditingGroups(false);
    } catch (e) {
      console.error(e);
      alert("グループの保存に失敗しました");
    } finally {
      setIsSavingGroups(false);
    }
  };

  // Auto-open issue from query param
  useEffect(() => {
    if (data && (targetTitle || targetId) && !activeIssue) {
      let issues: any[] = [];
      try {
        if (data && data.report_content) {
          const parsed = JSON.parse(data.report_content as string);
          if (Array.isArray(parsed)) issues = parsed;
        }
      } catch (e) { }

      const tTitle = targetTitle as string;
      const tId = targetId as string;

      const found = issues.find((i: any) => {
        if (tId) return i.id === tId;
        return i.title === tTitle;
      });

      if (found) {
        setActiveIssue(found);
      }
    }
  }, [data, targetTitle, targetId, activeIssue]);

  // State for linking Issue List with Clustering Map
  const [selectedIssueTopics, setSelectedIssueTopics] = useState<string[]>([]);
  // State for Accordion Expansion (One can be open at a time)
  const [expandedIssueIndex, setExpandedIssueIndex] = useState<number | null>(null);

  // Check if current user is a member of the active group
  const isMemberOfActiveGroup = useMemo(() => {
    if (!user || !activeThreadRootId || !availableGroups.length) return false;
    const activeGroup = availableGroups.find(g => g.id === activeThreadRootId);
    if (!activeGroup) return false;
    const match = activeGroup.content.match(/members:\[(.*?)\]/);
    if (match) {
      const members = match[1].split(',').map((id: string) => id.trim());
      return members.includes(String(user.id));
    }
    return false;
  }, [user?.id, activeThreadRootId, availableGroups]);

  // Layout state for Plotly to handle zoom/reset
  const [plotLayout, setPlotLayout] = useState<any>({
    autosize: true,
    hovermode: 'closest',
    margin: { l: 20, r: 20, t: 20, b: 20 },
    xaxis: { showgrid: true, gridcolor: 'rgba(200,200,200,0.2)', zeroline: false, showticklabels: false },
    yaxis: { showgrid: true, gridcolor: 'rgba(200,200,200,0.2)', zeroline: false, showticklabels: false },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.3)',
    showlegend: false,
    dragmode: 'zoom',
    hoverlabel: {
      bgcolor: 'rgba(255, 255, 255, 0.95)',
      bordercolor: '#e2e8f0',
      font: { family: 'sans-serif', size: 12, color: '#334155' },
      align: 'left'
    }
  });

  // State for highlighting specific text from Small Voice links
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  // Ref for auto-scrolling to map
  const mapSectionRef = useRef<HTMLElement>(null);

  // Memoize color mapping
  const categoryColorMap = useMemo(() => {
    if (!data?.results) return new Map<string, string>();

    const uniqueCategories = Array.from(new Set(data.results.map(r => r.sub_topic))).sort();
    const map = new Map<string, string>();

    uniqueCategories.forEach((category, index) => {
      map.set(category, COLOR_PALETTE[index % COLOR_PALETTE.length]);
    });

    return map;
  }, [data]);

  // Force resize event for Plotly when activeIssue changes (layout transition)
  useEffect(() => {
    // Trigger reset immediately and frequently during the transition
    window.dispatchEvent(new Event('resize'));

    const timers = Array.from({ length: 4 }).map((_, i) =>
      setTimeout(() => window.dispatchEvent(new Event('resize')), i * 15)
    );

    return () => timers.forEach(t => clearTimeout(t));
  }, [activeIssue, isChatOpen]);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        // 1. Fetch User (for permissions)
        try {
          const userRes = await axios.get('/api/auth/me', { withCredentials: true });
          setUser(userRes.data);
        } catch (e: any) {
          if (e.response && e.response.status === 401) {
            router.push('/login');
            return;
          }
          setUser(null);
        }

        // 2. Fetch Data
        const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
        setData(res.data);
      } catch (error: any) {
        // Handle Unauthorized Access (Redirect)
        if (error.response && error.response.status === 401) {
          router.push('/login');
          return;
        }

        console.error("Failed to fetch session detail", error);
        // router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, router]);

  const handlePublishToggle = async () => {
    if (!data) return;
    const action = data.is_published ? "非公開" : "公開";
    if (!confirm(`このレポートを${action}にしますか？`)) return;
    setIsUpdating(true);
    try {
      const newState = !data.is_published;
      await axios.put(`/api/dashboard/sessions/${id}/publish`, {
        is_published: newState
      }, { withCredentials: true });

      setData({ ...data, is_published: newState });
    } catch (error) {
      alert("更新に失敗しました");
    } finally {
      setIsUpdating(false);
      setIsMenuOpen(false);
    }
  };

  const handleToggleAnalysisPublish = async () => {
    if (!data) return;
    const action = data.is_comment_analysis_published ? "非公開" : "公開";
    if (!confirm(`AI分析結果を一般ユーザーに${action}にしますか？`)) return;
    setIsUpdating(true);
    try {
      const newState = !data.is_comment_analysis_published;
      await axios.put(`/api/dashboard/sessions/${id}/publish-analysis`, {
        is_published: newState
      }, { withCredentials: true });

      setData({ ...data, is_comment_analysis_published: newState });
    } catch (error) {
      alert("更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  // Create Post State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Organization Members for Assignee Dropdown
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.current_org_id) {
      axios.get(`/api/organizations/${user.current_org_id}/members`, { withCredentials: true })
        .then(res => setOrgMembers(res.data))
        .catch(err => console.error(err));
    }
  }, [user]);

  // Policy State
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [expandedPolicyIds, setExpandedPolicyIds] = useState<number[]>([]);

  const togglePolicy = (id: number) => {
    setExpandedPolicyIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const [policyForm, setPolicyForm] = useState<{
    title: string;
    description: string;
    priority: string;
    target_group: string;
    status: string;
    todos: any[];
  }>({
    title: '',
    description: '',
    priority: 'medium',
    target_group: '全体',
    status: '提案',
    todos: [{ task: '', assignee: '', start_date: '', deadline: '', status: '未着手', completed: false }]
  });

  // Edit Policy State
  const [editPolicyId, setEditPolicyId] = useState<number | null>(null);
  const [editPolicyForm, setEditPolicyForm] = useState<any>(null);

  // Gantt Chart State
  const [ganttMonths, setGanttMonths] = useState<Record<number, Date>>({});

  // todosがJSON文字列の場合も配列として扱うヘルパー
  const parseTodos = (todos: any): any[] => {
    if (Array.isArray(todos)) return todos;
    if (typeof todos === 'string') {
      try { return JSON.parse(todos); } catch { return []; }
    }
    return [];
  };

  const handleEditPolicyClick = (policy: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditPolicyId(policy.id);
    setEditPolicyForm({
      title: policy.title,
      description: policy.description || '',
      priority: policy.priority || 'medium',
      target_group: policy.target_group || '全体',
      status: policy.status || '提案',
      todos: parseTodos(policy.todos).map(t => ({ ...t, status: t.status || '未着手' }))
    });
    if (!expandedPolicyIds.includes(policy.id)) {
      setExpandedPolicyIds(prev => [...prev, policy.id]);
    }
  };

  const handleCancelEditPolicy = () => {
    setEditPolicyId(null);
    setEditPolicyForm(null);
  };

  const handleSaveEditPolicy = async () => {
    if (!editPolicyForm?.title?.trim()) return;
    setIsUpdating(true);
    try {
      await axios.put(`/api/dashboard/policies/${editPolicyId}`, {
        issue_id: null,
        title: editPolicyForm.title,
        description: editPolicyForm.description,
        priority: editPolicyForm.priority,
        target_group: editPolicyForm.target_group,
        status: editPolicyForm.status,
        todos: editPolicyForm.todos
      }, { withCredentials: true });

      setEditPolicyId(null);
      setEditPolicyForm(null);

      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      alert("更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditAddTodo = () => {
    if (!editPolicyForm) return;
    setEditPolicyForm({ ...editPolicyForm, todos: [...editPolicyForm.todos, { task: '', assignee: '', start_date: '', deadline: '', status: '未着手', completed: false }] });
  };

  const handleEditTodoChange = (index: number, field: string, value: any) => {
    if (!editPolicyForm) return;
    const newTodos = [...editPolicyForm.todos];
    newTodos[index] = { ...newTodos[index], [field]: value };
    setEditPolicyForm({ ...editPolicyForm, todos: newTodos });
  };

  const handleEditRemoveTodo = (index: number) => {
    if (!editPolicyForm) return;
    const newTodos = editPolicyForm.todos.filter((_: any, i: number) => i !== index);
    setEditPolicyForm({ ...editPolicyForm, todos: newTodos });
  };

  const handleEditToggleTodo = (index: number) => {
    if (!editPolicyForm) return;
    const newTodos = [...editPolicyForm.todos];
    newTodos[index] = { ...newTodos[index], completed: !newTodos[index].completed };
    setEditPolicyForm({ ...editPolicyForm, todos: newTodos });
  };

  const handleAddTodo = () => {
    setPolicyForm(prev => ({
      ...prev,
      todos: [...prev.todos, { task: '', assignee: '', start_date: '', deadline: '', status: '未着手', completed: false }]
    }));
  };

  const handleTodoChange = (index: number, field: string, value: any) => {
    const newTodos = [...policyForm.todos];
    newTodos[index] = { ...newTodos[index], [field]: value };
    setPolicyForm({ ...policyForm, todos: newTodos });
  };

  const handleRemoveTodo = (index: number) => {
    const newTodos = policyForm.todos.filter((_, i) => i !== index);
    setPolicyForm({ ...policyForm, todos: newTodos });
  };

  const handleToggleTodo = async (policy: any, todoIndex: number) => {
    const newTodos = [...parseTodos(policy.todos)];
    newTodos[todoIndex].completed = !newTodos[todoIndex].completed;

    setIsUpdating(true);
    try {
      await axios.put(`/api/dashboard/policies/${policy.id}`, {
        issue_id: policy.issue_id,
        title: policy.title,
        description: policy.description,
        priority: policy.priority || 'medium',
        target_group: policy.target_group || '全体',
        status: policy.status || '提案',
        todos: newTodos
      }, { withCredentials: true });

      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      alert("Todoの更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };


  const handleCreatePost = async () => {
    if (!postContent.trim() || !data || !activeThreadRootId) {
      alert("所属するグループのチャットが見つかりません。");
      return;
    }

    try {
      // Create User Comment (Child of Root)
      await axios.post(`/api/dashboard/sessions/${id}/comments`, {
        content: postContent,
        is_anonymous: isAnonymous,
        parent_id: activeThreadRootId
      }, { withCredentials: true });

      // Reset & Reload
      setPostContent('');
      setIsAnonymous(false);

      // Reload comments (fetch detail again)
      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);

    } catch (error) {
      console.error("Failed to create post", error);
      alert("投稿に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!confirm("本当に削除しますか？この操作は取り消せません。")) return;
    setIsUpdating(true);
    try {
      await axios.delete(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      router.push('/dashboard');
    } catch (error) {
      alert("削除に失敗しました");
      setIsUpdating(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyForm.title.trim() || !data) return;
    setIsUpdating(true);
    try {
      await axios.post(`/api/dashboard/sessions/${id}/policies`, {
        issue_id: null,
        title: policyForm.title,
        description: policyForm.description,
        priority: policyForm.priority,
        target_group: policyForm.target_group,
        status: policyForm.status,
        todos: policyForm.todos,
      }, { withCredentials: true });

      setPolicyForm({ title: '', description: '', priority: 'medium', target_group: '全体', status: '提案', todos: [{ task: '', assignee: '', start_date: '', deadline: '', status: '未着手', completed: false }] });
      setIsCreatingPolicy(false);

      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      alert("政策の作成に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (!confirm("この政策を削除してよろしいですか？")) return;
    setIsUpdating(true);
    try {
      await axios.delete(`/api/dashboard/policies/${policyId}`, { withCredentials: true });
      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      alert("政策の削除に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };


  const handleEvaluatePolicy = async (policyId: number, rating: number) => {
    setIsUpdating(true);
    try {
      await axios.post(`/api/dashboard/policies/${policyId}/evaluate`, { rating }, { withCredentials: true });
      const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      alert("評価に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };
  const handleIssueClick = (issue: any, index: number) => {
    // 1. Toggle Expansion and Active State
    const isClearing = expandedIssueIndex === index;
    if (isClearing) {
      setExpandedIssueIndex(null);
      setActiveIssue(null);
      setSelectedIssueTopics([]); // Also clear map selection
      setHighlightedText(null);
      return;
    } else {
      setExpandedIssueIndex(index);
      setActiveIssue(issue);
      setHighlightedText(null);
    }

    // 2. Map Selection Logic
    // Extract related topics from issue
    // Keep compatibility with both 'category' (string) and 'related_topics' (array)
    let topics: string[] = [];
    if (issue.related_topics && Array.isArray(issue.related_topics)) {
      topics = issue.related_topics;
    } else if (issue.category) {
      topics = [issue.category];
    }

    setSelectedIssueTopics(topics);
  };


  const chatInputRef = useRef<HTMLDivElement>(null);
  const [threadAnalysisResults, setThreadAnalysisResults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data && data.comment_analysis) {
      try {
        const parsed = JSON.parse(data.comment_analysis as string);
        if (parsed.threads) {
          setThreadAnalysisResults(parsed.threads);
        }
      } catch (e) {
        console.error("Failed to parse comment analysis", e);
      }
    }
  }, [data]);

  // Logic to find linked thread (Group)
  useEffect(() => {
    if (!data?.comments) {
      setActiveThreadRootId(null);
      return;
    }

    // Find all group roots
    const groupRoots = data.comments.filter(c => !c.parent_id && c.content.includes('<!-- system_root -->') && c.content.includes('members:['));
    setAvailableGroups(groupRoots);

    // Find the group the current user belongs to
    const myGroup = groupRoots.find(c => {
      const match = c.content.match(/members:\[(.*?)\]/);
      if (match) {
        const memberIds = match[1].split(',').map(id => id.trim());
        return memberIds.includes(String(user?.id));
      }
      return false;
    });

    if (myGroup) {
      setActiveThreadRootId(myGroup.id);
      setIsCreatingPost(false);
    } else {
      // If user is not in any group (e.g. system admin observing), select the first group or leave empty
      if (groupRoots.length > 0) {
        setActiveThreadRootId(groupRoots[0].id);
        setIsCreatingPost(false);
      } else {
        setActiveThreadRootId(null);
        setPostContent('');
        setIsCreatingPost(true);
      }
    }
  }, [user?.id, data?.comments]);

  const handleCloseRightPanel = () => {
    setIsChatOpen(false);
    setIsSidebarHidden(false);
  };

  const handleOpenRightPanel = () => {
    setIsChatOpen(true);
    setIsSidebarHidden(true);
  };

  const handleAnalyzeThread = async (rootCommentId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`/api/dashboard/sessions/${id}/analyze-thread`, {
        parent_comment_id: rootCommentId
      }, { withCredentials: true });

      // Update local state
      const newResult = res.data.result;
      setThreadAnalysisResults(prev => ({
        ...prev,
        [rootCommentId]: newResult
      }));

      alert("分析が完了しました");
    } catch (e) {
      console.error(e);
      alert("分析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter comments for the active thread
  // Return separate root and descendants to render "Flat" thread style
  const { root: activeThreadRoot, descendants: activeThreadDescendants } = useMemo(() => {
    if (!data?.comments || !activeThreadRootId) return { root: null, descendants: [] };

    const root = data.comments.find(c => c.id === activeThreadRootId);
    if (!root) return { root: null, descendants: [] };

    const descendants: any[] = [];
    const stack = [root.id];
    while (stack.length > 0) {
      const currentId = stack.pop();
      const children = data.comments.filter(c => c.parent_id === currentId);
      descendants.push(...children);
      stack.push(...children.map(c => c.id));
    }

    return { root, descendants };
  }, [data?.comments, activeThreadRootId]);

  // Force Plotly resize on panel open/close to prevent map collapse
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [isChatOpen]);

  // Current analysis result
  const currentAnalysis = activeThreadRootId && threadAnalysisResults[activeThreadRootId.toString()];

  // ディスカッショングループ一覧（動的）- Hooks must be called before any conditional returns
  const discussionGroupOptions = useMemo(() => {
    const groups = availableGroups.map((g, idx) => ({
      name: g.content.split('\n')[0].replace('System Root for ', '') || `グループ ${idx + 1}`,
      index: idx,
    }));
    return [{ name: '全体', index: -1 }, ...groups];
  }, [availableGroups]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-primary mb-4"></div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">データが見つかりません</div>;

  // Check Permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin' || user?.org_role === 'admin';

  const sessionPolicies = [...(data.policies || [])].sort((a: any, b: any) => b.id - a.id);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/40 shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center flex-1 min-w-0 mr-2">
          <button
            onClick={toggleMobileMenu}
            className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <MenuIcon className="h-6 w-6 text-slate-600" />
          </button>
          <Link href="/dashboard" className="mr-2 md:mr-4 text-slate-400 hover:text-sage-dark transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-base md:text-lg font-bold text-sage-dark truncate">{data.title}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold shrink-0 ${data.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {data.is_published ? '公開中' : '下書き'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <p>テーマ: {data.theme}</p>
              <span>•</span>
              <p>{new Date(data.created_at).toLocaleDateString('ja-JP')} 作成</p>
            </div>
          </div>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-2">
          {/* Common Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-2 transition-all mr-1"
            >
              <Users className="w-4 h-4" /> グループを確認
            </button>

            {/* Admin Desktop Actions */}
            {isAdmin && (
              <>
                <button
                  onClick={handlePublishToggle}
                  disabled={isUpdating}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${data.is_published ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                  {data.is_published ? <><Archive className="w-4 h-4" /> 非公開</> : <><CheckCircle className="w-4 h-4" /> 公開</>}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> 削除
                </button>
              </>
            )}
          </div>

          {/* Mobile Actions Menu */}
          <div className="md:hidden relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <MoreHorizontal className="w-6 h-6 text-slate-500" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setIsGroupModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" /> グループを確認
                  </button>

                  {/* Admin Mobile Menu Actions */}
                  {isAdmin && (
                    <>
                      <button
                        onClick={handlePublishToggle}
                        disabled={isUpdating}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-2"
                      >
                        {data.is_published ? <><Archive className="w-4 h-4" /> 非公開にする</> : <><CheckCircle className="w-4 h-4 text-green-500" /> 公開する</>}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isUpdating}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> 削除する
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Dynamic Layout */}
      <div className="flex-1 overflow-hidden relative flex">

        {/* Floating Discussion Button */}
        {!isChatOpen && (
          <button
            onClick={handleOpenRightPanel}
            className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 px-5 py-3 rounded-full bg-sage-600/95 hover:bg-sage-700 backdrop-blur-md shadow-lg border border-sage-500/50 text-white font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            </div>
            <span className="text-sm tracking-wide">
              {user?.role === 'system_admin' ? 'ディスカッションを閲覧' : 'ディスカッションに参加する'}
            </span>
          </button>
        )}

        {/* Left Column: Input (Map & Issues) */}
        <div className={`
          flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar transition-all duration-[50ms] ease-out
          ${isChatOpen ? 'md:pr-6 md:border-r md:border-slate-200/60' : ''}
        `}>

          {/* 1. Meaning Map */}
          <section ref={mapSectionRef} className="glass-card p-4 h-[400px] md:h-[500px] relative overflow-hidden" >
            <div className="flex items-center justify-between mb-4 z-10 relative">
              <h3 className="text-sm font-bold text-sage-dark pl-2 border-l-4 border-sage-primary flex items-center gap-2">
                <MapIcon className="h-4 w-4" /> 1. クラスタリング
              </h3>
              {selectedIssueTopics.length > 0 && (
                <button
                  onClick={() => setSelectedIssueTopics([])}
                  className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-300 transition-colors"
                >
                  絞り込みを解除
                </button>
              )}
            </div>
            <div className="w-full h-full pb-8 flex flex-col overflow-hidden relative z-0">
              <div className="flex-1 min-h-0 w-full">
                <Plot
                  data={[
                    {
                      x: data.results.map(r => r.x),
                      y: data.results.map(r => r.y),
                      text: data.results.map(r => {
                        return `<b>${r.sub_topic}</b><br>${wrapText(r.original_text, 30)}`;
                      }),
                      mode: 'markers',
                      type: 'scatter',
                      marker: {
                        size: data.results.map(r => {
                          const isTopicSelected = selectedIssueTopics.some(t => r.sub_topic.includes(t)) ||
                            (r.cluster_id === -1 && selectedIssueTopics.some(t => t.includes('Small Voice')));

                          if (highlightedText && r.original_text.includes(highlightedText)) {
                            return 18;
                          }
                          return isTopicSelected ? 14 : 10;
                        }),
                        color: data.results.map(r => {
                          if (r.is_noise || r.cluster_id === -1) {
                            if (selectedIssueTopics.length > 0 && !selectedIssueTopics.some(t => r.sub_topic.includes(t)) && !selectedIssueTopics.some(t => t.includes('Small Voice'))) {
                              return 'rgba(239, 68, 68, 0.2)';
                            }
                            return '#EF4444';
                          }

                          const color = categoryColorMap.get(r.sub_topic) || '#ccc';

                          if (selectedIssueTopics.length > 0) {
                            if (!selectedIssueTopics.includes(r.sub_topic)) {
                              return 'rgba(200,200,200, 0.2)';
                            }
                          }
                          return color;
                        }),
                        line: {
                          width: data.results.map(r => {
                            const isTopicSelected = selectedIssueTopics.some(t => r.sub_topic.includes(t)) ||
                              (r.cluster_id === -1 && selectedIssueTopics.some(t => t.includes('Small Voice')));

                            if (highlightedText && r.original_text.includes(highlightedText)) {
                              return 3;
                            }
                            return isTopicSelected ? 2 : 1;
                          }),
                          color: data.results.map(r => {
                            if (highlightedText && r.original_text.includes(highlightedText)) {
                              return '#1e293b';
                            }
                            return 'white';
                          })
                        },
                        opacity: 0.8,
                        symbol: 'circle'
                      },
                      hoverinfo: 'text',
                      hovertemplate: '%{text}<extra></extra>'
                    }
                  ]}
                  layout={plotLayout}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'toggleSpikelines'],
                    scrollZoom: true,
                  }}
                />
              </div>
            </div>
            <div className="absolute bottom-2 left-4 right-4 flex overflow-x-auto gap-2 py-1 scrollbar-hide">
              {Array.from(categoryColorMap.entries()).slice(0, 5).map(([category, color]) => (
                <div key={category} className="flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border border-slate-100 shadow-sm">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-slate-600 font-medium truncate max-w-[80px]">{category}</span>
                </div>
              ))}
            </div>
          </section >

          {/* 2. Issue List */}
          < section className="glass-card p-4 md:p-6 mb-8" >
            <div className="mb-4 border-b border-gray-100 pb-2 flex justify-between items-center">
              <h3 className="text-sm font-bold text-sage-dark pl-2 border-l-4 border-sage-primary flex items-center gap-2">
                <FileText className="h-4 w-4" /> 2. 課題リスト
              </h3>
              <span className="text-xs text-slate-400 hidden md:inline">クリックして詳細と関連マップを表示</span>
            </div>

            <div className="space-y-4">
              {(() => {
                if (!data.report_content) {
                  return <p className="text-slate-400 text-center py-10">レポートはまだ作成されていません。</p>;
                }

                let issues = [];
                try {
                  if (data && data.report_content) {
                    const parsed = JSON.parse(data.report_content as string);
                    if (Array.isArray(parsed)) issues = parsed;
                  }
                } catch (e) {
                  if (data.report_content && data.report_content.trim() === '[]') issues = [];
                }

                if (issues.length > 0) {
                  return issues.map((issue: any, idx: number) => {
                    let topics: string[] = [];
                    if (issue.related_topics && Array.isArray(issue.related_topics)) topics = issue.related_topics;
                    else if (issue.category) topics = [issue.category];

                    const isActive = activeIssue?.title === issue.title;
                    const isExpanded = idx === expandedIssueIndex || isActive;
                    const isSmallVoice = issue.source_type === 'small_voice' || topics.some(t => t.includes('Small Voice'));

                    return (
                      <div
                        key={idx}
                        onClick={() => handleIssueClick(issue, idx)}
                        className={`bg-white rounded-xl border transition-all cursor-pointer overflow-hidden
                            ${isActive ? 'ring-2 ring-sage-primary shadow-lg border-sage-300' : isExpanded ? 'ring-1 ring-sage-200 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-sage-300'}
                        `}
                      >
                        <div className="p-4 flex items-center justify-between group">
                          <h4 className={`font-bold text-sm flex items-start gap-2 ${isExpanded || isActive ? 'text-sage-700' : 'text-slate-700'}`}>
                            {isSmallVoice ? (
                              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                            ) : (
                              <Users className="h-5 w-5 text-sage-500 mt-0.5 shrink-0" />
                            )}
                            <span className="break-all">{issue.title}</span>
                          </h4>
                          <div className={`transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>

                        {/* Expandable Content */}
                        <div className={`transition-all duration-300 ease-in-out border-t border-slate-100 bg-slate-50/50
                            ${isExpanded ? 'max-h-[2000px] opacity-100 p-4 overflow-y-auto' : 'max-h-0 opacity-0 p-0 overflow-hidden'}
                        `}>
                          {isSmallVoice ? (
                            <div className="space-y-2">
                              {(() => {
                                const content = issue.insight || issue.description || '';
                                const lines = content.split('\n');
                                return lines.map((line: string, lIdx: number) => {
                                  // Detect bullet points (e.g., "- ", "• ", "1. ")
                                  const bulletMatch = line.match(/^(\s*[-•*]|\s*\d+\.)\s*(.*)/);
                                  if (bulletMatch) {
                                    const text = bulletMatch[2];
                                    return (
                                      <div key={lIdx} className="pl-2 flex items-start gap-2 group/item">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHighlightedText(text);
                                            mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                          }}
                                          className={`text-xs text-left leading-normal py-0.5 hover:text-amber-600 hover:underline transition-colors ${highlightedText === text ? 'text-amber-700 font-bold underline' : 'text-slate-600'}`}
                                        >
                                          {text}
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <p key={lIdx} className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                      {line}
                                    </p>
                                  );
                                });
                              })()}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {issue.insight || issue.description}
                            </p>
                          )}

                          <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex gap-2 flex-wrap flex-1 min-w-0">
                              {topics.map((t, i) => (
                                <span key={i} className="bg-sage-100 text-sage-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sage-500"></span>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                } else {
                  return <div className="text-center py-10 text-slate-500"><p>顕著な課題は検出されませんでした。</p></div>
                }
              })()}
            </div>
            <div className="h-10"></div>
          </section >

          {/* 3. Policy Area */}
          < section className="glass-card p-4 md:p-6 mb-8" >
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-sage-dark pl-2 border-l-4 border-sage-primary flex items-center gap-2">
                <ListTodo className="h-4 w-4" /> 3. 政策リスト
              </h3>
              {!isCreatingPolicy && (
                <button
                  onClick={() => setIsCreatingPolicy(true)}
                  className="text-[10px] bg-white border border-sage-200 hover:bg-sage-50 text-sage-700 px-3 py-1.5 flex items-center gap-1 rounded font-bold shadow-sm transition-all"
                >
                  + 新規立案
                </button>
              )}
            </div>

            {/* Policy Create Form */}
            {
              isCreatingPolicy && (
                <div className="bg-slate-50 border border-sage-200 rounded-lg p-4 md:p-6 shadow-sm animate-in fade-in slide-in-from-top-2 relative z-20 mb-6">
                  <h4 className="text-sm font-bold text-sage-800 mb-4 border-b border-sage-200/50 pb-2">新しい政策を立案する</h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">政策名称</label>
                        <input
                          type="text"
                          value={policyForm.title}
                          onChange={e => setPolicyForm({ ...policyForm, title: e.target.value })}
                          placeholder="例: 社内コミュニケーションの活性化"
                          className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage-500/50 transition-all"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-slate-600 mb-1">優先順位</label>
                        <select
                          value={policyForm.priority}
                          onChange={e => setPolicyForm({ ...policyForm, priority: e.target.value })}
                          className={`w-full text-sm p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sage-500/50 transition-all appearance-none font-bold text-center ${policyForm.priority === 'high'
                            ? 'bg-red-100/80 border-red-300 text-red-700'
                            : policyForm.priority === 'low'
                              ? 'bg-blue-100/80 border-blue-300 text-blue-700'
                              : 'bg-yellow-100/80 border-yellow-300 text-yellow-700'
                            }`}
                        >
                          <option value="high">高</option>
                          <option value="medium">中</option>
                          <option value="low">低</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">対象グループ (ディスカッション)</label>
                        {(() => {
                          const sel = discussionGroupOptions.find(g => g.name === policyForm.target_group);
                          const gc = sel && sel.index >= 0 ? GROUP_COLORS[sel.index % GROUP_COLORS.length] : null;
                          return (
                            <select
                              value={policyForm.target_group}
                              onChange={e => setPolicyForm({ ...policyForm, target_group: e.target.value })}
                              style={gc ? { backgroundColor: gc.selectBg } : {}}
                              className={`w-full text-sm p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sage-500/50 transition-all font-bold ${gc ? `${gc.text} ${gc.border}` : 'text-slate-600 border-slate-200 bg-white'
                                }`}
                            >
                              {discussionGroupOptions.map(g => (
                                <option key={g.name} value={g.name}>{g.name}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">ステータス</label>
                        {(() => {
                          const sc = STATUS_COLORS[policyForm.status] || STATUS_COLORS['提案'];
                          return (
                            <select
                              value={policyForm.status}
                              onChange={e => setPolicyForm({ ...policyForm, status: e.target.value })}
                              className={`w-full text-sm p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sage-500/50 transition-all font-bold ${sc.bg} ${sc.text} ${sc.border}`}
                            >
                              {POLICY_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">説明 (背景や目的)</label>
                      <textarea
                        value={policyForm.description}
                        onChange={e => setPolicyForm({ ...policyForm, description: e.target.value })}
                        placeholder="この政策が必要な理由や、達成したい目標を記載してください..."
                        className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage-500/50 transition-all min-h-[100px]"
                      />
                    </div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 border-b pb-1">To-Do リスト</label>
                    <div className="space-y-3">
                      {policyForm.todos.map((todo, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200 relative group">
                          <button
                            onClick={() => handleRemoveTodo(idx)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="削除"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 flex flex-col gap-2">
                            <input
                              type="text"
                              value={todo.task}
                              onChange={e => handleTodoChange(idx, 'task', e.target.value)}
                              placeholder="タスク内容"
                              className="w-full text-xs p-2 rounded border border-slate-200 focus:border-sage-400 focus:ring-1 focus:ring-sage-400 outline-none"
                            />
                            <div className="flex gap-2">
                              <select
                                value={todo.status || '未着手'}
                                onChange={e => handleTodoChange(idx, 'status', e.target.value)}
                                className={`w-24 text-xs p-2 rounded border border-slate-200 focus:border-sage-400 outline-none font-bold ${todo.status === '完了' ? 'bg-green-100 text-green-700 border-green-200' : todo.status === '進行中' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600'}`}
                              >
                                <option value="未着手">未着手</option>
                                <option value="進行中">進行中</option>
                                <option value="完了">完了</option>
                              </select>
                              <div className="flex-1 relative">
                                <UserIcon className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                <select
                                  value={todo.assignee}
                                  onChange={e => handleTodoChange(idx, 'assignee', e.target.value)}
                                  className="w-full text-xs pl-7 p-2 rounded border border-slate-200 focus:border-sage-400 outline-none appearance-none bg-white text-slate-600"
                                >
                                  <option value="">担当者を選択</option>
                                  <option value="担当者未定">担当者未定</option>
                                  {orgMembers.map((m, mIdx) => (
                                    <option key={mIdx} value={m.username}>{m.username}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1 flex gap-1 items-center">
                                <div className="flex-1 relative">
                                  <input
                                    type="date"
                                    value={todo.start_date}
                                    onChange={e => handleTodoChange(idx, 'start_date', e.target.value)}
                                    className="w-full text-[10px] p-2 rounded border border-slate-200 focus:border-sage-400 outline-none"
                                    title="開始日"
                                  />
                                </div>
                                <span className="text-slate-400 text-xs">〜</span>
                                <div className="flex-1 relative">
                                  <input
                                    type="date"
                                    value={todo.deadline}
                                    onChange={e => handleTodoChange(idx, 'deadline', e.target.value)}
                                    className="w-full text-[10px] p-2 rounded border border-slate-200 focus:border-sage-400 outline-none"
                                    title="期限"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleAddTodo}
                      className="mt-2 text-xs flex items-center gap-1 text-sage-600 hover:text-sage-800 font-bold hover:bg-sage-100 p-1.5 rounded transition-colors"
                    >
                      <span>+</span> To-Doを追加
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-sage-200/50">
                    <button
                      onClick={() => {
                        setIsCreatingPolicy(false);
                        setPolicyForm({ title: '', description: '', priority: 'medium', target_group: '全体', status: '提案', todos: [{ task: '', assignee: '', start_date: '', deadline: '', status: '未着手', completed: false }] });
                      }}
                      className="text-sm px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium border border-transparent hover:border-slate-300"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCreatePolicy}
                      disabled={isUpdating || !policyForm.title.trim()}
                      className="text-sm bg-sage-600 hover:bg-sage-700 text-white px-5 py-2 rounded-lg transition-colors font-bold shadow-sm disabled:bg-sage-300 flex items-center gap-2"
                    >
                      {isUpdating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                      政策を立案
                    </button>
                  </div>
                </div>
              )
            }

            {
              sessionPolicies.length > 0 ? (
                <div className="space-y-4 mb-4">
                  {sessionPolicies.map(policy => {
                    const isExpanded = expandedPolicyIds.includes(policy.id);
                    const parsedTodos = parseTodos(policy.todos);
                    const validTodosForGantt = parsedTodos.filter((t: any) => t.start_date && t.deadline);

                    let minDate = 0, maxDate = 0, totalDays = 1;
                    if (validTodosForGantt.length > 0) {
                      minDate = Math.min(...validTodosForGantt.map((t: any) => new Date(t.start_date).getTime()));
                      maxDate = Math.max(...validTodosForGantt.map((t: any) => new Date(t.deadline).getTime()));
                      const msDay = 1000 * 3600 * 24;
                      totalDays = Math.max(1, (maxDate - minDate) / msDay + 1);
                    }

                    return (
                      <div key={policy.id} className="bg-white border border-slate-200 rounded-lg p-0 relative shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
                        <div
                          className={`cursor-pointer p-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-sage-50/50' : 'bg-white hover:bg-slate-50'}`}
                          onClick={() => togglePolicy(policy.id)}
                        >
                          <h5 className="font-bold text-sage-800 text-sm leading-tight pr-6 relative z-10 flex items-center gap-2">
                            <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-slate-400`}>
                              <ChevronDown className="w-4 h-4" />
                            </span>
                            <Target className="w-4 h-4 text-sage-500" />
                            {policy.title}
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border text-center min-w-[28px] inline-block ${policy.priority === 'high'
                              ? 'bg-red-100/80 text-red-700 border-red-300'
                              : policy.priority === 'low'
                                ? 'bg-blue-100/80 text-blue-700 border-blue-300'
                                : 'bg-yellow-100/80 text-yellow-700 border-yellow-300'
                              }`}>
                              {policy.priority === 'high' ? '高' : policy.priority === 'low' ? '低' : '中'}
                            </span>
                            {(() => {
                              const sel = discussionGroupOptions.find(g => g.name === (policy.target_group || '全体'));
                              const gc = sel && sel.index >= 0 ? GROUP_COLORS[sel.index % GROUP_COLORS.length] : null;
                              return (
                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border text-center inline-block ${gc ? `${gc.bg} ${gc.text} ${gc.border}` : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                                  {policy.target_group || '全体'}
                                </span>
                              );
                            })()}
                            {(() => {
                              const sc = STATUS_COLORS[policy.status || '提案'] || STATUS_COLORS['提案'];
                              return (
                                <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold border text-center inline-block ${sc.bg} ${sc.text} ${sc.border}`}>
                                  {policy.status || '提案'}
                                </span>
                              );
                            })()}
                          </h5>
                          {/* Buttons moved to body */}
                        </div>

                        {isExpanded && editPolicyId !== policy.id && (
                          <div className="p-4 pt-0 border-t border-sage-100/50 bg-white">
                            <div className="flex items-center justify-between mb-3 pt-3 border-b border-sage-100 pb-2">
                              <h4 className="text-sm font-bold text-sage-800 flex items-center gap-1.5"><FileEdit className="w-4 h-4 opacity-70" /> 政策の詳細</h4>
                              {editPolicyId !== policy.id && (
                                <div className="flex gap-2 items-center">
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const encodedTitle = encodeURIComponent(policy.title);
                                        const encodedDescription = encodeURIComponent(`「${policy.title}」の実施結果について、あなたのご意見・評価をお聞かせください。いただいたフィードバックは、次の政策立案に活用させていただきます。`);
                                        const encodedQuestion = encodeURIComponent(`「${policy.title}」の取り組みについて、実施状況の評価や改善点・ご意見をお聞かせください。`);
                                        router.push(`/dashboard?tab=surveys&survey_title=${encodedTitle}&survey_description=${encodedDescription}&survey_question=${encodedQuestion}`);
                                      }}
                                      className="flex items-center gap-1 text-[10px] px-2 py-1.5 bg-sage-600 hover:bg-sage-700 text-white border border-sage-600 rounded font-bold transition-colors shadow-sm"
                                      title="FBアンケートを作成する"
                                    >
                                      <FileText className="w-3 h-3" />
                                      FBアンケートを作成
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleEditPolicyClick(policy, e)}
                                    className="p-1.5 hover:bg-sage-100 rounded text-sage-600 bg-white shadow-sm border border-slate-100 transition-colors"
                                    title="編集"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePolicy(policy.id); }}
                                    className="p-1.5 hover:bg-red-50 rounded text-red-500 bg-white shadow-sm border border-slate-100 transition-colors"
                                    title="削除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {policy.description && (
                              <div className="mb-4 mt-3 bg-slate-50/50 p-3 rounded-md border border-slate-100">
                                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-xs">{policy.description}</p>
                              </div>
                            )}

                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <strong className="text-sage-700 block text-xs flex items-center gap-1.5 ">
                                  <ListTodo className="w-3.5 h-3.5" /> To-Doリスト
                                </strong>
                              </div>
                              {parsedTodos.length > 0 ? (
                                <div className="space-y-2">
                                  {parsedTodos.map((todo: any, idx: number) => (
                                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-md border text-xs transition-colors ${todo.status === '完了' || todo.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                                      <button
                                        onClick={() => handleToggleTodo(policy, idx)}
                                        className={`mt-0.5 shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${todo.status === '完了' || todo.completed ? 'bg-sage-500 border-sage-500 text-white' : 'border-slate-300 hover:border-sage-400 bg-white'}`}
                                      >
                                        {(todo.status === '完了' || todo.completed) && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${todo.status === '完了' ? 'bg-green-100 text-green-700' : todo.status === '進行中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{todo.status || '未着手'}</span>
                                          <p className={`font-medium text-sm leading-tight ${todo.status === '完了' || todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{todo.task}</p>
                                        </div>
                                        {(todo.assignee || todo.start_date || todo.deadline) && (
                                          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-[11px] text-slate-500">
                                            {todo.assignee && <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600"><UserIcon className="w-3 h-3" /> {todo.assignee === '担当者未定' ? <span className="italic text-slate-400">未定</span> : todo.assignee}</span>}
                                            {(todo.start_date || todo.deadline) && (
                                              <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                <Calendar className="w-3 h-3" />
                                                {todo.start_date ? new Date(todo.start_date).toLocaleDateString() : '未設定'} 〜 {todo.deadline ? new Date(todo.deadline).toLocaleDateString() : '未設定'}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 p-2 bg-slate-50 rounded border border-slate-100">タスクは登録されていません</p>
                              )}
                            </div>

                            {/* Policy Evaluations */}
                            <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-600 mb-1">この政策を評価する</p>
                                <p className="text-[10px] text-slate-400">賛同度や期待度を5段階で評価してください</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const evaluations = policy.evaluations || [];
                                  const average = evaluations.length > 0 ? (evaluations.reduce((a: any, b: any) => a + b.rating, 0) / evaluations.length).toFixed(1) : 0;
                                  const myEval = user && evaluations.find((e: any) => e.user_id === user.id);

                                  return (
                                    <>
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <button
                                          key={i}
                                          disabled={isUpdating}
                                          onClick={(e) => { e.stopPropagation(); handleEvaluatePolicy(policy.id, i + 1); }}
                                          className={`text-lg p-0.5 transition-colors focus:outline-none ${myEval && myEval.rating >= i + 1 ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-300'}`}
                                        >
                                          ★
                                        </button>
                                      ))}
                                      <div className="ml-3 flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-700">{average}</span>
                                        <span className="text-[10px] text-slate-400">({evaluations.length}件)</span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Monthly Gantt Chart */}
                            {validTodosForGantt.length > 0 && (() => {
                              const mapDate = ganttMonths[policy.id] || new Date();
                              const currentYear = mapDate.getFullYear();
                              const currentMonth = mapDate.getMonth();

                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              const monthStartDate = new Date(currentYear, currentMonth, 1).getTime();
                              const monthEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
                              const msDay = 1000 * 3600 * 24;

                              const shiftMonth = (offset: number) => {
                                const newDate = new Date(currentYear, currentMonth + offset, 1);
                                setGanttMonths(prev => ({ ...prev, [policy.id]: newDate }));
                              };

                              return (
                                <div className="mt-6 pt-5 border-t border-slate-100">
                                  <div className="flex items-center justify-between mb-3">
                                    <strong className="text-sage-700 text-xs flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />ガントチャート (スケジュール)</strong>
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-md border border-slate-200 px-1 py-0.5">
                                      <button onClick={() => shiftMonth(-1)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronLeft className="w-3 h-3" /></button>
                                      <span className="text-[11px] font-bold text-black min-w-[60px] text-center">{currentYear}年 {currentMonth + 1}月</span>
                                      <button onClick={() => shiftMonth(1)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronRight className="w-3 h-3" /></button>
                                    </div>
                                  </div>

                                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                                    {/* Days Header */}
                                    <div className="flex bg-slate-50 border-b border-slate-200">
                                      {Array.from({ length: daysInMonth }).map((_, i) => (
                                        <div key={i} className="flex-1 text-center text-[8px] py-1 border-r border-slate-100 last:border-0 text-black">
                                          {i + 1}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Tasks */}
                                    <div className="relative py-2 space-y-2">
                                      {validTodosForGantt.map((t: any, idx: number) => {
                                        const start = new Date(t.start_date).getTime();
                                        const end = new Date(t.deadline).getTime();

                                        // Check if task overlaps with this month
                                        if (end < monthStartDate || start > monthEndDate) return null;

                                        // Calculate position within current month
                                        const visibleStart = Math.max(start, monthStartDate);
                                        const visibleEnd = Math.min(end, monthEndDate);

                                        const startOffsetDays = (visibleStart - monthStartDate) / msDay;
                                        const visibleDurationDays = (visibleEnd - visibleStart) / msDay + 1;

                                        const leftPct = (startOffsetDays / daysInMonth) * 100;
                                        const widthPct = (visibleDurationDays / daysInMonth) * 100;

                                        return (
                                          <div key={idx} className="relative h-6 text-[10px] flex items-center w-full group/gantt px-[1px]">
                                            <div
                                              className={`absolute h-5 rounded-sm flex items-center px-1.5 text-black overflow-hidden whitespace-nowrap text-[9px] shadow-sm transition-all ${t.completed ? 'bg-slate-400/80' : ''} ${start < monthStartDate ? 'rounded-l-none border-l-2 border-slate-400 border-dashed' : ''} ${end > monthEndDate ? 'rounded-r-none border-r-2 border-slate-400 border-dashed' : ''}`}
                                              style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '4px', backgroundColor: t.completed ? undefined : COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                                              title={`${t.task} (${t.start_date} ~ ${t.deadline})`}
                                            >
                                              <span className="truncate w-full font-medium text-black">
                                                {t.task}
                                                {t.assignee && (
                                                  <span className="ml-1 opacity-100 text-[8px] font-normal">
                                                    ({t.assignee === '担当者未定' ? '未定' : t.assignee})
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Vertical grid lines */}
                                      <div className="absolute inset-0 flex pointer-events-none mt-0">
                                        {Array.from({ length: daysInMonth }).map((_, i) => (
                                          <div key={i} className="flex-1 border-r border-slate-100/50 last:border-0 h-full"></div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                          </div>
                        )}

                        {/* Edit Policy UI inline */}
                        {isExpanded && editPolicyId === policy.id && editPolicyForm && (
                          <div className="p-4 border-t border-sage-200 bg-sage-50/30">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-sage-200/50">
                              <h4 className="text-sm font-bold text-sage-800 flex items-center gap-1.5"><FileEdit className="w-4 h-4" /> 政策の編集</h4>
                              <div className="flex gap-2">
                                <button onClick={handleCancelEditPolicy} className="text-xs px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 font-bold transition-colors">キャンセル</button>
                                <button onClick={handleSaveEditPolicy} disabled={isUpdating} className="text-xs px-2 py-1 bg-sage-600 border border-sage-600 rounded hover:bg-sage-700 text-white font-bold transition-colors flex items-center gap-1"><Save className="w-3 h-3" /> 保存</button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">政策名称</label>
                                  <input type="text" value={editPolicyForm.title} onChange={e => setEditPolicyForm({ ...editPolicyForm, title: e.target.value })} className="w-full text-sm p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sage-500/50" />
                                </div>
                                <div className="w-24">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">優先順位</label>
                                  <select
                                    value={editPolicyForm.priority}
                                    onChange={e => setEditPolicyForm({ ...editPolicyForm, priority: e.target.value })}
                                    className={`w-full text-sm p-2 rounded border focus:outline-none focus:ring-2 focus:ring-sage-500/50 appearance-none font-bold text-center ${editPolicyForm.priority === 'high'
                                      ? 'bg-red-100/80 border-red-300 text-red-700'
                                      : editPolicyForm.priority === 'low'
                                        ? 'bg-blue-100/80 border-blue-300 text-blue-700'
                                        : 'bg-yellow-100/80 border-yellow-300 text-yellow-700'
                                      }`}
                                  >
                                    <option value="high">高</option>
                                    <option value="medium">中</option>
                                    <option value="low">低</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">対象グループ (ディスカッション)</label>
                                  {(() => {
                                    const sel = discussionGroupOptions.find(g => g.name === editPolicyForm.target_group);
                                    const gc = sel && sel.index >= 0 ? GROUP_COLORS[sel.index % GROUP_COLORS.length] : null;
                                    return (
                                      <select
                                        value={editPolicyForm.target_group}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, target_group: e.target.value })}
                                        style={gc ? { backgroundColor: gc.selectBg } : {}}
                                        className={`w-full text-sm p-2 rounded border focus:outline-none focus:ring-2 focus:ring-sage-500/50 font-bold ${gc ? `${gc.text} ${gc.border}` : 'text-slate-600 border-slate-300 bg-white'
                                          }`}
                                      >
                                        {discussionGroupOptions.map(g => (
                                          <option key={g.name} value={g.name}>{g.name}</option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ステータス</label>
                                  {(() => {
                                    const sc = STATUS_COLORS[editPolicyForm.status] || STATUS_COLORS['提案'];
                                    return (
                                      <select
                                        value={editPolicyForm.status}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, status: e.target.value })}
                                        className={`w-full text-sm p-2 rounded border focus:outline-none focus:ring-2 focus:ring-sage-500/50 font-bold ${sc.bg} ${sc.text} ${sc.border}`}
                                      >
                                        {POLICY_STATUSES.map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">説明</label>
                                <textarea value={editPolicyForm.description} onChange={e => setEditPolicyForm({ ...editPolicyForm, description: e.target.value })} className="w-full text-sm p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sage-500/50 min-h-[60px]" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-2 border-b border-slate-200 pb-1">To-Do リスト</label>
                                <div className="space-y-3">
                                  {editPolicyForm.todos.map((todo: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 items-start bg-white p-2.5 rounded border border-slate-200 relative group shadow-sm">
                                      <button onClick={() => handleEditRemoveTodo(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="削除">
                                        <X className="w-3.5 h-3.5" />
                                      </button>

                                      <div className="pt-1.5 pl-1 pr-2">
                                        <input type="checkbox" checked={todo.status === '完了' || todo.completed} onChange={() => handleEditToggleTodo(idx)} className="w-4 h-4 text-sage-600 rounded focus:ring-sage-500 border-slate-300" title="完了マーク" />
                                      </div>

                                      <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex gap-2 w-full">
                                          <select value={todo.status || '未着手'} onChange={e => handleEditTodoChange(idx, 'status', e.target.value)} className="w-24 text-[11px] p-2 rounded border border-slate-200 focus:border-sage-400 outline-none">
                                            <option value="未着手">未着手</option>
                                            <option value="進行中">進行中</option>
                                            <option value="完了">完了</option>
                                          </select>
                                          <input type="text" value={todo.task} onChange={e => handleEditTodoChange(idx, 'task', e.target.value)} placeholder="タスク内容" className="flex-1 text-xs p-2 rounded border border-slate-200 focus:border-sage-400 focus:ring-1 focus:ring-sage-400 outline-none" />
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2">
                                          <div className="flex-1 relative">
                                            <UserIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                                            <select value={todo.assignee} onChange={e => handleEditTodoChange(idx, 'assignee', e.target.value)} className="w-full text-[11px] pl-7 p-2 rounded border border-slate-200 focus:border-sage-400 outline-none appearance-none bg-slate-50 text-slate-700">
                                              <option value="">担当者を選択</option>
                                              <option value="担当者未定">担当者未定</option>
                                              {orgMembers.map((m, mIdx) => (<option key={mIdx} value={m.username}>{m.username}</option>))}
                                            </select>
                                          </div>
                                          <div className="flex-1 flex gap-1 items-center">
                                            <div className="flex-1 relative">
                                              <input type="date" value={todo.start_date || ''} onChange={e => handleEditTodoChange(idx, 'start_date', e.target.value)} className="w-full text-[10px] p-2 rounded border border-slate-200 focus:border-sage-400 outline-none bg-slate-50" title="開始日" />
                                            </div>
                                            <span className="text-slate-400 text-xs">〜</span>
                                            <div className="flex-1 relative">
                                              <input type="date" value={todo.deadline || ''} onChange={e => handleEditTodoChange(idx, 'deadline', e.target.value)} className="w-full text-[10px] p-2 rounded border border-slate-200 focus:border-sage-400 outline-none bg-slate-50" title="期限" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button onClick={handleEditAddTodo} className="mt-3 text-xs flex items-center gap-1 text-sage-600 hover:text-sage-800 font-bold hover:bg-sage-50 px-2 py-1.5 rounded transition-colors border border-transparent hover:border-sage-200">
                                  <span>+</span> To-Doを追加
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !isCreatingPolicy && (
                  <div className="text-center py-10 bg-white/50 border border-dashed border-slate-200 rounded-lg text-slate-400">
                    まだ政策は立案されていません
                  </div>
                )
              )
            }

          </section>
        </div>

        {/* Right Column: Dynamic Panel (Chat & Thread Analysis) */}
        <div className={`
          bg-white flex flex-col shrink-0 transition-all duration-[50ms] ease-out origin-right
          ${isChatOpen
            ? 'fixed inset-0 z-50 md:static md:w-[500px] lg:w-[600px] opacity-100 shadow-xl md:shadow-none md:border-l md:border-slate-200'
            : 'w-0 opacity-0 overflow-hidden'}
        `}>
          {/* Important: Use fixed widths in min-w to prevent content squashing during transition */}
          <div className="flex-1 flex flex-col min-w-full md:min-w-[500px] lg:min-w-[600px] h-full overflow-hidden bg-white">

            {/* Panel Header (Fixed at top) */}
            <div className="shrink-0 bg-white/95 z-20 px-4 md:px-6 py-4 border-b border-slate-100 shadow-sm flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] bg-sage-100 text-sage-600 px-2 py-0.5 rounded font-bold mb-1 inline-block">グループディスカッション</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {user?.role === 'system_admin' && availableGroups.length > 0 ? (
                    <select
                      value={activeThreadRootId || ''}
                      onChange={(e) => setActiveThreadRootId(Number(e.target.value))}
                      className="text-sm font-bold text-sage-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 max-w-[200px] cursor-pointer outline-none focus:ring-2 focus:ring-sage-400"
                    >
                      {availableGroups.map((g, idx) => {
                        const groupName = g.content.split('\n')[0].replace('System Root for ', '') || `グループ ${idx + 1}`;
                        return (
                          <option key={g.id} value={g.id}>
                            {groupName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <h3 className="text-sm font-bold text-sage-800 line-clamp-1">
                      {availableGroups.find(g => g.id === activeThreadRootId)?.content.split('\n')[0].replace('System Root for ', '') || '報告ディスカッション'}
                    </h3>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseRightPanel}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-full transition-all border border-slate-200/60 shadow-sm shrink-0 ml-4"
                title="スレッドを閉じる"
              >
                <div className="flex items-center justify-center bg-white rounded-full w-5 h-5 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px]">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <span className="text-xs font-bold mr-1">閉じる</span>
              </button>
            </div >

            {/* Scrollable Content Area */}
            < div className="flex-1 overflow-y-auto scrollbar-thin" >
              {/* Thread Analysis Area (Top) */}
              < div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100" >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AIファシリテーターの整理と提案
                  </h4>
                  {activeThreadRootId && (user?.role === 'system_admin' || user?.org_role === 'admin') && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleToggleAnalysisPublish}
                        disabled={isUpdating}
                        className={`text-[10px] px-2 py-1 rounded shadow-sm transition-all flex items-center gap-1 font-bold ${data.is_comment_analysis_published ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                        title={data.is_comment_analysis_published ? "非公開にする" : "一般公開する"}
                      >
                        {data.is_comment_analysis_published ? <><Archive className="w-3 h-3" /> 非公開</> : <><CheckCircle className="w-3 h-3 text-green-600" /> 公開</>}
                      </button>
                      <button
                        onClick={() => handleAnalyzeThread(activeThreadRootId!)}
                        disabled={isAnalyzing}
                        className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded shadow-sm hover:bg-amber-50 transition-all flex items-center gap-1 font-bold disabled:opacity-50"
                      >
                        {isAnalyzing ? <div className="animate-spin h-3 w-3 border-b-2 border-amber-600 rounded-full"></div> : <span className="text-xs">↻</span>}
                        更新
                      </button>
                    </div>
                  )}
                </div>

                {
                  currentAnalysis ? (
                    <div className="space-y-4">
                      {/* Next Actions (Directly displayed) */}
                      {currentAnalysis.next_steps?.length > 0 && (
                        <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden">
                          <div className="divide-y divide-amber-50/50">
                            {Array.isArray(currentAnalysis.next_steps) ? (
                              currentAnalysis.next_steps.map((step: any, i: number) => {
                                const isObject = typeof step === 'object' && step !== null && 'title' in step;
                                const title = isObject ? step.title : step;
                                const detail = isObject ? step.detail : null;

                                return (
                                  <details key={i} className="group open:bg-amber-50/30 transition-colors">
                                    <summary className="px-4 py-3 cursor-pointer flex items-start gap-2 list-none outline-none">
                                      <CheckCircle className="w-4 h-4 text-sage-500 shrink-0 mt-0.5" />
                                      <span className="text-xs text-slate-700 font-bold leading-relaxed flex-1">{title}</span>
                                      {detail && (
                                        <ChevronDown className="w-4 h-4 text-amber-400 group-open:rotate-180 transition-transform shrink-0" />
                                      )}
                                    </summary>
                                    {detail && (
                                      <div className="px-4 pb-3 pl-10 text-xs text-slate-600 leading-relaxed">
                                        {detail}
                                      </div>
                                    )}
                                  </details>
                                );
                              })
                            ) : (
                              // Fallback for legacy string next_steps
                              <p className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{currentAnalysis.next_steps}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 bg-white/50 rounded-lg border border-dashed border-amber-200">
                      <p className="text-xs text-slate-400 mb-2">まだ分析結果がありません</p>

                      {/* Admin View */}
                      {(user?.role === 'system_admin' || user?.org_role === 'admin') ? (
                        <>
                          {activeThreadRootId ? (
                            <button
                              onClick={() => handleAnalyzeThread(activeThreadRootId!)}
                              disabled={isAnalyzing}
                              className="text-[10px] text-amber-600 hover:text-amber-800 underline disabled:opacity-50"
                            >
                              分析を実行する
                            </button>
                          ) : (
                            <p className="text-[10px] text-slate-400">スレッドが作成されると分析を実行できます</p>
                          )}
                        </>
                      ) : (
                        /* Member View */
                        <p className="text-[10px] text-slate-400">
                          {!activeThreadRootId
                            ? "スレッドが作成され、分析が実行されるとここに表示されます"
                            : "分析がされるまでお待ちください"}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-4 md:p-6 pb-32">
                <CommentTree
                  comments={activeThreadRootId ? (data.comments || []) : []}
                  rootCid={activeThreadRootId || -1}
                  currentUserId={user?.id}
                  sessionId={data.id}
                  onRefresh={async () => {
                    const res = await axios.get(`/api/dashboard/sessions/${id}`, { withCredentials: true });
                    setData(res.data);
                  }}
                />
              </div>
            </div>

            {/* Input Area (Fixed Bottom of Panel) */}
            <div className="bg-white border-t border-slate-100 p-4 sticky bottom-0 z-30">
              {user?.role === 'system_admin' ? (
                <div className="py-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  <p>システム管理者は閲覧モードです。ディスカッションには参加できません。</p>
                </div>
              ) : !isMemberOfActiveGroup && availableGroups.length > 0 && activeThreadRootId ? (
                <div className="py-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">
                  <p>この議論グループのメンバーではないため、参加できません。</p>
                </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-2 fade-in">
                  <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {isCreatingPost ? "新しいディスカッションを開始" : "コメントを投稿"}
                  </h4>
                  <RichTextEditor
                    content={postContent}
                    onChange={setPostContent}
                    placeholder="課題について意見やアイデアを投稿しましょう..."
                    className="min-h-[100px] mb-2 text-sm"
                    minHeight="100px"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center text-xs text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="mr-1.5 rounded text-sage-600 focus:ring-sage-500"
                      />
                      匿名で投稿する
                    </label>
                    <button
                      onClick={handleCreatePost}
                      disabled={!postContent.trim()}
                      className="btn-primary px-4 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      投稿する
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Group Members Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsGroupModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-sage-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sage-600" />
                グループメンバー一覧
              </h3>
              <div className="flex items-center gap-2">
                {isAdmin && availableGroups.length > 0 && (
                  <button
                    onClick={() => {
                      if (isEditingGroups) {
                        // Cancel
                        const init: Record<number, string[]> = {};
                        availableGroups.forEach(g => {
                          const membersMatch = g.content.match(/members:\[(.*?)\]/);
                          init[g.id] = membersMatch ? membersMatch[1].split(',').map((id: string) => id.trim()).filter(Boolean) : [];
                        });
                        setTempGroupMembers(init);
                        setIsEditingGroups(false);
                      } else {
                        setIsEditingGroups(true);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-colors ${isEditingGroups ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                      }`}
                  >
                    {isEditingGroups ? <><X className="w-3 h-3" /> キャンセル</> : <><FileEdit className="w-3 h-3" /> 入れ替え</>}
                  </button>
                )}
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              {availableGroups.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p>まだグループディスカッションは作成されていません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableGroups.map((g, idx) => {
                    const groupName = g.content.split('\n')[0].replace('System Root for ', '') || `グループ ${idx + 1}`;
                    const memberIds = tempGroupMembers[g.id] || [];

                    return (
                      <div key={g.id} className={`bg-white border text-sm rounded-lg p-4 shadow-sm transition-colors ${isEditingGroups ? 'border-sage-400 border-2' : 'border-slate-200'}`}>
                        <h4 className="font-bold text-sage-800 mb-2 border-b border-slate-100 pb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-sage-100 text-sage-700 flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          {groupName}
                          <span className="ml-auto text-[10px] text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">
                            {memberIds.length} 名
                          </span>
                        </h4>
                        {memberIds.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-2 mt-3">
                            {memberIds.map(uid => {
                              const m = orgMembers.find(member => String(member.id) === String(uid));
                              const isMe = String(uid) === String(user?.id);
                              return (
                                <li key={uid} className={`flex items-center gap-2 text-sm p-2 select-none rounded-md transition-colors ${isMe ? 'bg-sage-50 border border-sage-200 text-sage-800 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-sage-500' : 'bg-slate-200'}`}>
                                    <UserIcon className={`w-3 h-3 ${isMe ? 'text-white' : 'text-slate-500'}`} />
                                  </div>
                                  <span className="truncate flex-1">{m ? m.username : `ID: ${uid}`}</span>
                                  {!m && <span className="text-[10px] text-slate-400 border border-slate-200 px-1 rounded">退会</span>}

                                  {isEditingGroups && (
                                    <div className="ml-2 shrink-0">
                                      <select
                                        className="text-xs border-slate-300 rounded px-1.5 py-1 text-slate-700 bg-white"
                                        value={g.id}
                                        onChange={(e) => handleMoveMember(uid, g.id, Number(e.target.value))}
                                      >
                                        {availableGroups.map((ag, aIdx) => (
                                          <option key={ag.id} value={ag.id}> グループ {aIdx + 1}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 mb-0 py-2">メンバーが割り当てられていません</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 text-right flex items-center justify-end gap-2">
              {isEditingGroups && (
                <button
                  onClick={handleSaveGroups}
                  disabled={isSavingGroups}
                  className="btn-primary px-6 py-2 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingGroups && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white inline-block"></span>}
                  変更を保存
                </button>
              )}
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="btn-secondary px-6 py-2 text-sm font-bold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SessionDetailContent />
    </Suspense>
  );
}
