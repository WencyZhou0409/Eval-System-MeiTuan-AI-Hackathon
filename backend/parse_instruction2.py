"""
一次性脚本：解析 raw_2.md 并保存为 test_2.json

用法（在 backend 目录下运行）：
    python parse_instruction2.py

成功后会在 data/instructions/ 生成 test_2.json，
前端控制台「选择指令」下拉框中即可看到指令2。
"""

import asyncio
import json
import os
import sys

# 将 backend 目录加入模块搜索路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RAW_PATH = os.path.join(os.path.dirname(__file__), "data", "instructions", "raw_2.md")
OUT_PATH = os.path.join(os.path.dirname(__file__), "data", "instructions", "test_2.json")


async def main():
    if not os.path.exists(RAW_PATH):
        print(f"[错误] 找不到原始指令文件：{RAW_PATH}")
        sys.exit(1)

    print(f"读取 {RAW_PATH} ...")
    with open(RAW_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    print("正在调用 Claude 解析指令2，约需 15-30 秒...")
    from core.instruction_parser import parse_instruction
    parsed = await parse_instruction(text, instruction_id="test_2")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(parsed.model_dump(), f, ensure_ascii=False, indent=2)

    print(f"\n已保存至 {OUT_PATH}")
    print(f"  角色：{parsed.role}")
    print(f"  任务：{parsed.task[:60]}...")
    print(f"  开场白：{parsed.opening_line[:50]}")
    print(f"  流程步骤数：{len(parsed.call_flow)}")
    print(f"  约束数：{len(parsed.constraints)}")
    print(f"  知识点数：{len(parsed.knowledge_points)}")

    print("\n--- 约束列表 ---")
    for c in parsed.constraints:
        print(f"  [{c.id}] {c.type}: {c.rule[:60]}")

    print("\n--- 流程步骤 ---")
    for step in parsed.call_flow:
        branches_desc = f"  {len(step.branches)} 个分支" if step.branches else ""
        print(f"  Step {step.step}: {step.description[:60]}{branches_desc}")


if __name__ == "__main__":
    asyncio.run(main())
