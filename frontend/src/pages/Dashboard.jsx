import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Loader2, CheckCircle, XCircle, Zap, StopCircle } from 'lucide-react'
import { fetchInstructions, startEvaluation } from '../api/client'
import { useEval } from '../context/EvalContext'

const PERSONAS = [
  { value: 'cooperative', label: '配合型' },
  { value: 'resistant', label: '抗拒型' },
  { value: 'confused', label: '困惑型' },
  { value: 'off_topic', label: '跑题型' },
  { value: 'busy', label: '忙碌型' },
  { value: 'emotional', label: '情绪型' },
]

const PERSONA_LABELS = Object.fromEntries(PERSONAS.map(p => [p.value, p.label]))

export default function Dashboard() {
  const navigate = useNavigate()
  const { taskId, status, liveTurns, personaCount, turnsByPersona, personaStatus, startEval, clearEval, cancelEval } = useEval()
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [instructions, setInstructions] = useState([])
  const [selectedInstruction, setSelectedInstruction] = useState('')
  const [selectedPersonas, setSelectedPersonas] = useState(['cooperative'])
  const [model, setModel] = useState('DeepSeek-V3')
  const [maxTurns, setMaxTurns] = useState(15)

  const isRunning = taskId && status && !['completed', 'failed'].includes(status.type)
  const isCompleted = status?.type === 'completed'
  const isFailed = status?.type === 'failed'

  useEffect(() => {
    fetchInstructions().then(data => {
      setInstructions(data.instructions || [])
      if (data.instructions?.length > 0) {
        setSelectedInstruction(data.instructions[0].id)
      }
    })
  }, [])

  const handleStart = async () => {
    if (!selectedInstruction) return
    const res = await startEvaluation({
      instruction_id: selectedInstruction,
      personas: selectedPersonas,
      model_under_test: model,
      max_turns: maxTurns,
    })
    startEval(res.id)
  }

  const togglePersona = (value) => {
    setSelectedPersonas(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    )
  }

  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-semibold text-gray-100 mb-6">评测控制台</h2>

      {/* 配置面板 */}
      {!isRunning && !isCompleted && (
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">任务指令</label>
            <select
              value={selectedInstruction}
              onChange={e => setSelectedInstruction(e.target.value)}
              className="w-full bg-[#252a3a] border border-[#2a2f42] rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              {instructions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.task?.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">用户画像（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {PERSONAS.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePersona(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                    selectedPersonas.includes(p.value)
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-[#252a3a] border-[#2a2f42] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">被测模型</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-[#252a3a] border border-[#2a2f42] rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="DeepSeek-V3">DeepSeek-V3</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="qwen-plus">qwen-plus</option>
                <option value="Doubao-pro-32k">Doubao-pro-32k</option>
                <option value="kimi-k2.5">kimi-k2.5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">最大轮次</label>
              <input
                type="number"
                value={maxTurns}
                onChange={e => setMaxTurns(Number(e.target.value))}
                min={4}
                max={50}
                className="w-full bg-[#252a3a] border border-[#2a2f42] rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedInstruction}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={16} />
            开始评测
          </button>
        </div>
      )}

      {/* 实时评测面板 */}
      {(isRunning || isCompleted || isFailed) && (
        <div className="space-y-4">
          {/* 状态头 */}
          <div className={`bg-[#1e2235] rounded-xl border p-4 flex items-center justify-between ${
            isCompleted ? 'border-emerald-500/30' :
            isFailed ? 'border-red-500/30' :
            status?.type === 'cancelled' ? 'border-gray-500/30' :
            'border-indigo-500/30'
          }`}>
            <div className="flex items-center gap-3">
              {isRunning && <Loader2 size={18} className="text-indigo-400 animate-spin" />}
              {isCompleted && <CheckCircle size={18} className="text-emerald-400" />}
              {isFailed && <XCircle size={18} className="text-red-400" />}
              {status?.type === 'cancelled' && <StopCircle size={18} className="text-gray-400" />}
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {isCompleted ? `评测完成 · 评级 ${status.rating} · ${status.overall_percentage}%`
                    : isFailed ? '评测失败'
                    : status?.type === 'cancelled' ? '评测已终止'
                    : status?.type === 'report_generating' ? '正在生成报告...'
                    : personaCount > 1 ? `并行模拟 ${personaCount} 个画像中...`
                    : status?.type === 'eval_start' ? `正在评测 [${PERSONA_LABELS[status.persona] || status.persona}] 对话质量...`
                    : status?.persona ? `正在模拟 [${PERSONA_LABELS[status.persona] || status.persona}] 对话...`
                    : '评测初始化中...'}
                </p>
                {status?.message && status.type === 'failed' && (
                  <p className="text-xs text-red-400 mt-0.5">{status.message}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {isRunning && !cancelConfirm && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-600/30 border border-red-500/30 transition-colors"
                >
                  <StopCircle size={14} />
                  终止评测
                </button>
              )}
              {isRunning && cancelConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">确认终止？</span>
                  <button
                    onClick={() => { cancelEval(); setCancelConfirm(false) }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition-colors"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="px-3 py-1.5 bg-[#252a3a] text-gray-300 rounded-lg text-xs font-medium hover:bg-[#2a2f42] border border-[#2a2f42]"
                  >
                    取消
                  </button>
                </div>
              )}
              {isCompleted && (
                <button
                  onClick={() => navigate(`/reports/${taskId}`)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500"
                >
                  查看报告
                </button>
              )}
              {(isCompleted || isFailed || status?.type === 'cancelled') && (
                <button
                  onClick={clearEval}
                  className="px-3 py-1.5 bg-[#252a3a] text-gray-300 rounded-lg text-xs font-medium hover:bg-[#2a2f42] border border-[#2a2f42]"
                >
                  新评测
                </button>
              )}
            </div>
          </div>

          {/* 实时对话流 */}
          {(personaCount === 1 ? liveTurns.length > 0 : Object.keys(turnsByPersona).length > 0) && (
            <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-indigo-400" />
                <h3 className="text-sm font-medium text-gray-300">实时对话</h3>
              </div>

              {/* 单画像：平铺展示 */}
              {personaCount === 1 && (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {liveTurns.map((turn, i) => (
                    <TurnBubble key={i} turn={turn} />
                  ))}
                  {isRunning && <WaitingDots />}
                </div>
              )}

              {/* 多画像：每个画像一个独立面板 */}
              {personaCount > 1 && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(personaCount, 3)}, 1fr)` }}>
                  {Object.entries(turnsByPersona).map(([persona, turns]) => {
                    const pStatus = personaStatus[persona]
                    return (
                      <div key={persona} className="bg-[#252a3a] rounded-lg border border-[#2a2f42] p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            pStatus === 'done'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : pStatus === 'evaluating'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {PERSONA_LABELS[persona] || persona}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {pStatus === 'done' ? '评测完成' : pStatus === 'evaluating' ? '评测中...' : `${turns.length} 轮`}
                          </span>
                        </div>
                        <div className="space-y-1.5 overflow-auto max-h-72 flex-1">
                          {turns.map((turn, i) => (
                            <TurnBubble key={i} turn={turn} compact />
                          ))}
                          {pStatus === 'running' && <WaitingDots />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 评测完成摘要 */}
          {isCompleted && status.overall_percentage && (
            <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold border ${
                  status.overall_percentage >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                  status.overall_percentage >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                  'text-red-400 bg-red-500/10 border-red-500/30'
                }`}>
                  {status.rating}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-100">{status.overall_percentage}%</p>
                  <p className="text-sm text-gray-400">综合得分率</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TurnBubble({ turn, compact = false }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`${compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold shrink-0 ${
        turn.role === 'assistant'
          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      }`}>
        {turn.role === 'assistant' ? 'AI' : 'U'}
      </div>
      <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-300 leading-relaxed pt-0.5`}>{turn.content}</p>
    </div>
  )
}

function WaitingDots() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
      </div>
      等待回复中...
    </div>
  )
}
