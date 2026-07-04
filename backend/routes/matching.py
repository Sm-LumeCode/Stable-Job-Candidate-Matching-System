from fastapi import APIRouter

router = APIRouter(tags=["matching"])


@router.get("/matching")
def matching_status():
    return {"status": "not_implemented", "results": [], "blocking_pairs": []}

