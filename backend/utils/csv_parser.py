import csv
import io
from fastapi import HTTPException, UploadFile


async def parse_csv(file: UploadFile) -> list[dict[str, str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")
    try:
        content = (await file.read()).decode("utf-8-sig")
        return list(csv.DictReader(io.StringIO(content)))
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(status_code=400, detail="Invalid CSV file.") from exc

