"""评测引擎：硬规则 + LLM语义评测混合"""

from __future__ import annotations

import json
import re
from json_repair import repair_json
from models.llm_client import llm_client
from models.schemas import (
    Constraint, RuleViolation, EvalDimension, DimensionScore,
)
from rules.rule_checks import check_all_hard_rules

EVAL_SYSTEM_PROMPT = """你是一个专业的对话质量评测专家。你需要根据任务指令对对话记录进行评测。

评测维度：
1. flow_adherence（流程遵循）：对话是否按指令中的步骤推进
2. branch_correctness（分支正确性）：面对不同用户反应，是否走了正确的分支
3. knowledge_accuracy（知识准确性）：回答是否与知识库一致
4. exception_handling（异常处理）：对超范围问题的应对是否正确
5. termination（结束条件）：是否在正确时机结束对话
6. constraint_compliance（约束遵守）：语气、风格等软性约束（硬性约束如字数已由规则引擎检查）

对每个维度，输出如下JSON数组：
[
  {
    "turn": 3,
    "dimension": "flow_adherence",
    "score": 0或1,
    "max_score": 1,
    "evidence": "具体说明为什么得分/扣分，引用对话原文",
    "rule_ref": "对应的指令章节如call_flow.step_2",
    "severity": "low/medium/high"
  }
]

要求：
- 只输出JSON数组，不要其他文字
- evidence必须具体，引用原文
- 对每个有问题的轮次都要给出评判
- 没有问题的维度也至少给一条总结性评价（score=1）
- score字段必须与你的结论严格一致：如果你认为该条符合规范，score必须为1，不要score写0但evidence里说"改为score=1"或"不违反约束"
- 如果考虑之后认为不构成违规，直接输出score=1，不要先写score=0再在evidence里纠正
"""


async def evaluate_session(session: dict, instruction: dict) -> dict:
    """对一次对话session进行完整评测"""
    turns = session.get("turns", [])
    constraints = [Constraint(**c) for c in instruction.get("constraints", [])]

    # 第一步：硬规则检查（跳过第1轮开场白的字数限制，因为Opening Line由指令模板决定）
    hard_violations = []
    for turn in turns:
        if turn["role"] == "assistant":
            violations = check_all_hard_rules(
                turn["turn"], turn["content"], constraints,
                skip_word_count=(turn["turn"] == 1),
            )
            hard_violations.extend(violations)

    # 第二步：LLM语义评测
    dialogue_text = "\n".join(
        [f"[轮次{t['turn']}][{t['role']}] {t['content']}" for t in turns]
    )

    eval_prompt = f"""请评测以下对话：

## 任务指令
{instruction.get('raw_text', '')}

## 对话记录
{dialogue_text}

## 已知硬规则违规（已由规则引擎检查，无需重复）
{json.dumps([v.model_dump() for v in hard_violations], ensure_ascii=False, indent=2) if hard_violations else "无"}

注意：第1轮是系统预设的开场白（Opening Line），其字数限制已豁免，不要对第1轮的字数进行扣分。

请对剩余维度（flow_adherence, branch_correctness, knowledge_accuracy, exception_handling, termination, 以及constraint_compliance中的软性约束如语气风格）进行评测。"""

    messages = [{"role": "user", "content": eval_prompt}]

    response = await llm_client.chat(
        messages=messages,
        role="judge",
        system=EVAL_SYSTEM_PROMPT,
        temperature=0.1,
        max_tokens=4096,
    )

    # 解析LLM评测结果
    response = response.strip()
    if response.startswith("```"):
        lines = response.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response = "\n".join(lines)

    # 提取 JSON 数组
    start = response.find("[")
    end = response.rfind("]") + 1
    if start != -1 and end > start:
        response = response[start:end]

    try:
        repaired = repair_json(response)
        llm_violations_data = json.loads(repaired)
        llm_violations = [RuleViolation(**v) for v in llm_violations_data]
        llm_violations = _correct_self_contradictions(llm_violations)
    except (json.JSONDecodeError, Exception):
        llm_violations = []

    # 合并所有违规
    all_violations = hard_violations + llm_violations

    # 按维度汇总
    dimensions = _aggregate_dimensions(all_violations, turns)

    # 计算总分
    total_score = sum(d.score for d in dimensions)
    max_total_score = sum(d.max_score for d in dimensions)

    result = {
        "id": session["id"],
        "session_id": session["id"],
        "instruction_id": session["instruction_id"],
        "persona": session["persona"],
        "model_under_test": session["model_under_test"],
        "total_score": total_score,
        "max_total_score": max_total_score,
        "dimensions": [d.model_dump() for d in dimensions],
        "violations": [v.model_dump() for v in all_violations],
        "dialogue": turns,
        "summary": "",
        "suggestions": [],
    }
    return result


def _correct_self_contradictions(violations: list[RuleViolation]) -> list[RuleViolation]:
    """修正 judge 输出中 score 字段与 evidence 描述自相矛盾的条目。
    例如 score=0 但 evidence 里写了「改为score=1」或「不违反约束」。
    """
    # 这些模式表明 judge 推理后认为应该通过，但 score 字段写错了
    pass_patterns = [
        r'改为\s*score\s*[=＝]\s*1',
        r'score\s*[=＝]\s*1',
        r'实际上?不违反',
        r'严格来说不违反',
        r'不构成违规',
        r'不属于违规',
        r'不在.{0,10}禁止列表',
    ]
    corrected = []
    for v in violations:
        if v.score < v.max_score and v.evidence:
            if any(re.search(p, v.evidence) for p in pass_patterns):
                v = v.model_copy(update={"score": v.max_score})
        corrected.append(v)
    return corrected


def _aggregate_dimensions(
    violations: list[RuleViolation], turns: list[dict]
) -> list[DimensionScore]:
    """按维度汇总得分，每个维度固定满分10分，不随对话轮次变化"""
    FIXED_MAX_SCORE = 10

    dimension_scores = []
    for dim in EvalDimension:
        dim_violations = [v for v in violations if v.dimension == dim]
        # 只统计真正扣分的违规（score < max_score）
        real_deductions = sum(v.max_score - v.score for v in dim_violations if v.score < v.max_score)
        # 每次违规扣2分，最多扣光
        deduction = min(real_deductions * 2, FIXED_MAX_SCORE)
        score = FIXED_MAX_SCORE - deduction
        dimension_scores.append(DimensionScore(
            dimension=dim,
            score=score,
            max_score=FIXED_MAX_SCORE,
            violations=dim_violations,
        ))
    return dimension_scores
