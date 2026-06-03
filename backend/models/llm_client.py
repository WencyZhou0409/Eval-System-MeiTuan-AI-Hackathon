from __future__ import annotations

import asyncio
import logging
import time
from collections import deque

import openai
from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """滑动窗口限速器，主动预防 429。

    acquire() 在当前 60s 窗口内请求数达到上限时自动 sleep，
    等到最早的请求滑出窗口后再放行。锁仅在状态读写时持有，
    sleep 在锁外执行，避免阻塞其他等待者。
    """

    def __init__(self, max_requests: int, window_seconds: float = 60.0):
        self._max = max_requests
        self._window = window_seconds
        self._timestamps: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        while True:
            sleep_for = 0.0
            async with self._lock:
                now = time.monotonic()
                # 清理已滑出窗口的记录
                while self._timestamps and self._timestamps[0] < now - self._window:
                    self._timestamps.popleft()

                if len(self._timestamps) < self._max:
                    self._timestamps.append(now)
                    return  # 拿到令牌，直接放行

                # 窗口已满，计算需要等待的时间
                sleep_for = self._timestamps[0] + self._window - now + 0.05

            # 在锁外 sleep，允许其他协程继续检查
            logger.info(f"速率限制：窗口已满（{self._max} req/min），等待 {sleep_for:.1f}s")
            await asyncio.sleep(sleep_for)


# 每个角色独立计数，simulator 和 sut 的快速交替不会互相占用配额
_rate_limiters: dict[str, SlidingWindowRateLimiter] = {}


def _get_limiter(role: str) -> SlidingWindowRateLimiter:
    if role not in _rate_limiters:
        _rate_limiters[role] = SlidingWindowRateLimiter(max_requests=settings.RPM_LIMIT)
    return _rate_limiters[role]


class LLMClient:
    """统一 LLM 调用封装，内置限速 + 指数退避重试。"""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_BASE_URL,
            )
        return self._client

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        role: str = "sut",
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """统一聊天接口，含限速 + 重试。
        role: "judge" | "simulator" | "sut"，用于选择默认模型
        """
        if model is None:
            if role == "judge":
                model = settings.JUDGE_MODEL
            elif role == "simulator":
                model = settings.SIMULATOR_MODEL
            else:
                model = settings.SUT_MODEL

        final_messages = messages
        if system:
            final_messages = [{"role": "system", "content": system}] + messages

        result = await self._call_with_retry(model, final_messages, temperature, max_tokens, role)
        return result

    async def _call_with_retry(
        self,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        role: str,
        max_retries: int = 5,
    ) -> str:
        last_exc: Exception | None = None

        for attempt in range(max_retries):
            try:
                await _get_limiter(role).acquire()
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content or ""

            except openai.RateLimitError as e:
                last_exc = e
                # 优先用响应头里的 retry-after
                wait = _parse_retry_after(e) or min(5 * (2 ** attempt), 60)
                logger.warning(
                    f"[{model}] 429 限流（第{attempt + 1}/{max_retries}次），{wait:.1f}s 后重试"
                )
                await asyncio.sleep(wait)

                # judge 在最后一次重试前尝试 fallback 模型
                if (
                    role == "judge"
                    and attempt == max_retries - 2
                    and model == settings.JUDGE_MODEL
                    and settings.JUDGE_MODEL_FALLBACK
                ):
                    logger.warning(f"Judge 切换到备用模型 {settings.JUDGE_MODEL_FALLBACK}")
                    model = settings.JUDGE_MODEL_FALLBACK

            except (openai.APIConnectionError, openai.APITimeoutError) as e:
                last_exc = e
                wait = 2 * (attempt + 1)
                logger.warning(
                    f"[{model}] 连接异常（第{attempt + 1}/{max_retries}次）：{e}，{wait}s 后重试"
                )
                await asyncio.sleep(wait)

            except openai.APIStatusError as e:
                if e.status_code >= 500:
                    last_exc = e
                    wait = 2 * (attempt + 1)
                    logger.warning(
                        f"[{model}] 服务端错误 {e.status_code}（第{attempt + 1}/{max_retries}次），{wait}s 后重试"
                    )
                    await asyncio.sleep(wait)
                else:
                    raise  # 4xx（非429）不重试，直接抛出

        raise last_exc  # type: ignore[misc]


def _parse_retry_after(exc: openai.RateLimitError) -> float | None:
    """从响应头解析 retry-after 秒数，解析失败返回 None。"""
    try:
        val = exc.response.headers.get("retry-after") or exc.response.headers.get("x-ratelimit-reset-requests")
        if val:
            return float(val)
    except Exception:
        pass
    return None


llm_client = LLMClient()
