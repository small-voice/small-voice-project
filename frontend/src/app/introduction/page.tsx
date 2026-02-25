import Image from 'next/image';
import Link from 'next/link';
import {
  Github, Play, ExternalLink, User, Shield, Users, Server, Database,
  Brain, Globe, Lock, Download, Info, CheckCircle2, MessageSquare,
  BarChart3, ListChecks, Vote, RefreshCw, FileText, ArrowRight,
  Megaphone, Filter, Shuffle, Bot, ClipboardList, Star
} from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';

function CycleDiagram() {
  const steps = [
    { id: 1, num: '①', label: '問題提起', emoji: '📋', color: '#4f7c6a', g0: '#4f7c6a', g1: '#6dae90', lightColor: '#d4e8df', angle: -90 },
    { id: 2, num: '②', label: '意見の可視化', emoji: '📊', color: '#2563eb', g0: '#2563eb', g1: '#60a5fa', lightColor: '#dbeafe', angle: -18 },
    { id: 3, num: '③', label: 'グループ議論', emoji: '💬', color: '#7c3aed', g0: '#7c3aed', g1: '#a78bfa', lightColor: '#ede9fe', angle: 54 },
    { id: 4, num: '④', label: '政策立案', emoji: '📝', color: '#d97706', g0: '#d97706', g1: '#fbbf24', lightColor: '#fef3c7', angle: 126 },
    { id: 5, num: '⑤', label: '政策FB', emoji: '🔄', color: '#dc2626', g0: '#dc2626', g1: '#f87171', lightColor: '#fee2e2', angle: 198 },
  ];

  const cx = 400;
  const cy = 400;
  const r = 230;
  const nr = 60;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  return (
    <div className="relative w-full max-w-[720px] mx-auto">
      <svg viewBox="0 0 800 800" className="w-full h-auto">
        <defs>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
          </filter>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0fdf4" />
          </radialGradient>
          {steps.map((step) => (
            <radialGradient key={`grad-${step.id}`} id={`nodeGrad-${step.id}`} cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor={step.lightColor} />
            </radialGradient>
          ))}
        </defs>

        {/* Outer dashed ring */}
        <circle cx={cx} cy={cy} r={r + 36} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="8 8" />

        {/* Connecting arcs */}
        {steps.map((step, i) => {
          const next = steps[(i + 1) % steps.length];
          const startAngle = step.angle + 28;
          const endAngle = next.angle - 28;
          const sRad = (startAngle * Math.PI) / 180;
          const eRad = (endAngle * Math.PI) / 180;
          const sx = cx + r * Math.cos(sRad);
          const sy = cy + r * Math.sin(sRad);
          const ex = cx + r * Math.cos(eRad);
          const ey = cy + r * Math.sin(eRad);
          const tAngle = endAngle + 90;
          const tr = (tAngle * Math.PI) / 180;
          return (
            <g key={`arc-${step.id}`}>
              {/* glow */}
              <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
                fill="none" stroke={next.color} strokeWidth="9" strokeOpacity="0.1" strokeLinecap="round" />
              {/* line */}
              <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
                fill="none" stroke={next.color} strokeWidth="3" strokeOpacity="0.55" strokeLinecap="round" />
              <polygon
                points={`${ex},${ey} ${ex + 11 * Math.cos(tr)},${ey + 11 * Math.sin(tr)} ${ex - 11 * Math.cos(tr)},${ey - 11 * Math.sin(tr)}`}
                fill={next.color} fillOpacity="0.85"
              />
            </g>
          );
        })}

        {/* Center circle */}
        <circle cx={cx} cy={cy} r={104} fill="url(#centerGrad)" stroke="#86efac" strokeWidth="3" filter="url(#nodeShadow)" />
        <text x={cx} y={cy - 22} textAnchor="middle" fontSize="18" fontWeight="800" fill="#166534" fontFamily="system-ui,sans-serif">Small Voice</text>
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#4f7c6a" fontFamily="system-ui,sans-serif">広聴サイクル</text>
        <text x={cx} y={cy + 36} textAnchor="middle" fontSize="32" fontFamily="system-ui,sans-serif">🍃</text>

        {steps.map((step) => {
          const pos = polarToXY(step.angle, r);
          return (
            <g key={`node-${step.id}`} filter="url(#nodeShadow)">
              <circle cx={pos.x} cy={pos.y} r={nr + 8} fill="none" stroke={step.color} strokeWidth="1.5" strokeOpacity="0.2" />
              <circle cx={pos.x} cy={pos.y} r={nr} fill={`url(#nodeGrad-${step.id})`} stroke={step.color} strokeWidth="2.5" />
              {/* number badge */}
              <circle cx={pos.x - nr * 0.62} cy={pos.y - nr * 0.62} r={15} fill={step.color} />
              <text x={pos.x - nr * 0.62} y={pos.y - nr * 0.62 + 5}
                textAnchor="middle" fontSize="14" fontWeight="900" fill="white" fontFamily="system-ui,sans-serif">{step.id}</text>
              {/* emoji */}
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fontSize="32" fontFamily="system-ui,sans-serif">{step.emoji}</text>
            </g>
          );
        })}

        {steps.map((step) => {
          const pos = polarToXY(step.angle, r + 94);
          return (
            <g key={`label-${step.id}`}>
              <text x={pos.x} y={pos.y} textAnchor="middle" fontSize="14" fontWeight="800" fill={step.color} fontFamily="system-ui,sans-serif">
                {step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ======================================================
// Step Detail Cards
// ======================================================
interface StepDetail {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  description: string;
  bullets: { icon: React.ReactNode; title: string; desc: string }[];
}

function StepCard({ step }: { step: StepDetail }) {
  return (
    <div className={`relative rounded-2xl border-2 ${step.borderColor} ${step.bgColor} px-6 pb-6 pt-6 shadow-sm hover:shadow-lg transition-all`}>
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: step.color }}>
          {step.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold mb-0.5" style={{ color: step.color }}>{step.title}</h3>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{step.subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-4 mb-3">{step.description}</p>
      <ul className="space-y-2">
        {step.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="shrink-0 mt-0.5">{b.icon}</span>
            <span><span className="font-bold">{b.title}</span>{b.desc ? `：${b.desc}` : ''}</span>
          </li>
        ))}
      </ul>

    </div>
  );
}

// ======================================================
// Main Page
// ======================================================
export default function LandingPage() {
  const users = [
    { role: 'システム管理者', name: 'システム管理者1', email: 'system@example.com', pass: 'SystemAdmin1234!', org: '-' },
    { role: 'システム管理者', name: 'システム管理者2', email: 'system2@example.com', pass: 'SystemAdmin1234!', org: '-' },
    { role: 'システム管理者', name: 'システム管理者3', email: 'system3@example.com', pass: 'SystemAdmin1234!', org: '-' },
    { role: 'システム管理者', name: 'システム管理者4', email: 'system4@example.com', pass: 'SystemAdmin1234!', org: '-' },
    { role: 'システム管理者', name: 'システム管理者5', email: 'system5@example.com', pass: 'SystemAdmin1234!', org: '-' },
    { role: '組織管理者', name: '組織管理者 (全兼務)', email: 'admin@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '組織管理者', name: '管理者1 (兼務)', email: 'admin1@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '組織管理者', name: '管理者2 (案件1責任者)', email: 'admin2@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1' },
    { role: '組織管理者', name: '管理者3 (案件2責任者)', email: 'admin3@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件2' },
    { role: '組織管理者', name: '管理者4 (兼務)', email: 'admin4@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '組織管理者', name: '管理者5 (兼務)', email: 'admin5@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '組織管理者', name: '管理者6 (兼務)', email: 'admin6@example.com', pass: 'OrgAdmin1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー1', email: 'user1@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー2', email: 'user2@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー3', email: 'user3@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1' },
    { role: '一般ユーザー', name: 'ユーザー4', email: 'user4@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1' },
    { role: '一般ユーザー', name: 'ユーザー5', email: 'user5@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1' },
    { role: '一般ユーザー', name: 'ユーザー6', email: 'user6@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件1' },
    { role: '一般ユーザー', name: 'ユーザー7', email: 'user7@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー8', email: 'user8@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー9', email: 'user9@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件2' },
    { role: '一般ユーザー', name: 'ユーザー10', email: 'user10@example.com', pass: 'GeneralUser1234!', org: '株式会社サンプル, サンプル部署, サンプル案件2' },
  ];

  const cycleSteps: StepDetail[] = [
    {
      id: 1,
      title: '問題提起',
      subtitle: 'データ収集フェーズ',
      color: '#4f7c6a',
      bgColor: 'bg-emerald-50/60',
      borderColor: 'border-emerald-300',
      icon: <FileText className="w-6 h-6" />,
      description: '多様なチャネルから組織の声を集める。ただしアンケート集計時点では個人のバイアスがかかっている状態です。',
      bullets: [
        { icon: <MessageSquare className="w-4 h-4 text-emerald-600" />, title: '雑談掲示板からのフォーム作成', desc: 'メンバーの日常の声をAIが分析し、フォームのテーマを自動抽出' },
        { icon: <Megaphone className="w-4 h-4 text-emerald-600" />, title: 'メンバーからのフォーム申請', desc: 'ボトムアップで問いをフォーム化し管理者へ承認申請' },
        { icon: <Download className="w-4 h-4 text-emerald-600" />, title: '外部フォームのインポート', desc: 'GoogleフォームなどのCSVを一括取り込み' },
      ],
    },
    {
      id: 2,
      title: '意見の可視化',
      subtitle: 'AI分析・クラスタリングフェーズ',
      color: '#2563eb',
      bgColor: 'bg-blue-50/60',
      borderColor: 'border-blue-300',
      icon: <BarChart3 className="w-6 h-6" />,
      description: '個人のバイアスを超えて、自分以外の集団がどのような意見傾向を持つかをAIが客観的に可視化。多数意見に埋もれがちな少数派の声も救い上げます。',
      bullets: [
        { icon: <Filter className="w-4 h-4 text-blue-600" />, title: 'クラスタリング', desc: '多数の意見をカテゴライズし認識しやすい形に整理' },
        { icon: <ListChecks className="w-4 h-4 text-blue-600" />, title: '課題リスト', desc: '多数の意見を要約し、取り組むべき課題を自動抽出・リスト化' },
        { icon: <Star className="w-4 h-4 text-blue-600" />, title: 'Small Voice（外れ値）検出', desc: '少数派の意見も独立したトピックとして抽出・保持。潜在リスクや革新的アイデアを対話のテーブルへ' },
      ],
    },
    {
      id: 3,
      title: 'ランダムに分けられた少数グループで議論',
      subtitle: 'グループ対話フェーズ',
      color: '#7c3aed',
      bgColor: 'bg-violet-50/60',
      borderColor: 'border-violet-300',
      icon: <MessageSquare className="w-6 h-6" />,
      description: '可視化された集団の意見を踏まえ、互いの意見の隔たりを含めて架け橋となる政策をグループで話し合います。',
      bullets: [
        { icon: <Shuffle className="w-4 h-4 text-violet-600" />, title: 'ランダムグループ割り当て', desc: '議論しやすい少人数グループにランダムで配置' },
        { icon: <Users className="w-4 h-4 text-violet-600" />, title: 'グループ専用チャット空間', desc: '各グループが独立した対話スペースを持つ' },
        { icon: <Bot className="w-4 h-4 text-violet-600" />, title: 'AIファシリテーター', desc: '中立的立場で議論をリードし、合意形成をサポート' },
      ],
    },
    {
      id: 4,
      title: 'グループごとの政策を立案',
      subtitle: '政策管理フェーズ',
      color: '#d97706',
      bgColor: 'bg-amber-50/60',
      borderColor: 'border-amber-300',
      icon: <ClipboardList className="w-6 h-6" />,
      description: '議論から生まれたアイデアを、具体的な政策として立案・管理・実行まで一貫して追跡します。',
      bullets: [
        { icon: <ListChecks className="w-4 h-4 text-amber-600" />, title: 'Todoリスト形式の政策管理', desc: '立案〜実行まで進捗を可視化して管理' },
        { icon: <Star className="w-4 h-4 text-amber-600" />, title: 'メンバーによる5段階評価', desc: 'それぞれの政策に対してメンバーが評価を実施' },
      ],
    },
    {
      id: 5,
      title: '政策フィードバック',
      subtitle: '次サイクルへの接続フェーズ',
      color: '#dc2626',
      bgColor: 'bg-red-50/60',
      borderColor: 'border-red-300',
      icon: <RefreshCw className="w-6 h-6" />,
      description: '政策の実行結果を収集し、それを次の広聴サイクルへと繋げることで、継続的な改善ループを実現します。',
      bullets: [
        { icon: <Vote className="w-4 h-4 text-red-600" />, title: 'FBアンケート作成', desc: '立案した政策ごとにフィードバック収集用アンケートをワンクリックで即時生成' },
        { icon: <RefreshCw className="w-4 h-4 text-red-600" />, title: '次の広聴サイクルへ', desc: '収集したFBを①の問題提起へと繋げ、継続的なループを形成' },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-sage-50 text-slate-800 font-sans selection:bg-sage-200 selection:text-sage-900">

      {/* ===== Hero Section ===== */}
      <header className="relative overflow-hidden bg-gradient-to-br from-sage-100 to-white py-20 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sage-800 to-sage-600 mb-6 tracking-tight drop-shadow-sm">
            Small Voice <span className="text-3xl sm:text-4xl align-top">🍃</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-10 leading-relaxed font-light px-4">
            組織内の「小さな声」を聴き、課題解決を促進する<br className="hidden md:inline" />AI搭載型ブロードリスニングシステム
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2 group"
            >
              <ExternalLink className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              システムにログイン / 利用開始
            </Link>
            <a
              href="https://github.com/small-voice/small-voice-project"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-slate-700 font-bold rounded-xl shadow-md hover:shadow-lg border border-gray-200 transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              GitHubを見る
            </a>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sage-200/30 rounded-full blur-3xl opacity-60 animate-pulse"></div>
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-orange-100/40 rounded-full blur-3xl opacity-60 delay-700 animate-pulse"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-16">

        {/* 特別セクション: Small Voiceについて */}
        <section className="bg-white/40 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/60 shadow-xl ring-1 ring-sage-900/5">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-sage-700 uppercase bg-sage-100 rounded-full border border-sage-200">
              <Star className="w-3.5 h-3.5 fill-sage-600 text-sage-600" />
              Core Concept
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              🍃 Small Voiceについて
            </h2>
            <p className="text-slate-600 max-w-4xl mx-auto text-lg leading-relaxed font-medium">
              Small Voiceの核心は、<br className="hidden md:inline" />
              <strong className="text-sage-900 font-extrabold underline decoration-sage-300 decoration-4 underline-offset-4">問題提起 → 意見の可視化 → 対話 → 立案実行 → フィードバック</strong><br />
              をシームレスかつ反復的に実現するサイクル設計にあります。
            </p>
          </div>

          {/* Cycle Diagram */}
          <div className="mb-14">
            <CycleDiagram />
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-14">
            {cycleSteps.slice(0, 4).map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
            <div className="md:col-span-2">
              <div className={`rounded-2xl border-2 ${cycleSteps[4].borderColor} ${cycleSteps[4].bgColor} px-8 py-8 shadow-sm text-center`}>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transform -rotate-3"
                    style={{ backgroundColor: cycleSteps[4].color }}>
                    {cycleSteps[4].icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black" style={{ color: cycleSteps[4].color }}>{cycleSteps[4].title}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cycleSteps[4].subtitle}</p>
                  </div>
                </div>
                <p className="text-base text-slate-600 leading-relaxed mb-6 max-w-2xl mx-auto">{cycleSteps[4].description}</p>
                <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                  {cycleSteps[4].bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                      <span className="shrink-0 mt-0.5">{b.icon}</span>
                      <span><span className="font-bold">{b.title}</span>{b.desc ? `：${b.desc}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="md:col-span-2 bg-gradient-to-r from-sage-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white text-center shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <RefreshCw className="w-32 h-32 animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-2xl font-black tracking-tight">継続的な改善ループ</span>
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <p className="text-sage-50 text-base leading-relaxed mb-6 max-w-2xl mx-auto font-medium">
                  ⑤政策FBで収集した実行結果は、そのまま①の問題提起へと繋がります。<br />
                  このサイクルを回し続けることで、組織の意思決定と課題解決が<strong className="text-white font-black underline underline-offset-4">継続的かつ自律的に</strong>進化します。
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
                  {['① 問題提起', '② 可視化', '③ 議論', '④ 立案', '⑤ FB'].map((label, i, arr) => (
                    <span key={label} className="flex items-center gap-3">
                      <span className="bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20">{label}</span>
                      {i < arr.length - 1 && <ArrowRight className="w-4 h-4 opacity-60" />}
                    </span>
                  ))}
                  <ArrowRight className="w-4 h-4 opacity-60" />
                  <span className="bg-white text-emerald-700 rounded-full px-4 py-1.5 font-black shadow-lg">① へ戻る</span>
                </div>
              </div>
            </div>
          </div>

          {/* その他の特徴 (Small Voiceについての詳細) */}
          <div className="mt-16 pt-16 border-t border-sage-200/60">
            <div className="inline-flex items-center gap-3 mb-8 px-5 py-2 bg-sage-50 rounded-2xl border border-sage-100">
              <Server className="w-5 h-5 text-sage-600" />
              <h3 className="text-lg font-black text-sage-900 tracking-tight">
                🏗️ 拡張性と安全性を備えた基盤機能
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-8 items-stretch">
              {/* Multi-tenant */}
              <div className="bg-white/80 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all h-full flex flex-col group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-slate-100 p-4 rounded-2xl text-slate-600 shrink-0 group-hover:bg-sage-100 group-hover:text-sage-600 transition-colors">
                    <Server className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">柔軟な組織管理</h4>
                </div>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
                  組織の実態に即して、部署やプロジェクト単位で独立した管理空間（テナント）を柔軟に作成・運用できます。
                </p>
                <ul className="space-y-5">
                  {[
                    { icon: <CheckCircle2 className="w-5 h-5 text-sage-500 mt-0.5 shrink-0" />, title: '多重所属に対応', desc: '複数の組織に同時に所属可能' },
                    { icon: <CheckCircle2 className="w-5 h-5 text-sage-500 mt-0.5 shrink-0" />, title: '実態に即した管理', desc: '部署・案件・プロジェクト単位で運用' },
                    { icon: <CheckCircle2 className="w-5 h-5 text-sage-500 mt-0.5 shrink-0" />, title: 'セキュアな分離', desc: 'データは組織ごとに論理的に分離' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                      {item.icon}
                      <span><span className="font-bold text-slate-900">{item.title}</span>：{item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Permission Design */}
              <div className="bg-white/80 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all h-full group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-slate-100 p-4 rounded-2xl text-slate-600 shrink-0 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">3つの権限設計</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50">
                    <h5 className="font-bold text-purple-900 mb-1 flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" /> システム管理者
                    </h5>
                    <p className="text-xs text-purple-800/80 leading-relaxed font-medium">
                      システム全体の統括。組織の作成や全ユーザーの管理権限を持ちます。
                    </p>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <h5 className="font-bold text-blue-900 mb-1 flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" /> 組織管理者
                    </h5>
                    <p className="text-xs text-blue-800/80 leading-relaxed font-medium">
                      所属組織内のフォーム作成・管理、分析実行・結果管理を行います。
                    </p>
                  </div>
                  <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50">
                    <h5 className="font-bold text-green-900 mb-1 flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" /> 一般ユーザー
                    </h5>
                    <p className="text-xs text-green-800/80 leading-relaxed font-medium">
                      フォームへの回答・申請、分析結果の閲覧、議論への参加が可能です。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1. ブロードリスニングとは */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <Brain className="w-6 h-6 text-sage-600" />
            1. 🔍 ブロードリスニングとは
          </h2>
          <div className="space-y-6">
            <p className="text-slate-600 leading-relaxed mb-5">
              「ブロードリスニング」とは、一方的な情報発信である「ブロードキャスト」と対をなす概念です。膨大な声を収集しても情報過多に陥ることなく、AIを活用して多種多様な意見をクラスタリングや要約することで、集団内の意見傾向を誰もが認識しやすい形で可視化します。こうした分析に基づき、個人のバイアスに囚われず課題を俯瞰することが可能になり、対話を通じて異なる意見の架け橋となる政策を導き出し、スピーディーな合意形成を実現する手法です。
            </p>

            <div className="mt-6 max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-sage-200 bg-white p-2">
              <Image
                src="/images/broad-listening-concept.png"
                alt="ブロードリスニングのコンセプト（ブロードキャストとの比較）"
                width={800}
                height={533}
                className="w-full h-auto rounded-xl"
              />
              <p className="text-center text-xs text-slate-400 mt-2 italic">
                図：ブロードキャストからブロードリスニングの時代へ
              </p>
            </div>
          </div>
        </section>

        {/* 2. デモ動画 */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <Play className="w-6 h-6 text-sage-600" />
            🎬 2. デモ動画
          </h2>
          <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-sage-200 bg-black">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/lhdkhxH_XnM?vq=hd1080"
              title="Small Voice Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* 3. デモ公開URL */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <Globe className="w-6 h-6 text-sage-600" />
            3. 🔗 デモ公開URL
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login URL</label>
              <div className="mt-1 font-mono text-base sm:text-lg text-sage-700 selection:bg-sage-200">
                <a
                  href="https://small-voice.xyz/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-2 break-all sm:break-normal"
                >
                  https://small-voice.xyz/login
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              </div>
            </div>

            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Basic Auth Credentials</span>
              </div>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 font-mono text-sm text-slate-600 items-center">
                <span className="text-slate-400">User:</span>
                <span className="font-bold select-all">smallvoice</span>
                <CopyButton text="smallvoice" className="ml-2" />
                <span className="text-slate-400">Pass:</span>
                <span className="font-bold select-all">R3HCydsK</span>
                <CopyButton text="R3HCydsK" className="ml-2" />
              </div>
            </div>
            <div className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
              ※ 本番環境はBasic認証によって保護されています。アクセス時に上記のIDとパスワードを入力してください。
            </div>
          </div>
        </section>

        {/* 4. デモ用ユーザー */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <User className="w-6 h-6 text-sage-600" />
            👤 4. デモ用ユーザー
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-4 font-bold">表示名</th>
                    <th className="px-3 sm:px-6 py-4 font-bold">メールアドレス</th>
                    <th className="px-3 sm:px-6 py-4 font-bold">パスワード(初期)</th>
                    <th className="px-3 sm:px-6 py-4 font-bold whitespace-nowrap">権限種別</th>
                    <th className="px-3 sm:px-6 py-4 font-bold w-1/3">所属組織</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{user.name}</td>
                      <td className="px-3 sm:px-6 py-4 font-mono select-all text-sage-700">
                        <div className="flex items-center gap-2">
                          <span>{user.email}</span>
                          <CopyButton text={user.email} />
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 font-mono select-all text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>{user.pass}</span>
                          <CopyButton text={user.pass} />
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${user.role.includes('システム') ? 'bg-purple-100 text-purple-800' :
                            user.role.includes('組織') ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs text-slate-500">{user.org}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5. テスト用レポートデータ */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <Database className="w-6 h-6 text-sage-600" />
            📦 5. テスト用レポートデータ
          </h2>
          <div className="bg-slate-50/50 rounded-2xl p-6 text-center border border-slate-200">
            <p className="text-slate-600 mb-6 leading-relaxed">
              分析機能お試し用に、ダミーデータのセットを用意しました。<br />
              ダウンロードしてCSVインポート機能から取り込むことで、すぐに分析を試すことができます。
            </p>
            <a
              href="/downloads/sample_data.zip"
              download
              className="inline-flex items-center gap-3 px-8 py-4 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 group"
            >
              <Download className="w-5 h-5 group-hover:animate-bounce" />
              テストデータ一括ダウンロード (ZIP)
            </a>
          </div>
        </section>

        {/* 6. 補足事項 */}
        <section className="bg-white/60 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-white/50 shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-sage-900 border-b border-sage-200 pb-2">
            <Info className="w-6 h-6 text-sage-600" />
            📌 6. 補足事項
          </h2>
          <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <ul className="space-y-4 text-slate-600 leading-relaxed list-inside">
              <li className="flex gap-3">
                <span className="text-sage-500 font-bold shrink-0">•</span>
                <span>デモ公開URLのログイン画面より、こちらに記載のデモ用ユーザーでログインし、自由に操作いただいて問題ありません。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sage-500 font-bold shrink-0">•</span>
                <span>テスト用レポートデータも自由に使い、レポート分析を試してみてください。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sage-500 font-bold shrink-0">•</span>
                <span>本システムはAIエージェント「Antigravity」を活用したバイブコーディングにより、そのほとんどを開発しました。</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12 text-center text-slate-400 text-sm">
        <p>© 2026 Small Voice Project.</p>
        <p className="mt-2 text-xs">Created for Hackathon Submission</p>
      </footer>
    </div>
  );
}
