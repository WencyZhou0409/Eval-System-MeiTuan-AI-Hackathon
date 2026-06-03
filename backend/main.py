from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.evaluation import router as eval_router
from api.instructions import router as inst_router
from api.reports import router as report_router
from config import settings

app = FastAPI(title="多轮对话评测系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inst_router, prefix="/api/instructions", tags=["instructions"])
app.include_router(eval_router, prefix="/api/evaluation", tags=["evaluation"])
app.include_router(report_router, prefix="/api/reports", tags=["reports"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=False)
