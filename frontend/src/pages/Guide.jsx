import { BookOpen, Cpu, MessageSquare, FileBarChart, Play, ChevronRight, Zap, ShieldCheck, GitBranch, Brain, AlertCircle, PhoneOff } from 'lucide-react'

const DIMENSIONS = [
  { icon: <GitBranch size={16} />, name: '流程遵循', desc: '对话是否按指令中的步骤顺序推进，关键步骤不遗漏' },
  { icon: <ChevronRight size={16} />, name: '分支正确', desc: '用户触发特定条件时，系统是否走了正确的分支路径' },
  { icon: <ShieldCheck size={16} />, name: '约束遵守', desc: '回复字数、禁用词、语气风格等硬性约束是否满足' },
  { icon: <Brain size={16} />, name: '知识准确', desc: 'FAQ 回答是否与指令知识库一致，无错误或混淆' },
  { icon: <AlertCircle size={16} />, name: '异常处理', desc: '超出指令范围的问题是否用正确话术应对' },
  { icon: <PhoneOff size={16} />, name: '结束条件', desc: '是否在正确时机结束通话，不过早也不拖延' },
]

const PERSONAS = [
  { label: '配合型', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: '友好配合，按引导回答' },
  { label: '抗拒型', color: 'text-red-400 bg-red-500/10 border-red-500/30', desc: '不耐烦，拒绝配合' },
  { label: '困惑型', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', desc: '反复追问，容易搞混' },
  { label: '跑题型', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: '频繁岔开话题' },
  { label: '忙碌型', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', desc: '说在忙/在开车' },
  { label: '情绪型', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30', desc: '抱怨投诉，情绪激动' },
]

const STEPS = [
  {
    num: '01',
    icon: <Play size={20} />,
    title: '配置并启动评测',
    desc: '在控制台选择任务指令、被测模型、用户画像（可多选）和最大轮次，点击「开始评测」。',
    tip: '多画像会并行执行，速度不受画像数量影响。',
  },
  {
    num: '02',
    icon: <MessageSquare size={20} />,
    title: '实时观看对话模拟',
    desc: '页面实时展示对话气泡流。多画像时每个画像独立面板，蓝色=对话中，黄色=评测中，绿色=完成。',
    tip: '评测过程中可随时点「终止评测」取消。',
  },
  {
    num: '03',
    icon: <FileBarChart size={20} />,
    title: '查看评测报告',
    desc: '评测完成后进入报告详情：雷达图总览、各维度进度条、违规详情（含来源画像标签）、改进建议。',
    tip: '多画像报告每条违规都标注了「配合型/抗拒型...」来源。',
  },
  {
    num: '04',
    icon: <BookOpen size={20} />,
    title: '对话回放与溯源',
    desc: '在「对话回放」页逐轮查看对话原文，点击任意对话气泡，右侧面板即时跟随显示该轮的评测详情。',
    tip: '证据直接引用原文，结论可追溯。',
  },
]

export default function Guide() {
  return (
    <div className="max-w-4xl space-y-8 pb-12">

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 rounded-2xl border border-indigo-500/30 p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium">
                美团 AI Hackathon · 命题二
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2">外呼智测台</h1>
            <p className="text-base text-gray-400 mb-6">复杂指令下的多轮对话评测系统</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              在履约数字人外呼场景中，对话模型需要严格遵循复杂的任务指令完成通话。
              本系统通过<span className="text-indigo-300 font-medium">自动模拟用户 + LLM 语义裁判</span>的方式，
              对模型的指令遵循效果进行<span className="text-indigo-300 font-medium">可解释、可量化</span>的全自动评测。
            </p>
          </div>
          <div className="shrink-0 grid grid-cols-2 gap-3">
            {[
              { val: '2', label: '任务指令' },
              { val: '6', label: '用户画像' },
              { val: '6', label: '评测维度' },
              { val: '5', label: '被测模型' },
            ].map(s => (
              <div key={s.label} className="bg-[#1a1d2e]/80 rounded-xl border border-[#2a2f42] px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-bold text-indigo-300">{s.val}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 系统架构 */}
      <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6">
        <h2 className="text-base font-semibold text-gray-200 mb-5 flex items-center gap-2">
          <Cpu size={16} className="text-indigo-400" /> 系统架构
        </h2>

        {/* 第一行：指令解析链路 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-2 rounded-lg border bg-[#252a3a] border-[#2a2f42] text-gray-300 text-xs text-center whitespace-pre-line leading-relaxed">{'任务指令\nMarkdown'}</div>
          <ChevronRight size={14} className="text-gray-600 shrink-0" />
          <div className="px-3 py-2 rounded-lg border bg-indigo-600/15 border-indigo-500/30 text-indigo-300 text-xs text-center whitespace-pre-line leading-relaxed">{'指令解析器\nClaude Opus'}</div>
          <ChevronRight size={14} className="text-gray-600 shrink-0" />
          <div className="px-3 py-2 rounded-lg border bg-[#252a3a] border-[#2a2f42] text-gray-300 text-xs text-center whitespace-pre-line leading-relaxed">{'结构化规则\nJSON'}</div>
        </div>

        {/* 第二行：对话模拟（模型标注清楚） */}
        <div className="flex items-start gap-3 mb-4">
          {/* 用户模拟器 */}
          <div className="px-3 py-2 rounded-lg border bg-emerald-600/10 border-emerald-500/25 text-emerald-300 text-xs text-center whitespace-pre-line leading-relaxed shrink-0">{'用户模拟器\nGPT-4o'}</div>
          <div className="flex items-center self-center text-xs text-gray-500 shrink-0">↔ 多轮对话 ↔</div>
          {/* 被测模型（完整列出） */}
          <div className="flex-1 rounded-lg border bg-yellow-600/10 border-yellow-500/25 px-3 py-2">
            <p className="text-xs text-yellow-300 font-medium mb-1.5">被测模型（可选 5 种）</p>
            <div className="flex flex-wrap gap-1.5">
              {['DeepSeek-V3', 'gpt-4o-mini', 'qwen-plus', 'Doubao-pro-32k', 'kimi-k2.5'].map(m => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">{m}</span>
              ))}
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-600 shrink-0 self-center" />
          <div className="px-3 py-2 rounded-lg border bg-[#252a3a] border-[#2a2f42] text-gray-300 text-xs text-center whitespace-pre-line leading-relaxed shrink-0 self-center">{'对话记录'}</div>
          <ChevronRight size={14} className="text-gray-600 shrink-0 self-center" />
          <div className="px-3 py-2 rounded-lg border bg-indigo-600/15 border-indigo-500/30 text-indigo-300 text-xs text-center whitespace-pre-line leading-relaxed shrink-0 self-center">{'评测引擎\n硬规则+Claude Opus'}</div>
          <ChevronRight size={14} className="text-gray-600 shrink-0 self-center" />
          <div className="px-3 py-2 rounded-lg border bg-purple-600/15 border-purple-500/30 text-purple-300 text-xs text-center whitespace-pre-line leading-relaxed shrink-0 self-center">{'评测报告\n量化+可解释'}</div>
        </div>

        {/* 评测引擎说明 */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { title: '规则引擎', desc: '字数超限、禁用词等硬规则，精确定位到轮次，输出客观证据', color: 'border-yellow-500/20' },
            { title: 'LLM 语义裁判', desc: 'Claude Opus 对六个维度进行语义判定，引用原文给出结论', color: 'border-indigo-500/20' },
            { title: '混合评测', desc: '两层结果聚合，每条违规标注维度、严重程度、来源画像', color: 'border-purple-500/20' },
          ].map(c => (
            <div key={c.title} className={`bg-[#252a3a] rounded-lg border ${c.color} p-3`}>
              <p className="text-xs font-medium text-gray-300 mb-1">{c.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 操作说明 */}
      <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6">
        <h2 className="text-base font-semibold text-gray-200 mb-5 flex items-center gap-2">
          <Zap size={16} className="text-indigo-400" /> 操作说明
        </h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-[#2a2f42] mt-2" />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-indigo-400/60">{step.num}</span>
                  <h3 className="text-sm font-medium text-gray-200">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-1.5">{step.desc}</p>
                <p className="text-xs text-indigo-400/70 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400/50 shrink-0" />
                  {step.tip}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 评测维度 + 用户画像 并排 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6">
          <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <FileBarChart size={16} className="text-indigo-400" /> 评测维度
          </h2>
          <div className="space-y-3">
            {DIMENSIONS.map(d => (
              <div key={d.name} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  {d.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-300">{d.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6">
          <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-400" /> 用户画像
          </h2>
          <div className="space-y-2.5">
            {PERSONAS.map(p => (
              <div key={p.label} className="flex items-center gap-3">
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${p.color}`}>
                  {p.label}
                </span>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#2a2f42]">
            <p className="text-xs text-gray-500 leading-relaxed">
              多画像可同时选中并行评测，各画像对话互相独立，总耗时约等于单画像时间。
            </p>
          </div>
        </div>
      </div>

      {/* 评测结果示例 */}
      <div className="bg-[#1e2235] rounded-xl border border-[#2a2f42] p-6">
        <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" /> 实测数据参考
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-[#2a2f42]">
                <th className="text-left pb-2 font-medium">指令</th>
                <th className="text-left pb-2 font-medium">被测模型</th>
                <th className="text-left pb-2 font-medium">画像</th>
                <th className="text-right pb-2 font-medium">综合得分</th>
                <th className="text-right pb-2 font-medium">评级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f42]">
              {[
                { inst: '指令1·站长通知骑手', model: 'qwen-plus', personas: '配合型', pct: 100.0, rating: 'A', ratingColor: 'text-emerald-400' },
                { inst: '指令1·站长通知骑手', model: 'DeepSeek-V3', personas: '配合型·抗拒型·困惑型', pct: 92.2, rating: 'A', ratingColor: 'text-emerald-400' },
                { inst: '指令1·站长通知骑手', model: 'gpt-4o-mini', personas: '配合型·抗拒型', pct: 88.3, rating: 'B', ratingColor: 'text-blue-400' },
                { inst: '指令2·课程平台客服', model: 'DeepSeek-V3', personas: '配合型·抗拒型·忙碌型', pct: 80.0, rating: 'B', ratingColor: 'text-blue-400' },
                { inst: '指令2·课程平台客服', model: 'gpt-4o-mini', personas: '配合型·抗拒型', pct: 73.3, rating: 'C', ratingColor: 'text-yellow-400' },
              ].map((row, i) => (
                <tr key={i} className="text-gray-400">
                  <td className="py-2 text-gray-300">{row.inst}</td>
                  <td className="py-2">{row.model}</td>
                  <td className="py-2 text-gray-500">{row.personas}</td>
                  <td className="py-2 text-right text-gray-300">{row.pct}%</td>
                  <td className={`py-2 text-right font-bold ${row.ratingColor}`}>{row.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-3">※ 指令2（7步复杂分支流程）比指令1（4步线性流程）更难遵循，模型间差距也更显著</p>
      </div>

    </div>
  )
}
