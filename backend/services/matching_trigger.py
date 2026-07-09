from database import SessionLocal
from routes.settings import get_app_settings
from routes.matching import generate_and_execute_matching, GeneratePreferencesPayload

def trigger_background_matching():
    db = SessionLocal()
    try:
        settings = get_app_settings(db)
        if settings.recruitment_status == "OPEN":
            generate_and_execute_matching(GeneratePreferencesPayload(), db)
    except Exception as e:
        print(f"[StableHire] Background matching failed: {e}")
    finally:
        db.close()
