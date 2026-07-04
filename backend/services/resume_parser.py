import re
from io import BytesIO
from pathlib import Path
from docx import Document
from pypdf import PdfReader
from sqlalchemy.orm import Session
from models import SkillTaxonomy

HEADINGS = {
    "education": r"(?:education|academic background|qualifications)",
    "experience": r"(?:experience|work history|employment|professional experience)",
}
ROLE_WORDS = r"(?:engineer|developer|analyst|scientist|designer|manager|architect|specialist|consultant)"


def extract_text(content: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(content))
        pages = []
        for page in reader.pages:
            try:
                text = page.extract_text(extraction_mode="layout")
            except TypeError:
                text = page.extract_text()
            pages.append(text or "")
        return "\n".join(pages).strip()
    if suffix == ".docx":
        document = Document(BytesIO(content))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip()).strip()
    raise ValueError("Only PDF and DOCX resumes are supported")


def _section(text: str, heading: str) -> str:
    marker = HEADINGS[heading]
    match = re.search(rf"(?is)(?:^|\n)\s*{marker}\s*:?\s*\n(.+?)(?=\n\s*[A-Z][A-Z /&]{{2,}}\s*:?\s*\n|\Z)", text)
    return " ".join(match.group(1).split())[:500] if match else ""


def parse_resume(text: str, db: Session) -> dict:
    lines = [re.sub(r"\s+", " ", line).strip(" •\t") for line in text.splitlines() if line.strip()]
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}", text)
    salary_match = re.search(r"(?i)(?:expected|desired|salary)[^\d$]{0,20}\$?\s*([\d,]{5,})", text)
    years = [float(x) for x in re.findall(r"(?i)(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)", text)]
    role_match = re.search(rf"(?im)(?:desired|target|preferred)\s+(?:role|position)\s*:?\s*([^\n]+)", text)
    if not role_match:
        role_match = re.search(rf"(?im)^([A-Za-z][A-Za-z /&+-]+{ROLE_WORDS})\s*$", text)
    location_match = re.search(r"(?im)(?:preferred\s+location|location)\s*:?\s*([A-Za-z .-]+)$", text)

    taxonomy = db.query(SkillTaxonomy).all()
    found = []
    lowered = text.lower()
    for item in taxonomy:
        if re.search(rf"(?<!\w){re.escape(item.skill_term.lower())}(?!\w)", lowered):
            found.append(item.canonical_skill)
    skills = list(dict.fromkeys(found))

    name = ""
    for line in lines[:8]:
        if not re.search(r"@|\d{3}|resume|curriculum|linkedin|github", line, re.I) and 2 <= len(line.split()) <= 5:
            name = line.title() if line.isupper() else line
            break

    warnings = []
    if not name:
        warnings.append("Candidate name could not be identified")
    if not skills:
        warnings.append("No taxonomy skills were detected")
    if not years:
        warnings.append("Experience was not explicitly stated")
    education = _section(text, "education")
    if not education:
        degree = re.search(r"(?im)^.*(?:B\.?S\.?|M\.?S\.?|Bachelor|Master|Ph\.?D|MBA).*$", text)
        education = degree.group(0).strip() if degree else ""
        if not education:
            warnings.append("Education could not be identified")
    return {
        "name": name, "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "skills": ", ".join(skills), "experience_years": max(years, default=0),
        "desired_role": role_match.group(1).strip(" :-") if role_match else "",
        "desired_salary": float(salary_match.group(1).replace(",", "")) if salary_match else None,
        "preferred_location": location_match.group(1).strip() if location_match else "",
        "education": education, "warnings": warnings,
    }
