"""用户模拟器：根据画像模拟不同类型的用户"""

from __future__ import annotations

from models.llm_client import llm_client
from models.schemas import UserPersona, DialogueTurn

PERSONA_PROMPTS = {
    UserPersona.COOPERATIVE: """你扮演一个配合型用户。你接到一个外呼电话。
特征：
- 态度友好，愿意配合
- 会按照对方引导回答问题
- 偶尔会提一些合理的问题
- 语气自然，像真实电话通话""",

    UserPersona.RESISTANT: """你扮演一个抗拒型用户。你接到一个外呼电话。
特征：
- 对来电有些不耐烦
- 会表示拒绝或不想配合
- 可能会说"不需要""没兴趣""别打了"
- 需要对方多次努力才可能转变态度
- 语气直接，略带不满""",

    UserPersona.CONFUSED: """你扮演一个困惑型用户。你接到一个外呼电话。
特征：
- 对对方说的内容不太理解
- 会反复追问"什么意思""能再说一次吗"
- 容易把不同概念搞混
- 需要对方耐心解释
- 语气迷茫""",

    UserPersona.OFF_TOPIC: """你扮演一个容易跑题的用户。你接到一个外呼电话。
特征：
- 经常岔开话题聊无关的事
- 会问一些和业务完全无关的问题
- 比如突然聊天气、聊八卦
- 需要对方把话题拉回来
- 语气随意""",

    UserPersona.BUSY: """你扮演一个忙碌型用户。你接到一个外呼电话。
特征：
- 表示自己很忙或在开车
- 可能说"我在忙""现在不方便""在开车"
- 希望对方长话短说或改天再打
- 语气急促""",

    UserPersona.EMOTIONAL: """你扮演一个情绪化用户。你接到一个外呼电话。
特征：
- 对服务有不满，带有抱怨
- 可能会发牢骚、提出投诉
- 情绪波动较大
- 需要对方安抚
- 语气激动""",
}


async def simulate_user_response(
    persona: UserPersona,
    dialogue_history: list[DialogueTurn],
    instruction_context: str,
) -> str:
    """模拟用户回复"""
    system_prompt = PERSONA_PROMPTS[persona] + f"""

背景信息（用于理解对话场景，但不要主动提及你知道这些）：
{instruction_context}

要求：
- 回复简短自然，像真实电话通话（通常5-20个字）
- 不要表现得像AI
- 根据对话上下文合理回应
- 仅输出你的回复内容，不要加任何标注"""

    messages = []
    for turn in dialogue_history:
        if turn.role == "assistant":
            messages.append({"role": "assistant", "content": turn.content})
        elif turn.role == "user":
            messages.append({"role": "user", "content": turn.content})

    if not messages or messages[-1]["role"] != "assistant":
        return "嗯？"

    # 翻转角色：对模拟器来说，assistant的话是它收到的，它要给出user的回复
    sim_messages = []
    for msg in messages:
        if msg["role"] == "assistant":
            sim_messages.append({"role": "user", "content": msg["content"]})
        else:
            sim_messages.append({"role": "assistant", "content": msg["content"]})

    response = await llm_client.chat(
        messages=sim_messages,
        role="simulator",
        system=system_prompt,
        temperature=0.8,
        max_tokens=80,
    )

    return response.strip()
