import json
import os
import groq

PROMPT = """You are an expert technical recruiter AI. Your task is to extract structured candidate information from the provided resume text.

CRITICAL RULES:
1. NO HALLUCINATIONS. Extract technologies ONLY if they are explicitly mentioned.
2. Infer high-level domains (e.g. "Computer Vision", "Deep Learning") ONLY if there is strong supporting evidence like specific tools (OpenCV, PyTorch). Do NOT infer "AWS" from "Python".
3. Extract technologies mentioned ANYWHERE, including projects, experience, and certifications.
4. Every skill in the "skills" array must include a confidence score (0.0 to 1.0), source (e.g., "Experience", "Project", "Inference"), and a reason.

RETURN STRICT VALID JSON ONLY. No markdown, no explanations, no extra text.

Schema:
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [
    {
      "name": "",
      "confidence": 0.0,
      "source": "",
      "reason": ""
    }
  ],
  "programming_languages": [],
  "frameworks": [],
  "libraries": [],
  "databases": [],
  "cloud_tools": [],
  "ai_ml_tools": [],
  "operating_systems": [],
  "devops_tools": [],
  "soft_skills": [],
  "experience_years": 0,
  "education": "",
  "preferred_role": "",
  "preferred_location": "",
  "projects": [
    {
      "title": "",
      "description": "",
      "technologies": []
    }
  ],
  "certifications": []
}
"""

def extract_resume_ai(text: str, api_key: str, model: str) -> dict | None:
    if not api_key or not text.strip():
        return None
    try:
        client = groq.Groq(api_key=api_key, max_retries=1)
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text}
            ],
            model=model,
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = response.choices[0].message.content
        if not content:
            return None
        return json.loads(content)
    except (groq.APIError, json.JSONDecodeError, Exception) as e:
        print(f"AI Parsing failed (falling back to rule-based): {e}")
        return None
