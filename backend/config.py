import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://bmc-llm-relay.bluemediagroup.cn/v1")

    JUDGE_MODEL: str = os.getenv("JUDGE_MODEL", "claude-opus-4-6-v1")
    JUDGE_MODEL_FALLBACK: str = os.getenv("JUDGE_MODEL_FALLBACK", "claude-sonnet-4-6")
    SIMULATOR_MODEL: str = os.getenv("SIMULATOR_MODEL", "gpt-4o")
    SUT_MODEL: str = os.getenv("SUT_MODEL", "DeepSeek-V3")

    BACKEND_PORT: int = int(os.getenv("PORT") or os.getenv("BACKEND_PORT", "8000"))
    RPM_LIMIT: int = int(os.getenv("RPM_LIMIT", "18"))  # 中转 API 限制 20，留 2 个缓冲

    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "data")
    RESULTS_DIR: str = os.path.join(os.path.dirname(__file__), "results")


settings = Settings()
