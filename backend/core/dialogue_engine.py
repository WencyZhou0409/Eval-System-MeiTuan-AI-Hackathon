"""对话引擎：管理模拟器与被测模型之间的多轮对话"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Callable, Awaitable, Optional

from models.llm_client import llm_client
from models.schemas import DialogueTurn, UserPersona
from core.user_simulator import simulate_user_response


async def run_dialogue_session(
    instruction: dict,
    persona: str,
    model: str = "DeepSeek-V3",
    max_turns: int = 15,
) -> dict:
    """执行一轮完整的对话模拟（非流式）"""
    return await run_dialogue_session_streaming(
        instruction=instruction,
        persona=persona,
        model=model,
        max_turns=max_turns,
        on_turn=None,
    )


async def run_dialogue_session_streaming(
    instruction: dict,
    persona: str,
    model: str = "DeepSeek-V3",
    max_turns: int = 15,
    on_turn: Optional[Callable[[dict], Awaitable[None]]] = None,
) -> dict:
    """执行对话模拟，每产生一轮通过 on_turn 回调通知"""
    session_id = str(uuid.uuid4())[:8]
    persona_enum = UserPersona(persona)

    turns: list[dict] = []
    opening_line = instruction.get("opening_line", "你好")
    # 替换指令模板中的占位符变量
    opening_line = _replace_template_vars(opening_line)

    # 第1轮：被测模型发出开场白
    turn_data = {
        "turn": 1,
        "role": "assistant",
        "content": opening_line,
        "timestamp": datetime.now().isoformat(),
    }
    turns.append(turn_data)
    if on_turn:
        await on_turn(turn_data)

    sut_system = instruction.get("raw_text", "")
    instruction_context = f"场景：{instruction.get('task', '')}"

    turn_num = 1
    while turn_num < max_turns:
        # 模拟用户回复
        dialogue_turns = [DialogueTurn(**t) for t in turns]
        user_response = await simulate_user_response(
            persona=persona_enum,
            dialogue_history=dialogue_turns,
            instruction_context=instruction_context,
        )

        turn_num += 1
        turn_data = {
            "turn": turn_num,
            "role": "user",
            "content": user_response,
            "timestamp": datetime.now().isoformat(),
        }
        turns.append(turn_data)
        if on_turn:
            await on_turn(turn_data)

        if _should_terminate(user_response):
            break

        # 被测模型回复
        sut_messages = _build_sut_messages(turns)
        assistant_response = await llm_client.chat(
            messages=sut_messages,
            model=model,
            role="sut",
            system=sut_system,
            temperature=0.7,
            max_tokens=100,
        )

        turn_num += 1
        turn_data = {
            "turn": turn_num,
            "role": "assistant",
            "content": assistant_response.strip(),
            "timestamp": datetime.now().isoformat(),
        }
        turns.append(turn_data)
        if on_turn:
            await on_turn(turn_data)

        if _is_goodbye(assistant_response):
            break

    session = {
        "id": session_id,
        "instruction_id": instruction.get("id", ""),
        "persona": persona,
        "model_under_test": model,
        "turns": turns,
        "started_at": turns[0]["timestamp"] if turns else "",
        "ended_at": turns[-1]["timestamp"] if turns else "",
        "termination_reason": "max_turns" if turn_num >= max_turns else "natural",
    }
    return session


def _build_sut_messages(turns: list[dict]) -> list[dict]:
    messages = []
    for t in turns:
        if t["role"] == "assistant":
            messages.append({"role": "assistant", "content": t["content"]})
        elif t["role"] == "user":
            messages.append({"role": "user", "content": t["content"]})
    return messages


def _should_terminate(user_response: str) -> bool:
    end_signals = ["挂了", "拜拜", "再见", "不说了", "挂断"]
    return any(s in user_response for s in end_signals)


def _is_goodbye(assistant_response: str) -> bool:
    end_signals = ["再见", "祝您", "感谢您的时间", "那我就不打扰了", "挂断", "稍后再打", "待会再打", "改天再打"]
    return any(s in assistant_response for s in end_signals)


def _replace_template_vars(text: str) -> str:
    """替换指令模板中的占位符，避免被测模型原样输出"""
    import re
    # 常见占位符 → 合理的默认值
    replacements = {
        r"\$\{rider_name\}": "师傅",
        r"\$\{name\}": "您",
        r"\$\{customer_name\}": "客户",
        r"\$\{user_name\}": "您",
    }
    for pattern, value in replacements.items():
        text = re.sub(pattern, value, text)
    # 处理剩余未知占位符 ${xxx} → 移除括号保留内容作为提示
    text = re.sub(r"\$\{(\w+)\}", r"[\1]", text)
    return text
