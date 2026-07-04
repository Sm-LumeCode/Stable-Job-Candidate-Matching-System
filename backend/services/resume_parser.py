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
ROLE_WORDS = r"(?:engineer|developer|analyst|scientist|designer|manager|architect|specialist|consultant|intern)"

# ────────────────────────────────────────────────────────────────────
# Built-in tech keyword dictionary (fallback when taxonomy is empty)
# ────────────────────────────────────────────────────────────────────
TECH_KEYWORDS = [
    # Languages
    ("python", "Python"), ("java", "Java"), ("javascript", "JavaScript"),
    ("typescript", "TypeScript"), ("c++", "C++"), ("c#", "C#"), ("c", "C"),
    ("rust", "Rust"), ("go", "Go"), ("kotlin", "Kotlin"), ("swift", "Swift"),
    ("ruby", "Ruby"), ("php", "PHP"), ("r", "R"), ("scala", "Scala"),
    ("dart", "Dart"), ("matlab", "MATLAB"), ("shell", "Shell"), ("bash", "Bash"),
    ("powershell", "PowerShell"), ("sql", "SQL"), ("html", "HTML"), ("css", "CSS"),

    # Web Frameworks / Libraries
    ("react", "React"), ("reactjs", "React"), ("react.js", "React"),
    ("next.js", "Next.js"), ("nextjs", "Next.js"),
    ("vue", "Vue.js"), ("vue.js", "Vue.js"), ("angular", "Angular"),
    ("svelte", "Svelte"), ("jquery", "jQuery"),
    ("fastapi", "FastAPI"), ("flask", "Flask"), ("django", "Django"),
    ("express", "Express.js"), ("expressjs", "Express.js"), ("express.js", "Express.js"),
    ("node.js", "Node.js"), ("nodejs", "Node.js"), ("spring", "Spring"),
    ("spring boot", "Spring Boot"), ("laravel", "Laravel"), ("rails", "Ruby on Rails"),
    ("tailwind", "Tailwind CSS"), ("tailwindcss", "Tailwind CSS"),
    ("bootstrap", "Bootstrap"), ("fasthtml", "FastHTML"),

    # ML / AI
    ("tensorflow", "TensorFlow"), ("tensorflow lite", "TensorFlow Lite"),
    ("pytorch", "PyTorch"), ("keras", "Keras"),
    ("scikit-learn", "Scikit-learn"), ("sklearn", "Scikit-learn"),
    ("numpy", "NumPy"), ("pandas", "Pandas"), ("matplotlib", "Matplotlib"),
    ("seaborn", "Seaborn"), ("opencv", "OpenCV"), ("cv2", "OpenCV"),
    ("hugging face", "Hugging Face"), ("transformers", "Transformers"),
    ("langchain", "LangChain"), ("llama", "LLaMA"), ("gpt", "GPT"),
    ("openai", "OpenAI"), ("groq", "Groq"), ("deepgram", "Deepgram"),
    ("yolo", "YOLO"), ("mediapipe", "MediaPipe"),
    ("computer vision", "Computer Vision"), ("deep learning", "Deep Learning"),
    ("machine learning", "Machine Learning"), ("nlp", "NLP"),
    ("natural language processing", "Natural Language Processing"),
    ("speech recognition", "Speech Recognition"),
    ("image processing", "Image Processing"),
    ("large language model", "LLM"), ("llm", "LLM"),

    # Databases
    ("mysql", "MySQL"), ("postgresql", "PostgreSQL"), ("postgres", "PostgreSQL"),
    ("mongodb", "MongoDB"), ("sqlite", "SQLite"), ("redis", "Redis"),
    ("cassandra", "Cassandra"), ("firebase", "Firebase"),
    ("elasticsearch", "Elasticsearch"), ("supabase", "Supabase"),
    ("sqlalchemy", "SQLAlchemy"), ("prisma", "Prisma"),

    # Cloud / DevOps
    ("aws", "AWS"), ("azure", "Azure"), ("gcp", "GCP"),
    ("google cloud", "Google Cloud"), ("heroku", "Heroku"), ("vercel", "Vercel"),
    ("netlify", "Netlify"), ("docker", "Docker"), ("kubernetes", "Kubernetes"),
    ("terraform", "Terraform"), ("ansible", "Ansible"), ("jenkins", "Jenkins"),
    ("github actions", "GitHub Actions"), ("ci/cd", "CI/CD"), ("nginx", "Nginx"),
    ("apache", "Apache"),

    # OS / System
    ("linux", "Linux"), ("ubuntu", "Ubuntu"), ("windows", "Windows"),
    ("macos", "macOS"), ("x11", "X11"), ("wmctrl", "wmctrl"),
    ("xdotool", "xdotool"), ("unix", "Unix"),

    # Tools / Platforms
    ("git", "Git"), ("github", "GitHub"), ("gitlab", "GitLab"),
    ("bitbucket", "Bitbucket"), ("jira", "Jira"), ("figma", "Figma"),
    ("postman", "Postman"), ("swagger", "Swagger"), ("vscode", "VS Code"),
    ("jupyter", "Jupyter"), ("colab", "Google Colab"),
    ("raspberry pi", "Raspberry Pi"), ("arduino", "Arduino"),

    # Web / APIs
    ("rest", "REST API"), ("rest api", "REST API"), ("graphql", "GraphQL"),
    ("websocket", "WebSocket"), ("oauth", "OAuth"), ("jwt", "JWT"),
    ("grpc", "gRPC"), ("mqtt", "MQTT"),

    # Mobile
    ("flutter", "Flutter"), ("react native", "React Native"),
    ("android", "Android"), ("ios", "iOS"),

    # Others
    ("blockchain", "Blockchain"), ("smart contracts", "Smart Contracts"),
    ("solidity", "Solidity"), ("web3", "Web3"),
    ("data structures", "Data Structures"), ("algorithms", "Algorithms"),
    ("object oriented programming", "OOP"), ("oop", "OOP"),
    ("agile", "Agile"), ("scrum", "Scrum"),
]


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


