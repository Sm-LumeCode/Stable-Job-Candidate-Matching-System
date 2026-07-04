from fastapi import APIRouter

router = APIRouter(tags=["benchmark"])


@router.get("/benchmark")
def benchmark_status():
    return {"status": "placeholder", "results": []}

