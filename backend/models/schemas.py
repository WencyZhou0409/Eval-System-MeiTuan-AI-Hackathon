from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class UserPersona(str, Enum):
    COOPERATIVE = "cooperative"
    RESISTANT = "resistant"
    CONFUSED = "confused"
    OFF_TOPIC = "off_topic"
    BUSY = "busy"
    EMOTIONAL = "emotional"


class EvalDimension(str, Enum):
    FLOW_ADHERENCE = "flow_adherence"
    BRANCH_CORRECTNESS = "branch_correctness"
    CONSTRAINT_COMPLIANCE = "constraint_compliance"
    KNOWLEDGE_ACCURACY = "knowledge_accuracy"
    EXCEPTION_HANDLING = "exception_handling"
    TERMINATION = "termination"


class ConstraintType(str, Enum):
    WORD_COUNT = "word_count"
    FORBIDDEN_WORDS = "forbidden_words"
    FORBIDDEN_TOPIC = "forbidden_topic"
    TERMINATION = "termination"
    STYLE = "style"
    RESPONSE_FORMAT = "response_format"


# --- 指令结构化模型 ---

class FlowBranch(BaseModel):
    condition: str
    next_step: Optional[int] = None
    action: Optional[str] = None


class FlowStep(BaseModel):
    step: int
    description: str
    branches: list[FlowBranch] = []
    reference_script: Optional[str] = None


class Constraint(BaseModel):
    id: str
    type: ConstraintType
    rule: str
    params: dict = {}


class ParsedInstruction(BaseModel):
    id: str
    role: str
    task: str
    opening_line: str
    call_flow: list[FlowStep] = []
    knowledge_points: list[str] = []
    constraints: list[Constraint] = []
    raw_text: str = ""


# --- 对话模型 ---

class DialogueTurn(BaseModel):
    turn: int
    role: str  # "system" | "user" | "assistant"
    content: str
    timestamp: Optional[str] = None


class DialogueSession(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    instruction_id: str
    persona: UserPersona
    model_under_test: str
    turns: list[DialogueTurn] = []
    started_at: str = ""
    ended_at: Optional[str] = None
    termination_reason: Optional[str] = None


# --- 评测模型 ---

class RuleViolation(BaseModel):
    turn: int
    dimension: EvalDimension
    score: float
    max_score: float
    evidence: str
    rule_ref: str
    severity: str = "medium"  # low / medium / high


class DimensionScore(BaseModel):
    dimension: EvalDimension
    score: float
    max_score: float
    violations: list[RuleViolation] = []


class EvaluationResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    session_id: str
    instruction_id: str
    persona: UserPersona
    model_under_test: str
    total_score: float
    max_total_score: float
    dimensions: list[DimensionScore] = []
    violations: list[RuleViolation] = []
    summary: str = ""
    suggestions: list[str] = []
    evaluated_at: str = ""


# --- API 请求/响应模型 ---

class EvalStartRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    instruction_id: str
    personas: list[UserPersona] = [UserPersona.COOPERATIVE]
    model_under_test: str = "deepseek-chat"
    max_turns: int = 20


class EvalStatusResponse(BaseModel):
    id: str
    status: str  # "running" | "completed" | "failed"
    progress: float = 0.0
    current_persona: Optional[str] = None
    message: Optional[str] = None


class ReportSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    instruction_id: str
    instruction_name: str
    model_under_test: str
    total_score: float
    max_total_score: float
    personas_tested: int
    created_at: str
