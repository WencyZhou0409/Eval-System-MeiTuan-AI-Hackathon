"""指令解析器：将 Markdown 格式的任务指令解析为结构化 JSON"""

from __future__ import annotations

import json
import uuid
from typing import Optional

from json_repair import repair_json

from models.llm_client import llm_client
from models.schemas import ParsedInstruction

PARSE_SYSTEM_PROMPT = """你是一个指令解析专家。你的任务是将外呼任务指令（Markdown格式）解析为结构化JSON。

输出JSON格式如下（严格遵循）：
{
  "role": "角色描述",
  "task": "任务概述",
  "opening_line": "开场白原文",
  "call_flow": [
    {
      "step": 1,
      "description": "该步骤做什么",
      "branches": [
        {"condition": "触发条件", "next_step": 2, "action": "执行动作"}
      ],
      "reference_script": "参考话术原文（如有）"
    }
  ],
  "knowledge_points": ["知识点1", "知识点2"],
  "constraints": [
    {
      "id": "C1",
      "type": "word_count|forbidden_words|forbidden_topic|termination|style|response_format",
      "rule": "规则描述",
      "params": {"max_chars": 30, "words": ["好的", "哈哈"]}
    }
  ]
}

注意：
1. constraints.type 必须是以下之一：word_count, forbidden_words, forbidden_topic, termination, style, response_format
2. 对于字数限制，params中提取 max_chars（字符数，取上限值，如"15-20个字"则取20）
3. 对于禁用词，params中提取 words 列表
4. 对于终止条件，params中描述触发条件
5. call_flow 要尽量完整，包含所有分支（包括二级子步骤）
6. knowledge_points：若指令有独立的"Knowledge Points"章节，保留原文；若没有，则从流程步骤中提取产品规格、功能说明、价格说明等知识性内容填入
7. 仅输出JSON，不要任何其他文字
"""


async def parse_instruction(text: str, instruction_id: Optional[str] = None) -> ParsedInstruction:
    """将原始指令文本解析为结构化对象"""
    if not instruction_id:
        instruction_id = str(uuid.uuid4())[:8]

    messages = [
        {"role": "user", "content": f"请解析以下外呼任务指令：\n\n{text}"}
    ]

    response = await llm_client.chat(
        messages=messages,
        role="judge",
        system=PARSE_SYSTEM_PROMPT,
        temperature=0.1,
        max_tokens=4096,
    )

    response = response.strip()
    # 去掉 markdown 代码块标记
    if response.startswith("```"):
        lines = response.split("\n")
        # 去掉第一行 ```json 和最后一行 ```
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response = "\n".join(lines)

    # 尝试提取 JSON（可能前后有多余文字）
    start = response.find("{")
    end = response.rfind("}") + 1
    if start != -1 and end > start:
        response = response[start:end]

    repaired = repair_json(response)
    parsed_data = json.loads(repaired)
    parsed_data["id"] = instruction_id
    parsed_data["raw_text"] = text

    return ParsedInstruction(**parsed_data)
