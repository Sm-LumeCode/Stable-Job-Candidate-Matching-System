from sqlalchemy.orm import Session
from models import Job, SkillTaxonomy
from services.preprocessing import normalize_skills


JOB_COLUMNS = {"job_id", "company_name", "title", "required_skills", "min_experience_years", "offered_salary", "location", "capacity"}
SKILL_COLUMNS = {"skill_term", "canonical_skill", "category"}


def _number(value: str | None, default=0, cast=float):
    try:
        return cast(value) if value not in (None, "") else default
    except (TypeError, ValueError):
        return default


def import_jobs(db: Session, rows: list[dict[str, str]]) -> int:
    count = 0
    for row in rows:
        if not row.get("job_id") or not row.get("title") or not row.get("company_name"):
            continue
        raw_skills = row.get("required_skills", "").strip()
        original_skills, normalized = normalize_skills(raw_skills, db)
        values = dict(
            job_id=row["job_id"].strip(), title=row["title"].strip(),
            company_name=row["company_name"].strip(),
            required_skills=original_skills,
            normalized_required_skills=normalized,
            min_experience_years=_number(row.get("min_experience_years")),
            offered_salary=_number(row.get("offered_salary"), None),
            location=row.get("location", "").strip(), capacity=_number(row.get("capacity"), 1, int),
            description=row.get("description", "").strip(),
        )
        existing = db.query(Job).filter(Job.job_id == values["job_id"]).first()
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
        else:
            db.add(Job(**values))
        count += 1
    db.commit()
    return count


def import_skills(db: Session, rows: list[dict[str, str]]) -> int:
    count = 0
    for row in rows:
        term = row.get("skill_term", "").strip()
        canonical = row.get("canonical_skill", "").strip()
        if not term or not canonical:
            continue
        values = {"skill_term": term, "canonical_skill": canonical, "category": row.get("category", "General").strip()}
        existing = db.query(SkillTaxonomy).filter(SkillTaxonomy.skill_term == term).first()
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
        else:
            db.add(SkillTaxonomy(**values))
        count += 1
    db.commit()
    return count
