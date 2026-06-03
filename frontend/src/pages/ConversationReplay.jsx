import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import { fetchReports, fetchReport } from '../api/client'

const PERSONA_LABELS = {
  cooperative: '配合型',
  resistant: '抗拒型',
  confused: '困惑型',
  off_topic: '跑题型',
  busy: '忙碌型',
  emotional: '情绪型',
}

export default function ConversationReplay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [report, setReport] = useState(null)
  const [selectedId, setSelectedId] = useState(id || null)
  const [selectedSession, setSelectedSession] = useState(0)
  const [selectedTurn, setSelectedTurn] = useState(null)
  const [detailTop, setDetailTop] = useState(0)
  const turnRefs = useRef({})
  const containerRef = useRef(null)

  useEffect(() => {
    fetchReports().then(data => setReports(data.reports || []))
  }, [])

  useEffect(() => {
    if (id) setSelectedId(id)
  }, [id])

  useEffect(() => {
    if (selectedId) {
      fetchReport(selectedId).then(setReport)
    }
  }, [selectedId])

  const handleTurnClick = (turnNum, e) => {
    setSelectedTurn(turnNum)
    // 计算点击元素相对于容器的位置
    const el = turnRefs.current[turnNum]
    const container = containerRef.current
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - containerRect.top + container.scrollTop
      setDetailTop(Math.max(0, offset))
    }
  }

  // 列表视图
  if (!selectedId) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-6">对话回放</h2>
        {reports.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p>暂无对话记录</p>
            <p className="text-sm mt-1 text-gray-600">在控制台启动评测后会在这里显示</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reports.map(r => (
              <div
                key={r.id}
                onClick={() => { setSelectedId(r.id); navigate(`/conversations/${r.id}`) }}
                className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all"
              >
                <div>
                  <p className="text-sm text-gray-200 font-medium">
                    {r.instruction_task || r.instruction_id}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#252a3a] text-gray-400 border border-[#2a2f42]">
                      {r.model_under_test}
                    </span>
                    {r.personas && r.personas.map(p => (
                      <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-300 border border-indigo-500/20">
                        {PERSONA_LABELS[p] || p}
                      </span>
                    ))}
                    <span className="text-xs text-gray-600">
                      {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!report) {
    return <div className="text-center text-gray-500 mt-20">加载中...</div>
  }

  const sessions = report.sessions || []
  const currentSession = sessions[selectedSession]
  const turns = currentSession?.dialogue || []
  const violations = currentSession?.violations || []

  const getViolationsForTurn = (turnNum) => violations.filter(v => v.turn === turnNum)

  return (
    <div>
      <button
        onClick={() => { setSelectedId(null); setReport(null); navigate('/conversations') }}
        className="text-sm text-gray-400 hover:text-gray-200 mb-4 flex items-center gap-1"
      >
        ← 返回列表
      </button>

      {/* 标题区 */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-100">
          {report.instruction_task || '对话回放'}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded bg-[#252a3a] text-gray-400 border border-[#2a2f42]">
            {report.model_under_test}
          </span>
          <span className="text-xs text-gray-600">
            {report.created_at ? new Date(report.created_at).toLocaleString('zh-CN') : ''}
          </span>
        </div>
      </div>

      {/* Session 切换 */}
      {sessions.length > 1 && (
        <div className="flex gap-2 mb-4">
          {sessions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSelectedSession(i); setSelectedTurn(null); setDetailTop(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                i === selectedSession
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#252a3a] border-[#2a2f42] text-gray-400 hover:border-gray-500'
              }`}
            >
              {PERSONA_LABELS[s.persona] || s.persona}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-6 relative" ref={containerRef}>
        {/* 左侧：对话 */}
        <div className="flex-1 space-y-2">
          {turns.map((turn) => {
            const turnViolations = getViolationsForTurn(turn.turn)
            const hasViolation = turnViolations.length > 0
            const isSelected = selectedTurn === turn.turn

            return (
              <div
                key={turn.turn}
                ref={el => turnRefs.current[turn.turn] = el}
                onClick={(e) => handleTurnClick(turn.turn, e)}
                className={`cursor-pointer rounded-xl p-3 border transition-all ${
                  hasViolation ? 'border-red-500/30 bg-red-500/5' :
                  isSelected ? 'border-indigo-500/30 bg-indigo-500/5' :
                  'border-[#2a2f42] bg-[#1e2235] hover:border-[#3a3f52]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    turn.role === 'assistant'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {turn.role === 'assistant' ? 'AI' : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">#{turn.turn}</span>
                      {hasViolation && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle size={11} />
                          {turnViolations.length}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{turn.content}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 右侧：评测详情（跟随位置） */}
        <div className="w-80 shrink-0 relative">
          <div
            className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 transition-all duration-200"
            style={{ position: 'absolute', top: `${detailTop}px`, width: '100%' }}
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              {selectedTurn ? `#${selectedTurn} 评测详情` : '点击对话轮次查看'}
            </h3>
            {selectedTurn && (
              <div className="space-y-3">
                {getViolationsForTurn(selectedTurn).length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle size={14} />
                    该轮次无违规
                  </div>
                ) : (
                  getViolationsForTurn(selectedTurn).map((v, i) => (
                    <div key={i} className="p-3 bg-[#252a3a] rounded-lg border border-[#2a2f42]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          v.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          v.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {v.severity === 'high' ? '严重' : v.severity === 'medium' ? '中等' : '轻微'}
                        </span>
                        <span className="text-xs text-gray-500">{v.dimension}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{v.evidence}</p>
                      <p className="text-xs text-gray-600 mt-1.5">规则: {v.rule_ref}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
