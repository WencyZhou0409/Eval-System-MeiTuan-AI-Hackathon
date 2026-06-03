import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileBarChart } from 'lucide-react'
import { fetchReports } from '../api/client'

const PERSONA_LABELS = {
  cooperative: '配合型',
  resistant: '抗拒型',
  confused: '困惑型',
  off_topic: '跑题型',
  busy: '忙碌型',
  emotional: '情绪型',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetchReports().then(data => setReports(data.reports || []))
  }, [])

  if (reports.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-20">
        <FileBarChart size={48} className="mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">暂无评测记录</p>
        <p className="text-sm mt-1 text-gray-600">在控制台启动一次评测后，记录会出现在这里</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-semibold text-gray-100 mb-6">历史记录</h2>

      <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#252a3a] border-b border-[#2a2f42]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-400">任务</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">被测模型</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">画像</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">得分</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">评级</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">时间</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2f42]">
            {reports.map(r => {
              const pct = r.overall_percentage || (r.max_total_score > 0
                ? Math.round(r.total_score / r.max_total_score * 100) : 0)
              return (
                <tr key={r.id} className="hover:bg-[#252a3a] transition-colors">
                  <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">
                    {r.instruction_task || r.instruction_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#252a3a] text-gray-400 border border-[#2a2f42]">
                      {r.model_under_test}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(r.personas || []).map(p => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-300 border border-indigo-500/20">
                          {PERSONA_LABELS[p] || p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      r.rating === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                      r.rating === 'B' ? 'bg-blue-500/20 text-blue-400' :
                      r.rating === 'C' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {r.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/reports/${r.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        报告
                      </button>
                      <button
                        onClick={() => navigate(`/conversations/${r.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        对话
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
