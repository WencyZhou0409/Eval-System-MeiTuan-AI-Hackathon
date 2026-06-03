"""报告生成器：汇总评测结果，输出可解释报告"""

from __future__ import annotations

from datetime import datetime
from models.schemas import EvalDimension


DIMENSION_NAMES = {
    "flow_adherence": "流程遵循",
    "branch_correctness": "分支正确性",
    "constraint_compliance": "约束遵守",
    "knowledge_accuracy": "知识准确性",
    "exception_handling": "异常处理",
    "termination": "结束条件",
}


def generate_report(results: list[dict], instruction: dict) -> dict:
    """从多个评测结果生成汇总报告"""
    if not results:
        return {"error": "No results to report"}

    # 汇总各维度平均分
    dim_totals: dict[str, dict] = {}
    all_violations = []
    all_dialogues = []

    for result in results:
        for dim in result.get("dimensions", []):
            dim_name = dim["dimension"]
            if dim_name not in dim_totals:
                dim_totals[dim_name] = {"score": 0, "max_score": 0, "count": 0}
            dim_totals[dim_name]["score"] += dim["score"]
            dim_totals[dim_name]["max_score"] += dim["max_score"]
            dim_totals[dim_name]["count"] += 1

        # 只保留真正扣分的违规项（score < max_score），附带 persona 标签
        persona = result.get("persona", "")
        real_violations = [
            {**v, "persona": persona}
            for v in result.get("violations", [])
            if v.get("score", 0) < v.get("max_score", 1)
        ]
        all_violations.extend(real_violations)
        all_dialogues.append({
            "persona": result.get("persona"),
            "dialogue": result.get("dialogue", []),
            "violations": real_violations,
            "total_score": result.get("total_score", 0),
            "max_total_score": result.get("max_total_score", 0),
        })

    # 计算各维度百分比得分
    dimension_summary = []
    for dim_name, totals in dim_totals.items():
        pct = (totals["score"] / totals["max_score"] * 100) if totals["max_score"] > 0 else 0
        dimension_summary.append({
            "dimension": dim_name,
            "dimension_name": DIMENSION_NAMES.get(dim_name, dim_name),
            "score": totals["score"],
            "max_score": totals["max_score"],
            "percentage": round(pct, 1),
        })

    # 总分
    total_score = sum(d["score"] for d in dimension_summary)
    max_total_score = sum(d["max_score"] for d in dimension_summary)
    overall_pct = (total_score / max_total_score * 100) if max_total_score > 0 else 0

    # 违规统计
    violation_stats = {}
    for v in all_violations:
        dim = v.get("dimension", "unknown")
        severity = v.get("severity", "medium")
        key = f"{dim}_{severity}"
        if key not in violation_stats:
            violation_stats[key] = {"dimension": dim, "severity": severity, "count": 0}
        violation_stats[key]["count"] += 1

    # 按严重程度排序的问题列表
    sorted_violations = sorted(
        all_violations,
        key=lambda v: {"high": 0, "medium": 1, "low": 2}.get(v.get("severity", "medium"), 1)
    )

    report = {
        "instruction_id": instruction.get("id", ""),
        "instruction_role": instruction.get("role", ""),
        "instruction_task": instruction.get("task", ""),
        "model_under_test": results[0].get("model_under_test", "") if results else "",
        "total_score": total_score,
        "max_total_score": max_total_score,
        "overall_percentage": round(overall_pct, 1),
        "rating": _get_rating(overall_pct),
        "dimensions": dimension_summary,
        "violation_stats": list(violation_stats.values()),
        "top_violations": sorted_violations[:20],
        "sessions": all_dialogues,
        "personas_tested": len(results),
        "suggestions": _generate_suggestions(dimension_summary, all_violations),
        "created_at": datetime.now().isoformat(),
    }
    return report


def _get_rating(pct: float) -> str:
    if pct >= 90:
        return "A"
    elif pct >= 80:
        return "B"
    elif pct >= 70:
        return "C"
    elif pct >= 60:
        return "D"
    else:
        return "F"


def _generate_suggestions(dimensions: list[dict], violations: list[dict]) -> list[str]:
    """根据实际违规内容生成具体改进建议"""
    suggestions = []

    # 按维度 + severity 归类高频违规
    dim_violations: dict[str, list[str]] = {}
    for v in violations:
        dim = v.get("dimension", "")
        evidence = v.get("evidence", "")
        if evidence:
            if dim not in dim_violations:
                dim_violations[dim] = []
            dim_violations[dim].append(evidence)

    # 针对每个扣分较多的维度，生成具体建议
    for dim in sorted(dim_violations, key=lambda d: len(dim_violations[d]), reverse=True)[:4]:
        dim_name = DIMENSION_NAMES.get(dim, dim)
        count = len(dim_violations[dim])
        evidences = dim_violations[dim]

        if dim == "constraint_compliance":
            # 分析是字数还是重复表达问题
            word_count_hits = [e for e in evidences if "超过限制" in e]
            repeat_hits = [e for e in evidences if "重复" in e]
            forbidden_hits = [e for e in evidences if "禁用词" in e]
            if word_count_hits:
                suggestions.append(f"字数控制不足（{len(word_count_hits)}次超限）：将长段信息拆分成多轮传达，每轮聚焦一个要点")
            if repeat_hits:
                suggestions.append(f"重复表达问题（{len(repeat_hits)}次）：相同信息换不同角度说，如\"注意安全\"→\"路上小心\"→\"保重\"")
            if forbidden_hits:
                suggestions.append(f"出现禁用词（{len(forbidden_hits)}次）：检查指令中的禁用词列表，使用替代表达")
            if not (word_count_hits or repeat_hits or forbidden_hits):
                suggestions.append(f"{dim_name}共{count}次违规：注意语气与风格约束，保持口语化自然表达")
        elif dim == "flow_adherence":
            suggestions.append(f"流程遵循{count}次不达标：确保每个步骤在合适时机触发，不因用户跑题而跳过关键步骤")
        elif dim == "knowledge_accuracy":
            suggestions.append(f"知识准确性{count}次偏差：严格区分不同类型合同/套餐的规则差异，避免混用")
        elif dim == "branch_correctness":
            suggestions.append(f"分支判断{count}次有误：更准确识别用户意图再决定走哪条分支，不要过早进入结束流程")
        elif dim == "termination":
            suggestions.append(f"结束时机{count}次不当：等待用户明确表达退出意愿，而非主动提前结束")
        elif dim == "exception_handling":
            suggestions.append(f"异常处理{count}次待改善：遇到超范围问题统一使用\"确认后回电\"话术，不要自行解答")

    if not suggestions:
        suggestions.append("整体表现良好，建议在多种用户画像下持续测试以发现边界情况")

    return suggestions
