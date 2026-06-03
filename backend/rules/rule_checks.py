"""硬规则检查：基于规则的确定性检查"""

from __future__ import annotations

import re
from models.schemas import Constraint, ConstraintType, RuleViolation, EvalDimension


def check_word_count(turn_num: int, content: str, constraint: Constraint) -> RuleViolation | None:
    """检查回复字数是否超限"""
    max_chars = constraint.params.get("max_chars", 30)
    actual_len = len(content)
    if actual_len > max_chars:
        return RuleViolation(
            turn=turn_num,
            dimension=EvalDimension.CONSTRAINT_COMPLIANCE,
            score=0,
            max_score=1,
            evidence=f"回复{actual_len}字，超过限制{max_chars}字。内容：「{content[:50]}...」",
            rule_ref=constraint.id,
            severity="medium",
        )
    return None


def check_forbidden_words(turn_num: int, content: str, constraint: Constraint) -> RuleViolation | None:
    """检查是否使用了禁用词"""
    words = constraint.params.get("words", [])
    found = [w for w in words if w in content]
    if found:
        return RuleViolation(
            turn=turn_num,
            dimension=EvalDimension.CONSTRAINT_COMPLIANCE,
            score=0,
            max_score=1,
            evidence=f"使用了禁用词：{', '.join(found)}。内容：「{content}」",
            rule_ref=constraint.id,
            severity="medium",
        )
    return None


def check_all_hard_rules(
    turn_num: int, content: str, constraints: list[Constraint],
    skip_word_count: bool = False,
) -> list[RuleViolation]:
    """对单轮回复执行所有硬规则检查"""
    violations = []
    for constraint in constraints:
        violation = None
        if constraint.type == ConstraintType.WORD_COUNT:
            if not skip_word_count:
                violation = check_word_count(turn_num, content, constraint)
        elif constraint.type == ConstraintType.FORBIDDEN_WORDS:
            violation = check_forbidden_words(turn_num, content, constraint)
        if violation:
            violations.append(violation)
    return violations
