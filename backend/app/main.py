import json
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field


app = FastAPI(
    title="TrailMate API",
    description="Open-source AI outdoor adventure companion",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# llama.cpp is running locally.
LLAMA_URL = "http://127.0.0.1:8080/v1"


class AdventureRequest(BaseModel):
    location: str = "my local area"
    activity: str = "walking"
    duration: int = Field(default=60, ge=15, le=240)
    difficulty: str = "easy"
    interests: list[str] = []


class JournalRequest(BaseModel):
    adventure_title: str
    location: str
    duration: int
    completed_missions: list[str] = []
    observations: str = ""
    highlights: str = ""


def get_ai_client():
    return OpenAI(
        base_url=LLAMA_URL,
        api_key="local",
    )


def get_model_name():
    client = get_ai_client()
    response = client.models.list()

    if not response.data:
        raise RuntimeError("No local AI model is loaded.")

    return response.data[0].id


def parse_json(text: str):
    text = text.strip()

    # Remove markdown code fences.
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")

        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])

        raise ValueError(f"Model did not return valid JSON: {text[:500]}")


@app.get("/")
def root():
    return {
        "name": "TrailMate API",
        "status": "online",
        "ai": "local Qwen3",
    }


@app.get("/api/health")
def health():
    try:
        model = get_model_name()

        return {
            "status": "ok",
            "ai_configured": True,
            "ai": "local",
            "model": model,
        }

    except Exception as error:
        return {
            "status": "ok",
            "ai_configured": False,
            "error": str(error),
        }


@app.post("/api/adventure")
def create_adventure(request: AdventureRequest):
    client = get_ai_client()

    model = get_model_name()

    interests = ", ".join(request.interests) or "nature"

    prompt = f"""
/no_think

You are TrailMate, an outdoor adventure planner.

Create a safe outdoor adventure that helps the user spend
less time looking at their phone.

Location: {request.location}
Activity: {request.activity}
Duration: {request.duration} minutes
Difficulty: {request.difficulty}
Interests: {interests}

Return ONLY valid JSON.
Do not include explanations.
Do not use Markdown.
Do not include ```.

Use exactly this JSON structure:

{{
  "title": "Short adventure title",
  "description": "Short description",
  "duration_minutes": {request.duration},
  "route_idea": "Simple route idea without inventing specific trails",
  "missions": [
    {{
      "title": "Mission title",
      "description": "What the user should do"
    }}
  ],
  "things_to_notice": [
    "Thing to notice"
  ],
  "packing_list": [
    "Useful item"
  ],
  "safety": [
    "Safety advice"
  ],
  "phone_rule": "When the user should put their phone away"
}}

Requirements:

- Exactly 5 missions.
- Exactly 5 things_to_notice.
- Exactly 3 safety notes.
- Do not invent specific trail names.
- Do not invent precise distances.
- Do not suggest dangerous activities.
- Keep the adventure achievable within {request.duration} minutes.
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Return only valid JSON. Do not think aloud.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.4,
            max_tokens=1200,
        )

        message = response.choices[0].message

        # Qwen3 may expose reasoning separately.
        content = message.content or ""

        if not content.strip():
            reasoning = getattr(message, "reasoning_content", "") or ""
            raise ValueError(
                "Local Qwen returned no final answer. "
                f"Reasoning ended with: {reasoning[-300:]}"
            )

        adventure = parse_json(content)

        return {
            "success": True,
            "model": model,
            "source": "local",
            "adventure": adventure,
        }

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"AI request failed: {error}",
        )


@app.post("/api/journal")
def create_journal(request: JournalRequest):
    client = get_ai_client()
    model = get_model_name()

    missions = "\n".join(
        f"- {mission}" for mission in request.completed_missions
    )

    prompt = f"""
/no_think

You are TrailMate's Adventure Journal writer.

Write a short personal journal based ONLY on the information
provided by the user.

Adventure:
{request.adventure_title}

Location:
{request.location}

Duration:
{request.duration} minutes

Completed missions:
{missions or "None"}

Observations:
{request.observations or "None"}

Highlight:
{request.highlights or "None"}

Return Markdown.

Include:

# {request.adventure_title}

A short story about the adventure.

## What I noticed

Bullet points.

## Next time

One useful suggestion.

Never invent species, weather, locations, distances,
or experiences that the user did not provide.
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Write concise outdoor adventure journals. Do not think aloud.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.5,
            max_tokens=500,
        )

        journal = response.choices[0].message.content or ""

        if not journal.strip():
            raise ValueError("Local Qwen returned an empty journal.")

        return {
            "success": True,
            "model": model,
            "source": "local",
            "journal": journal,
        }

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Journal generation failed: {error}",
        )
