import asyncio
import json
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from config import settings
from models.schemas import EvalStartRequest, EvalStatusResponse

router = APIRouter()

# 内存任务存储
_tasks: dict = {}


@router.post("/start")
async def start_evaluation(req: EvalStartRequest):
    """启动评测，返回 task_id，客户端用 SSE 订阅进度"""
    task_id = str(uuid.uuid4())[:8]

    _tasks[task_id] = {
        "id": task_id,
        "status": "running",
        "progress": 0.0,
        "current_persona": None,
        "message": "初始化中...",
        "request": req.model_dump(),
        "results": [],
        "events": asyncio.Queue(),
        "started_at": datetime.now().isoformat(),
        "task_ref": None,
    }

    task_ref = asyncio.create_task(_run_evaluation(task_id, req))
    _tasks[task_id]["task_ref"] = task_ref
    return {"id": task_id, "status": "running", "message": "评测已启动"}


@router.get("/{task_id}/stream")
async def stream_evaluation(task_id: str):
    """SSE 实时推送评测过程"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    async def event_generator():
        task = _tasks[task_id]
        queue: asyncio.Queue = task["events"]

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=60.0)
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                if event.get("type") in ("completed", "failed"):
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{task_id}/status")
async def get_evaluation_status(task_id: str):
    """获取评测任务状态"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _tasks[task_id]
    return EvalStatusResponse(
        id=task["id"],
        status=task["status"],
        progress=task["progress"],
        current_persona=task.get("current_persona"),
        message=task.get("message"),
    )


@router.post("/{task_id}/cancel")
async def cancel_evaluation(task_id: str):
    """终止正在运行的评测任务"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _tasks[task_id]

    if task["status"] != "running":
        return {"status": task["status"], "message": "任务已结束，无需取消"}

    # 先更新状态并推送事件，让前端 SSE 收到后关闭连接
    task["status"] = "cancelled"
    task["message"] = "用户已终止评测"
    await _emit(task_id, {"type": "cancelled", "message": "评测已被用户终止"})

    # 再取消后台协程（CancelledError 是 BaseException，不会被 except Exception 捕获）
    task_ref = task.get("task_ref")
    if task_ref and not task_ref.done():
        task_ref.cancel()

    return {"status": "cancelled"}


@router.get("/{task_id}/result")
async def get_evaluation_result(task_id: str):
    """获取评测结果"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _tasks[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Evaluation not yet completed")

    result_file = os.path.join(settings.RESULTS_DIR, f"{task_id}.json")
    if os.path.exists(result_file):
        with open(result_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"results": task.get("results", [])}


async def _emit(task_id: str, event: dict):
    """推送事件到 SSE 队列"""
    if task_id in _tasks:
        await _tasks[task_id]["events"].put(event)


async def _run_evaluation(task_id: str, req: EvalStartRequest):
    """后台执行评测流程，实时推送事件"""
    try:
        from core.dialogue_engine import run_dialogue_session_streaming
        from core.evaluator import evaluate_session
        from core.report_generator import generate_report

        instruction_file = os.path.join(
            settings.DATA_DIR, "instructions", f"{req.instruction_id}.json"
        )
        if not os.path.exists(instruction_file):
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["message"] = f"指令文件不存在: {req.instruction_id}"
            await _emit(task_id, {"type": "failed", "message": "指令文件不存在"})
            return

        with open(instruction_file, "r", encoding="utf-8") as f:
            instruction = json.load(f)

        task_name = instruction.get("task", "")[:30]
        total_personas = len(req.personas)
        await _emit(task_id, {
            "type": "init",
            "instruction_name": task_name,
            "personas": req.personas,
            "model": req.model_under_test,
        })

        async def run_persona(persona: str, index: int):
            """单个画像的对话+评测，并行执行"""
            await _emit(task_id, {
                "type": "persona_start",
                "persona": persona,
                "index": index,
                "total": total_personas,
            })

            session = await run_dialogue_session_streaming(
                instruction=instruction,
                persona=persona,
                model=req.model_under_test,
                max_turns=req.max_turns,
                on_turn=lambda turn: asyncio.ensure_future(_emit(task_id, {
                    "type": "turn",
                    "persona": persona,
                    **turn,
                })),
            )

            await _emit(task_id, {
                "type": "eval_start",
                "persona": persona,
                "message": "正在评测对话质量...",
            })

            result = await evaluate_session(session, instruction)

            await _emit(task_id, {
                "type": "eval_done",
                "persona": persona,
                "total_score": result["total_score"],
                "max_total_score": result["max_total_score"],
                "violations_count": len(result["violations"]),
            })
            return result

        # 所有画像并行执行
        all_results = list(await asyncio.gather(
            *[run_persona(p, i) for i, p in enumerate(req.personas)]
        ))

        # 生成报告
        await _emit(task_id, {"type": "report_generating"})
        report = generate_report(all_results, instruction)

        os.makedirs(settings.RESULTS_DIR, exist_ok=True)
        result_file = os.path.join(settings.RESULTS_DIR, f"{task_id}.json")
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        _tasks[task_id]["status"] = "completed"
        _tasks[task_id]["progress"] = 1.0
        _tasks[task_id]["message"] = "评测完成"
        _tasks[task_id]["results"] = report

        await _emit(task_id, {
            "type": "completed",
            "report_id": task_id,
            "rating": report.get("rating"),
            "overall_percentage": report.get("overall_percentage"),
        })

    except Exception as e:
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["message"] = f"评测失败: {str(e)}"
        await _emit(task_id, {"type": "failed", "message": str(e)})