def _scan_keywords(text: str) -> list[str]:
    """Scan text for tech keywords using built-in dictionary. Returns canonical names."""
    lowered = text.lower()
    found_canonical: list[str] = []
    seen: set[str] = set()
    for term, canonical in TECH_KEYWORDS:
        # Word-boundary safe match
        pattern = rf"(?<!\w){re.escape(term)}(?!\w)"
        if re.search(pattern, lowered):
            if canonical.lower() not in seen:
                seen.add(canonical.lower())
                found_canonical.append(canonical)
    return found_canonical


def parse_resume(text: str, db: Session) -> dict:
    lines = [re.sub(r"\s+", " ", line).strip(" •\t") for line in text.splitlines() if line.strip()]
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}", text)
    salary_match = re.search(r"(?i)(?:expected|desired|salary)[^\d$]{0,20}\$?\s*([\d,]{5,})", text)
    years = [float(x) for x in re.findall(r"(?i)(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)", text)]
    role_match = re.search(rf"(?im)(?:desired|target|preferred)\s+(?:role|position)\s*:?\s*([^\n]+)", text)
    if not role_match:
        role_match = re.search(rf"(?im)^([A-Za-z][A-Za-z /&+-]+{ROLE_WORDS})\s*$", text)
    location_match = re.search(r"(?im)(?:preferred\s+location|location)\s*:?\s*([A-Za-z ,.-]+)$", text)

    # ── 1. Taxonomy-based skill detection ───────────────────────────
    taxonomy = db.query(SkillTaxonomy).all()
    found: list[str] = []
    seen_canonical: set[str] = set()
    lowered = text.lower()
    for item in taxonomy:
        if re.search(rf"(?<!\w){re.escape(item.skill_term.lower())}(?!\w)", lowered):
            if item.canonical_skill.lower() not in seen_canonical:
                seen_canonical.add(item.canonical_skill.lower())
                found.append(item.canonical_skill)

    # ── 2. Built-in keyword fallback (always runs to catch extras) ──
    for kw in _scan_keywords(text):
        if kw.lower() not in seen_canonical:
            seen_canonical.add(kw.lower())
            found.append(kw)

    skills = found

    name = ""
    for line in lines[:8]:
        if not re.search(r"@|\d{3}|resume|curriculum|linkedin|github", line, re.I) and 2 <= len(line.split()) <= 5:
            name = line.title() if line.isupper() else line
            break

    warnings = []
    if not name:
        warnings.append("Candidate name could not be identified")
    if not skills:
        warnings.append("No skills were detected")
    if not years:
        warnings.append("Experience was not explicitly stated")
    education = _section(text, "education")
    if not education:
        degree = re.search(r"(?im)^.*(?:B\.?S\.?|M\.?S\.?|B\.?E\.?|Bachelor|Master|Ph\.?D|MBA|B\.?Tech|M\.?Tech|BE|BTech).*$", text)
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
