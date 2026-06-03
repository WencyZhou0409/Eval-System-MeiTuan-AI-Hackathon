import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileBarChart, History, BookOpen } from 'lucide-react'
import { EvalProvider } from './context/EvalContext'
import Dashboard from './pages/Dashboard'
import ConversationReplay from './pages/ConversationReplay'
import ReportDetail from './pages/ReportDetail'
import HistoryPage from './pages/History'
import Guide from './pages/Guide'

function RadarLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
      <path d="M6 23 Q16 5 26 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M8.5 23 Q16 9 23.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6"/>
      <path d="M11.5 23 Q16 13 20.5 23" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <circle cx="16" cy="23" r="2.2" fill="white"/>
      <line x1="16" y1="20.8" x2="16" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function App() {
  return (
    <EvalProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f1117] flex">
          {/* Sidebar */}
          <aside className="w-60 bg-[#1a1d2e] border-r border-[#2a2f42] p-4 flex flex-col fixed h-full">
            <div className="flex items-center gap-2.5 mb-10 px-3 pt-2">
              <RadarLogo />
              <div>
                <h1 className="text-sm font-bold text-gray-100 tracking-wide leading-tight">外呼智测台</h1>
                <p className="text-[10px] text-indigo-400/70 leading-tight mt-0.5">多轮对话评测系统</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              <NavItem to="/" icon={<LayoutDashboard size={18} />} label="控制台" />
              <NavItem to="/reports" icon={<FileBarChart size={18} />} label="评测报告" />
              <NavItem to="/conversations" icon={<MessageSquare size={18} />} label="对话回放" />
              <NavItem to="/history" icon={<History size={18} />} label="历史记录" />
              <div className="my-2 border-t border-[#2a2f42]" />
              <NavLink
                to="/guide"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-indigo-600/10 text-indigo-300 border-indigo-500/25 hover:bg-indigo-600/20 hover:border-indigo-500/40'
                  }`
                }
              >
                <BookOpen size={18} />
                产品说明
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 leading-tight">
                  介绍
                </span>
              </NavLink>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 ml-60 p-8 overflow-auto min-h-screen">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<ReportDetail />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/conversations" element={<ConversationReplay />} />
              <Route path="/conversations/:id" element={<ConversationReplay />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/guide" element={<Guide />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </EvalProvider>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
          isActive
            ? 'bg-indigo-600/20 text-indigo-400 font-medium'
            : 'text-gray-400 hover:text-gray-200 hover:bg-[#252a3a]'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export default App
