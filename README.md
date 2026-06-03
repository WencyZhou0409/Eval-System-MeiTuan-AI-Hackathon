# 外呼智测台

> 复杂指令下的多轮对话评测系统 · 美团 AI Hackathon 命题二

---

## 产品简介

在履约数字人外呼场景中，对话模型需要严格遵循复杂的任务指令完成通话。传统人工评估成本高、难以量化，且无法覆盖多种用户行为模式。

**外呼智测台**通过「自动模拟用户 + LLM 语义裁判」的方式，对模型的指令遵循效果进行**可解释、可量化**的全自动评测：

- 输入一段 Markdown 格式的任务指令
- 系统自动解析规则，生成 6 种用户画像，并行发起多轮对话模拟
- 评测引擎对对话记录进行硬规则 + LLM 语义双层评测
- 输出带证据链的评测报告（雷达图、维度得分、违规详情、改进建议）

---

## 功能特性

| 特性 | 说明 |
|------|------|
| 多画像并行评测 | 6 种用户画像可同时选中，并行执行，总耗时约等于单画像时间 |
| 实时对话可视化 | SSE 推流，逐轮渲染对话气泡，状态实时更新 |
| 双层混合评测 | 硬规则（字数/禁用词）+ Claude Opus 语义裁判 |
| 可解释评测报告 | 每条违规引用原文、标注维度、严重程度、来源画像 |
| 对话回放溯源 | 点击任意对话气泡，右侧面板即时显示该轮评测详情 |
| 多模型横向对比 | 支持 5 种主流模型，相同指令/画像下结果可直接比较 |
| 跨页面状态保持 | 评测进行中可自由切换页面，进度不丢失 |

---

## 系统架构

```
任务指令 (Markdown)
        │
        ▼
┌─────────────────┐
│   指令解析器     │  Claude Opus → 结构化规则 JSON
│  (Claude Opus)  │  提取：流程步骤、约束条件、知识点
└────────┬────────┘
         │ 结构化规则 JSON
         ▼
┌─────────────────────────────────────────┐
│              对话模拟引擎                │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │  用户模拟器   │ ↔↔↔ │   被测模型   │  │
│  │  (GPT-4o)    │     │ (可选5种)    │  │
│  │  6种用户画像  │     │ 最大N轮      │  │
│  └──────────────┘     └──────────────┘  │
│         多个画像并行执行（asyncio.gather）  │
└────────────────────┬────────────────────┘
                     │ 对话记录
                     ▼
┌─────────────────────────────────────────┐
│               评测引擎                   │
│                                         │
│  ┌─────────────┐   ┌──────────────────┐ │
│  │  规则引擎   │   │  LLM 语义裁判    │ │
│  │ 字数超限检查 │   │  (Claude Opus)   │ │
│  │ 禁用词检查  │   │  6个评测维度     │ │
│  └─────────────┘   └──────────────────┘ │
│         两层结果聚合，注入 persona 字段    │
└────────────────────┬────────────────────┘
                     │
                     ▼
              评测报告（量化 + 可解释）
        雷达图 / 维度得分 / 违规详情 / 改进建议
```

### 模型分工

| 角色 | 模型 | Fallback | 用途 |
|------|------|----------|------|
| 评测裁判 (judge) | claude-opus-4-6 | claude-sonnet-4-6 | 指令解析、语义评测 |
| 用户模拟器 (simulator) | gpt-4o | — | 模拟各种用户画像 |
| 被测模型 (SUT) | 前端可选 5 种 | — | 被评测的对话模型 |

### 被测模型列表

`DeepSeek-V3` · `gpt-4o-mini` · `qwen-plus` · `Doubao-pro-32k` · `kimi-k2.5`

---

## 评测维度

| 维度 | 含义 |
|------|------|
| 流程遵循 | 对话是否按指令中的步骤顺序推进，关键步骤不遗漏 |
| 分支正确 | 用户触发特定条件时，系统是否走了正确的分支路径 |
| 约束遵守 | 回复字数、禁用词、语气风格等硬性约束是否满足 |
| 知识准确 | FAQ 回答是否与指令知识库一致，无错误或混淆 |
| 异常处理 | 超出指令范围的问题是否用正确话术应对 |
| 结束条件 | 是否在正确时机结束通话，不过早也不拖延 |

每个维度固定满分 10 分，总分 60 分。评级：A ≥ 90%、B ≥ 80%、C ≥ 70%、D ≥ 60%、F < 60%。

---

## 用户画像

| 画像 | 行为特征 |
|------|---------|
| 配合型 (cooperative) | 态度友好，按引导回答 |
| 抗拒型 (resistant) | 不耐烦，拒绝配合 |
| 困惑型 (confused) | 反复追问，容易搞混 |
| 跑题型 (off_topic) | 频繁岔开话题 |
| 忙碌型 (busy) | 说在忙 / 在开车 |
| 情绪型 (emotional) | 抱怨投诉，情绪激动 |

多画像可同时选中并行评测，各画像对话互相独立。

---

## 操作流程

### 第一步：配置并启动评测

在「控制台」页面：
1. 从下拉框选择**任务指令**（系统内置 2 条示例指令，也可上传新指令）
2. 选择**被测模型**
3. 勾选一个或多个**用户画像**（多选时并行执行）
4. 设置**最大轮次**（简单指令 10-12 轮，复杂分支指令 15-18 轮）
5. 点击「**开始评测**」

### 第二步：实时观看对话模拟

- 页面实时展示对话气泡流，蓝色 = 对话中，黄色 = 评测中，绿色 = 完成
- 多画像时每个画像独立面板（最多 3 列网格）
- 评测进行中可随时点「终止评测」取消

