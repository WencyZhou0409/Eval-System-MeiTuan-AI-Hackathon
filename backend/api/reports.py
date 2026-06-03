import json
import os

from fastapi import APIRouter, HTTPException

from config import settings

router = APIRouter()


@router.get("")
async def list_reports():
    """获取所有评测报告"""
    reports = []
    if not os.path.exists(settings.RESULTS_DIR):
        return {"reports": []}
    for filename in os.listdir(settings.RESULTS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(settings.RESULTS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                personas = [s.get("persona") for s in data.get("sessions", [])]
                reports.append({
                    "id": filename.replace(".json", ""),
                    "instruction_id": data.get("instruction_id", ""),
                    "instruction_task": data.get("instruction_task", ""),
                    "instruction_role": data.get("instruction_role", ""),
                    "model_under_test": data.get("model_under_test", ""),
                    "total_score": data.get("total_score", 0),
                    "max_total_score": data.get("max_total_score", 0),
                    "overall_percentage": data.get("overall_percentage", 0),
                    "rating": data.get("rating", ""),
                    "personas": personas,
                    "personas_tested": data.get("personas_tested", 0),
                    "created_at": data.get("created_at", ""),
                })
    reports.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"reports": reports}


@router.get("/{report_id}")
async def get_report(report_id: str):
    """获取报告详情"""
    filepath = os.path.join(settings.RESULTS_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)
