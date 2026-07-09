from pydantic import BaseModel, ConfigDict, Field, field_validator


class JobPayload(BaseModel):
    job_id: str = Field(min_length=1, max_length=20)
    company_name: str = Field(min_length=1, max_length=180)
    title: str = Field(min_length=1, max_length=180)
    required_skills: str = ""
    min_experience_years: float = Field(default=0, ge=0, le=60)
    offered_salary: float | None = Field(default=None, ge=0)
    location: str = ""
    capacity: int = Field(default=1, ge=1, le=100)
    description: str = ""


class JobResponse(JobPayload):
    id: int
    normalized_required_skills: str = ""
    recruiter_id: int | None = None
    status: str = "OPEN"
    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: int
    user_identifier: str
    message: str
    is_read: bool
    type: str
    model_config = ConfigDict(from_attributes=True)

class SkillPayload(BaseModel):
    skill_term: str = Field(min_length=1, max_length=180)
    canonical_skill: str = Field(min_length=1, max_length=180)
    category: str = Field(default="General", min_length=1, max_length=120)


class SkillResponse(SkillPayload):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CandidatePayload(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: str
    phone: str | None = None
    skills: str = ""
    experience_years: float = Field(default=0, ge=0, le=60)
    desired_role: str = ""
    desired_salary: float | None = Field(default=None, ge=0)
    preferred_location: str = ""
    education: str = ""
    resume_filename: str | None = None
    resume_text: str = ""

    @field_validator("phone", mode="before")
    @classmethod
    def empty_to_none(cls, value):
        return value or None


class CandidateResponse(CandidatePayload):
    id: int
    candidate_id: str
    normalized_skills: str = ""
    ai_skills: str = ""
    ai_extraction_metadata: str = "[]"
    model_config = ConfigDict(from_attributes=True)


class SettingsResponse(BaseModel):
    ai_parsing_enabled: bool
    groq_model: str
    api_key_configured: bool
    recruitment_status: str
    application_threshold: float = 0.70
    model_config = ConfigDict(from_attributes=True)


class CandidateApplicationResponse(BaseModel):
    id: int
    candidate_id: str
    job_id: str
    status: str  # auto_applied | manually_applied | cancelled
    compatibility_score: float
    preference_order: int | None = None
    model_config = ConfigDict(from_attributes=True)



class CandidatePreference(BaseModel):
    candidate_id: str
    preferences: list[str]


class JobPreference(BaseModel):
    job_id: str
    capacity: int = Field(ge=1)
    preferences: list[str]


class StableMatchingPayload(BaseModel):
    candidates: list[CandidatePreference]
    jobs: list[JobPreference]
