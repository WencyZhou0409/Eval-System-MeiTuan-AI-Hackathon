import json
import os
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException

from config import settings
from models.schemas import ParsedInstruction

router = APIRouter()

INSTRUCTIONS_DIR = os.path.join(settings.DATA_DIR, "instructions")


@router.get("")
async def list_instructions():
    """获取所有已解析的指令列表"""
    instructions = []
    if not os.path.exists(INSTRUCTIONS_DIR):
        os.makedirs(INSTRUCTIONS_DIR, exist_ok=True)
    for filename in os.listdir(INSTRUCTIONS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(INSTRUCTIONS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                instructions.append({
                    "id": data.get("id"),
                    "role": data.get("role"),
                    "task": data.get("task"),
                })
    return {"instructions": instructions}


@router.get("/{instruction_id}")
async def get_instruction(instruction_id: str):
    """获取指令详情"""
    filepath = os.path.join(INSTRUCTIONS_DIR, f"{instruction_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Instruction not found")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/upload")
async def upload_instruction(file: UploadFile = File(...)):
    """上传并解析指令文件"""
    content = await file.read()
    text = content.decode("utf-8")

    from core.instruction_parser import parse_instruction
    parsed = await parse_instruction(text)

    os.makedirs(INSTRUCTIONS_DIR, exist_ok=True)
    filepath = os.path.join(INSTRUCTIONS_DIR, f"{parsed.id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(parsed.model_dump(), f, ensure_ascii=False, indent=2)

    return {"message": "Instruction parsed and saved", "id": parsed.id}


@router.post("/parse")
async def parse_instruction_text(body: dict):
    """直接解析指令文本"""
    text = body.get("text", "")
    instruction_id = body.get("id", None)
    if not text:
        raise HTTPException(status_code=400, detail="text field is required")

    from core.instruction_parser import parse_instruction
    parsed = await parse_instruction(text, instruction_id=instruction_id)

    os.makedirs(INSTRUCTIONS_DIR, exist_ok=True)
    filepath = os.path.join(INSTRUCTIONS_DIR, f"{parsed.id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(parsed.model_dump(), f, ensure_ascii=False, indent=2)

    return parsed.model_dump()
