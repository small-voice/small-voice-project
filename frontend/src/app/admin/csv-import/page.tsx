'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface SessionSummary {
  id: number;
  title: string;
  theme: string;
}

export default function CsvImportPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [groups, setGroups] = useState<{ id: string, title: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string, title: string } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. Check Auth & Load Sessions
  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get('/api/auth/me');
        if (userRes.data.role !== 'system_admin') {
          setMessage({ type: 'error', text: 'システム管理者権限が必要です' });
          return;
        }
        setIsAdmin(true);

        const sessionsRes = await axios.get('/api/dashboard/sessions');
        setSessions(sessionsRes.data);
      } catch (e) {
        setMessage({ type: 'error', text: 'データの読み込みに失敗しました' });
      }
    };
    init();
  }, []);

  // 2. Load Groups when Session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setGroups([]);
      setSelectedGroup(null);
      return;
    }

    const fetchGroups = async () => {
      try {
        const res = await axios.get(`/api/dashboard/sessions/${selectedSessionId}/groups`);
        setGroups(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchGroups();
  }, [selectedSessionId]);

  const handleDownloadTemplate = () => {
    const csvContent = "content\nサンプルコメント1\nサンプルコメント2";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "comment_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedGroup || !file) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    if (selectedGroup.id) {
      formData.append('group_id', selectedGroup.id);
    }
    formData.append('file', file);

    try {
      await axios.post(`/api/dashboard/sessions/${selectedSessionId}/comments/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'インポートが完了しました' });
      setFile(null);
      // Reset file input visually if needed, though state is cleared
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || 'インポートに失敗しました';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && message?.type === 'error') {
    return <div className="p-10 text-center text-red-500 font-bold">{message.text}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">
          議論コメント CSVインポート (管理者用)
        </h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Session Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ステップ1: 議論セッションを選択
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5C7066] focus:border-transparent"
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value) || null)}
              required
            >
              <option value="">セッションを選択してください</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} (ID: {s.id})
                </option>
              ))}
            </select>
          </div>

          {/* Group Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ステップ2: グループを選択
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5C7066] focus:border-transparent"
              value={selectedGroup?.id || selectedGroup?.title || ''}
              onChange={(e) => {
                const val = e.target.value;
                const found = groups.find(g => (g.id || g.title) === val);
                setSelectedGroup(found || null);
              }}
              disabled={!selectedSessionId}
              required
            >
              <option value="">グループを選択してください</option>
              {groups.map((g, i) => (
                <option key={i} value={g.id || g.title}>{g.title}</option>
              ))}
            </select>
            {selectedSessionId && groups.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ※ このセッションにはグループが定義されていないか、読み込めませんでした。
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">
                ステップ3: CSVファイルをアップロード
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                📥 テンプレートをダウンロード
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full"
                required
              />
              <p className="text-xs text-slate-400 mt-2 text-left">
                ※ ヘッダーに <code>content</code> が必須です。<br />
                ※ ユーザーは組織メンバーからランダムに割り当てられます。<br />
                ※ 匿名フラグはランダムに設定されます。
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedSessionId || !selectedGroup || !file}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-md transition-all
              ${loading || !selectedSessionId || !selectedGroup || !file
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-[#5C7066] hover:bg-[#4A5D54] hover:shadow-lg'
              }
            `}
          >
            {loading ? 'インポート中...' : 'インポートを実行する'}
          </button>
        </form>
      </div>
    </div>
  );
}
