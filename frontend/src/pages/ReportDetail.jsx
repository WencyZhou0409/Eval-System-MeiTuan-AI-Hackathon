import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import { ChevronRight } from 'lucide-react'
import { fetchReports, fetchReport } from '../api/client'

const DIMENSION_LABELS = {
  flow_adherence: '流程遵循',
  branch_correctness: '分支正确',
  constraint_compliance: '约束遵守',
  knowledge_accuracy: '知识准确',
  exception_handling: '异常处理',
  termination: '结束条件',
}

const PERSONA_LABELS = {
  cooperative: '配合型',
  resistant: '抗拒型',
  confused: '困惑型',
  off_topic: '跑题型',
  busy: '忙碌型',
  emotional: '情绪型',
}

const RATING_STYLES = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  B: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  C: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  D: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  F: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [report, setReport] = useState(null)
  const [selectedId, setSelectedId] = useState(id || null)

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

  // 列表视图
  if (!selectedId) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-6">评测报告</h2>
        {reports.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p>暂无评测报告</p>
            <p className="text-sm mt-1 text-gray-600">在控制台启动评测后会在这里显示</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reports.map(r => {
              const pct = r.max_total_score > 0 ? Math.round(r.total_score / r.max_total_score * 100) : 0
              return (
                <div
                  key={r.id}
                  onClick={() => { setSelectedId(r.id); navigate(`/reports/${r.id}`) }}
                  className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold border ${
                      pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                      pct >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                      'text-red-400 bg-red-500/10 border-red-500/30'
                    }`}>
                      {pct}%
                    </div>
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
                  </div>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 详情视图
  if (!report) {
    return <div className="text-center text-gray-500 mt-20">加载中...</div>
  }

  const radarData = (report.dimensions || []).map(d => ({
    dimension: DIMENSION_LABELS[d.dimension] || d.dimension_name || d.dimension,
    score: d.percentage || (d.max_score > 0 ? Math.round(d.score / d.max_score * 100) : 0),
    fullMark: 100,
  }))

  const personasList = (report.sessions || []).map(s => PERSONA_LABELS[s.persona] || s.persona)

  return (
    <div className="max-w-5xl">
      <button
        onClick={() => { setSelectedId(null); navigate('/reports') }}
        className="text-sm text-gray-400 hover:text-gray-200 mb-4 flex items-center gap-1"
      >
        ← 返回列表
      </button>

      {/* 标题区 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-100">
          {report.instruction_task || '评测报告'}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded bg-[#252a3a] text-gray-400 border border-[#2a2f42]">
            {report.model_under_test}
          </span>
          {personasList.map((p, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-300 border border-indigo-500/20">
              {p}
            </span>
          ))}
          <span className="text-xs text-gray-600">
            {report.created_at ? new Date(report.created_at).toLocaleString('zh-CN') : ''}
          </span>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg text-xl font-bold border ${RATING_STYLES[report.rating] || ''}`}>
            {report.rating}
          </div>
          <p className="text-xs text-gray-500 mt-2">评级</p>
        </div>
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 text-center">
          <div className="text-2xl font-bold text-gray-100">{report.overall_percentage}%</div>
          <p className="text-xs text-gray-500 mt-1">总得分率</p>
        </div>
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 text-center">
          <div className="text-2xl font-bold text-gray-100">{report.personas_tested}</div>
          <p className="text-xs text-gray-500 mt-1">测试画像数</p>
        </div>
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 text-center">
          <div className="text-2xl font-bold text-gray-100">{report.top_violations?.length || 0}</div>
          <p className="text-xs text-gray-500 mt-1">违规总数</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 雷达图 */}
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">维度评分</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a2f42" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#8b92a8' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#555' }} />
              <Radar name="得分" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 维度详情 */}
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">各维度得分</h3>
          <div className="space-y-4">
            {(report.dimensions || []).map(d => {
              const pct = d.percentage || (d.max_score > 0 ? Math.round(d.score / d.max_score * 100) : 0)
              return (
                <div key={d.dimension}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-400">{DIMENSION_LABELS[d.dimension] || d.dimension_name}</span>
                    <span className={`font-medium ${
                      pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#252a3a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 违规列表 */}
      <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">违规详情</h3>
        <div className="space-y-2 max-h-96 overflow-auto">
          {(report.top_violations || []).map((v, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#252a3a] border border-[#2a2f42]">
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                v.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                v.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {v.severity === 'high' ? '严重' : v.severity === 'medium' ? '中等' : '轻微'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  {v.persona && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 font-medium">
                      {PERSONA_LABELS[v.persona] || v.persona}
                    </span>
                  )}
                  <span>轮次 {v.turn}</span>
                  <span>·</span>
                  <span>{DIMENSION_LABELS[v.dimension] || v.dimension}</span>
                </div>
                <p className="text-sm text-gray-300">{v.evidence}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 改进建议 */}
      {report.suggestions?.length > 0 && (
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">改进建议</h3>
          <ul className="space-y-2">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-indigo-400 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => navigate(`/conversations/${selectedId}`)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
      >
        查看对话回放 →
      </button>
    </div>
  )
}