### 第三步：查看评测报告

评测完成后，在「评测报告」页：
- **概览卡片**：评级、总得分率、测试画像数、违规总数
- **雷达图**：六维度得分全貌
- **维度进度条**：各维度百分比，绿/黄/红三色预警
- **违规详情**：每条违规标注严重程度、来源画像（多画像场景）、所属维度、证据原文
- **改进建议**：按违规类型分类的可操作建议

### 第四步：对话回放与溯源

在「对话回放」页：
- 左侧：完整对话气泡流
- 右侧：点击任意气泡，即时显示该轮的评测详情（违规证据引用原文）
- 证据直接引用对话原文，结论完全可追溯

---

## 快速启动

### 环境要求

- Python 3.11+
- Node.js 18+

### 配置环境变量

复制 `.env.example` 为 `backend/.env` 并填入 API 配置：

```bash
cp .env.example backend/.env
```

```ini
# 评测裁判（Claude Opus）
ANTHROPIC_API_KEY=your_key
ANTHROPIC_BASE_URL=https://api.anthropic.com

# 用户模拟器（GPT-4o）
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1

# 被测模型（通过统一中转访问）
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://your-relay-endpoint/v1

# 速率限制（RPM，默认 18，留 2 个缓冲）
RPM_LIMIT=18
```

### 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
# 运行在 http://localhost:8000
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:5173
```

打开浏览器访问 `http://localhost:5173`，点击侧边栏「产品说明」查看完整介绍。

---

## 项目结构

```
eval-system/
├── backend/
│   ├── main.py                     # FastAPI 入口
│   ├── config.py                   # 环境变量配置
│   ├── requirements.txt
│   ├── core/
│   │   ├── instruction_parser.py   # 指令解析：Markdown → 结构化 JSON
│   │   ├── user_simulator.py       # 用户模拟器（6 种画像）
│   │   ├── dialogue_engine.py      # 对话引擎（多轮交互管理）
│   │   ├── evaluator.py            # 评测引擎（硬规则 + LLM 语义）
│   │   └── report_generator.py     # 报告生成（量化 + 可解释）
│   ├── rules/
│   │   └── rule_checks.py          # 硬规则检查（字数、禁用词）
│   ├── models/
│   │   ├── schemas.py              # Pydantic 数据模型
│   │   └── llm_client.py           # 统一 LLM 调用（含 fallback + 限速）
│   ├── api/
│   │   ├── evaluation.py           # 评测任务 API（含 SSE 流）
│   │   ├── instructions.py         # 指令管理 API
│   │   └── reports.py              # 报告查询 API
│   └── data/
│       └── instructions/           # 指令文件（raw md + parsed json）
│           ├── raw_1.md            # 指令1：美团站长致电骑手
│           └── raw_2.md            # 指令2：课程平台客服通知
└── frontend/
    ├── vite.config.js              # 含 proxy 到后端 :8000
    └── src/
        ├── App.jsx                 # 路由 + 侧边栏导航
        ├── context/EvalContext.jsx # 全局评测状态（SSE + localStorage）
        └── pages/
            ├── Dashboard.jsx       # 控制台
            ├── ReportDetail.jsx    # 评测报告（列表 + 详情）
            ├── ConversationReplay.jsx  # 对话回放
            ├── History.jsx         # 历史记录
            └── Guide.jsx           # 产品说明
```

---

## API 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/instructions` | 指令列表 |
| GET | `/api/instructions/{id}` | 指令详情 |
| POST | `/api/instructions/upload` | 上传指令文件 |
| POST | `/api/instructions/parse` | 解析指令文本 |
| POST | `/api/evaluation/start` | 启动评测 |
| GET | `/api/evaluation/{id}/stream` | **SSE 实时事件流** |
| POST | `/api/evaluation/{id}/cancel` | 终止评测 |
| GET | `/api/evaluation/{id}/result` | 评测结果 |
| GET | `/api/reports` | 报告列表 |
| GET | `/api/reports/{id}` | 报告详情 |

---

## 实测数据参考

### 指令1：站长通知骑手（4 步线性流程）

| 被测模型 | 画像 | 综合得分 | 评级 |
|---------|------|---------|------|
| qwen-plus | 配合型 | **100.0%** | **A** |
| DeepSeek-V3 | 配合型 + 抗拒型 + 困惑型 | 92.2% | A |
| gpt-4o-mini | 配合型 + 抗拒型 | 88.3% | B |

### 指令2：课程平台客服（7 步复杂分支流程）

| 被测模型 | 画像 | 综合得分 | 评级 |
|---------|------|---------|------|
| DeepSeek-V3 | 配合型 + 抗拒型 + 忙碌型 | 80.0% | B |
| gpt-4o-mini | 配合型 + 抗拒型 | 73.3% | C |

**关键发现：**
- qwen-plus 在线性 4 步流程场景六维度全满分
- 忙碌型画像在指令2始终 100%（「在开车→稍后再打」分支稳定触发）
- gpt-4o-mini 在指令2约束遵守维度得分 0%，7 步复杂流程下完全失去字数控制
- 指令2模型间差距（73% vs 80%）显著大于指令1（88% vs 100%），说明系统对复杂指令有更强区分度

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.11 / FastAPI / uvicorn |
| 前端 | React 18 / Vite / React Router / Tailwind CSS / Recharts |
| 模型调用 | openai SDK（AsyncOpenAI，OpenAI 兼容接口） |
| JSON 容错 | json-repair |
| 实时推送 | SSE（Server-Sent Events） |
| 状态管理 | React Context + localStorage |
| 存储 | 本地 JSON 文件 |
