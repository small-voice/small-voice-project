'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { BarChart2, Play, AlertCircle } from 'lucide-react';
import { SurveySummary } from '@/types/dashboard';

interface Question {
  id: number;
  text: string;
}

interface AnalysisRunnerProps {
  onSuccess?: () => void;
}

export default function AnalysisRunner({ onSuccess }: AnalysisRunnerProps) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Form
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [groupCount, setGroupCount] = useState<number>(3);
  const [analyzing, setAnalyzing] = useState(false);

  // Progress Log State
  const [progressLog, setProgressLog] = useState<string[]>([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const res = await axios.get('/api/dashboard/surveys', { withCredentials: true });
      setSurveys(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSurveys(false);
    }
  };

  const handleSurveyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = Number(e.target.value);
    setSelectedSurveyId(sId);
    setSelectedQuestionId(null);
    setQuestions([]);
    setReportTitle(''); // Reset title

    if (sId) {
      try {
        const res = await axios.get(`/api/surveys/${sId}`, { withCredentials: true });
        setQuestions(res.data.questions);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qId = Number(e.target.value);
    setSelectedQuestionId(qId);

    // Auto-set title from survey title + question text
    if (qId) {
      const question = questions.find(q => q.id === qId);
      const survey = surveys.find(s => s.id === selectedSurveyId);

      if (question && survey) {
        setReportTitle(`${survey.title} - ${question.text}`);
      } else if (question) {
        setReportTitle(question.text);
      }
    }
  };

  const handleRun = async () => {
    if (!selectedSurveyId || !selectedQuestionId) return;

    setAnalyzing(true);
    setProgressLog(["🚀 分析ジョブを開始しました..."]);

    // Simulation of progress
    const steps = [
      { t: 1500, msg: "🔍 回答データを読み込み中..." },
      { t: 3000, msg: "🧠 AIによる意味解析を実行中 (Vectorization)..." },
      { t: 6000, msg: "📊 トピックの自動クラスタリング中 (K-Means)..." },
      { t: 12000, msg: "🗺️ 2次元マップへの配置計算中 (PCA)..." },
      { t: 18000, msg: "🤖 Geminiによるインサイト抽出中..." },
      { t: 28000, msg: "📝 最終レポートを生成しています..." },
    ];

    const timers = steps.map(step =>
      setTimeout(() => {
        setProgressLog(prev => [...prev, step.msg]);
      }, step.t)
    );

    try {
      const res = await axios.post('/api/dashboard/sessions/analyze', {
        survey_id: selectedSurveyId,
        question_id: selectedQuestionId,
        title: reportTitle,
        group_count: groupCount
      }, {
        withCredentials: true,
        timeout: 600000 // 10 minutes timeout to prevent client-side abort
      });

      const sessId = res.data.session_id;
      setProgressLog(prev => [...prev, "✅ 分析完了！リダイレクトします..."]);

      // Small delay to read "Done"
      setTimeout(() => {
        if (onSuccess) onSuccess();
        router.push(`/dashboard/sessions/${sessId}`);
      }, 1000);

    } catch (e) {
      console.error(e);
      alert("分析に失敗しました。データが足りないか、サーバーエラーです。");
      setAnalyzing(false);
      setProgressLog([]); // clear
    } finally {
      // cleanup timers if needed, though they are fine to cycle out
      // timers.forEach(clearTimeout);
    }
  };

  if (loadingSurveys) return <div className="text-center py-10">読み込み中...</div>;

  return (
    <div className="max-w-xl mx-auto glass-card p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-sage-100 text-sage-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-sage-dark">データ分析を実行</h2>
        <p className="text-slate-500">収集したアンケート回答をAIで分析します</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">1. フォームを選択</label>
          <select
            className="glass-input w-full p-3 text-base"
            onChange={handleSurveyChange}
            value={selectedSurveyId || ''}
            disabled={analyzing}
          >
            <option value="">選択してください</option>
            {surveys.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">2. 分析する質問を選択</label>
          <select
            className="glass-input w-full p-3 text-base"
            onChange={handleQuestionChange}
            value={selectedQuestionId || ''}
            disabled={!selectedSurveyId || analyzing}
          >
            <option value="">選択してください</option>
            {questions.map(q => (
              <option key={q.id} value={q.id}>{q.text}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">3. レポート名</label>
          <input
            type="text"
            className="glass-input w-full p-3 text-base"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="レポートのタイトル"
            disabled={analyzing}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">4. ディスカッショングループ数</label>
          <input
            type="number"
            min="1"
            className="glass-input w-full p-3 text-base"
            value={groupCount}
            onChange={(e) => setGroupCount(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={analyzing}
          />
        </div>

        {/* Improved Progress UI */}
        {analyzing ? (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-6">
            <div className="flex items-center gap-3 mb-3 border-b border-slate-200 pb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sage-primary"></div>
              <span className="font-bold text-sage-700">AI分析を実行中...</span>
            </div>
            <div className="space-y-1 font-mono text-xs text-slate-600 h-48 md:h-64 overflow-y-auto duration-300">
              {progressLog.map((log, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-400 mr-2">{new Date().toLocaleTimeString()}</span>
                  {log}
                </div>
              ))}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <button
              onClick={handleRun}
              disabled={!selectedSurveyId || !selectedQuestionId}
              className={`w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2`}
            >
              <Play className="h-5 w-5" />
              分析を開始する
            </button>
            <p className="text-xs text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              回答数が少ないと分析できない場合があります
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
