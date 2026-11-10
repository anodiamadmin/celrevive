import json
import logging
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.core.config import BACKEND_ROOT, get_settings
from app.schemas.questionnaire import (
    QuestionnaireAnalysis,
    SensitivityLevel,
    SkinType,
)
from app.services.genai_schema import genai_response_schema
from app.services.questionnaire_ai.system_prompt import QUESTIONNAIRE_AI_SYSTEM_PROMPT

logger = logging.getLogger("celrevive_backend.questionnaire_ai")
DETECTION_TEMPLATE_PATH = (
    BACKEND_ROOT.parent / "architecture" / "json" / "questionnaire_detection.json"
)
QUESTIONNAIRE_TEMPLATE_PATH = (
    BACKEND_ROOT.parent / "architecture" / "json" / "questionnaire_user_answer.json"
)
QUESTIONNAIRE_VERSION = "1.0"

SKIN_TYPE_BY_ANSWER: dict[str, SkinType] = {
    "Normal": "normal",
    "Dry": "dry",
    "Oily": "oily",
    "Combination/Oily": "combination_oily",
    "Sensitive": "sensitive",
    "Mature/Ageing": "mature",
    "Unsure": "unknown",
}
SENSITIVITY_BY_ANSWER: dict[str, SensitivityLevel] = {
    "Yes — highly sensitive/reactive": "high",
    "Yes — mildly sensitive": "mild",
    "No": "none",
    "Unsure": "unknown",
}


class QuestionnaireAIError(Exception):
    """The questionnaire analysis provider call failed."""


class QuestionnaireMalformedResponseError(Exception):
    """The provider response was invalid or did not match the output contract."""


def _read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise QuestionnaireAIError(f"Unable to load questionnaire template: {path.name}") from exc


def validate_questionnaire_payload(response_json: dict[str, Any]) -> dict[str, Any]:
    """Validate answers and return a canonical copy with untrusted labels removed."""
    template = _read_json(QUESTIONNAIRE_TEMPLATE_PATH)["questionnaire"]
    submitted = response_json.get("questionnaire")
    if not isinstance(submitted, dict) or not isinstance(submitted.get("sections"), list):
        raise ValueError("response_json must contain questionnaire.sections")
    if submitted.get("title") != template["title"]:
        raise ValueError("response_json questionnaire title does not match this version")

    def section_map(questionnaire: dict[str, Any]) -> dict[str, dict[str, Any]]:
        sections: dict[str, dict[str, Any]] = {}
        for section in questionnaire.get("sections", []):
            if not isinstance(section, dict):
                raise ValueError("Questionnaire sections must be objects")
            section_id = section.get("section_id")
            if not isinstance(section_id, str) or section_id in sections:
                raise ValueError("Questionnaire contains an invalid or duplicate section_id")
            if not isinstance(section.get("questions"), list):
                raise ValueError(f"{section_id} must contain a questions list")
            sections[section_id] = section
        return sections

    def question_map(questionnaire: dict[str, Any]) -> dict[str, dict[str, Any]]:
        questions: dict[str, dict[str, Any]] = {}
        for section in questionnaire.get("sections", []):
            for question in section.get("questions", []):
                if not isinstance(question, dict):
                    raise ValueError("Questionnaire questions must be objects")
                question_id = question.get("question_id")
                if not isinstance(question_id, str) or question_id in questions:
                    raise ValueError("Questionnaire contains an invalid or duplicate question_id")
                questions[question_id] = question
        return questions

    expected_sections = section_map(template)
    submitted_sections = section_map(submitted)
    if submitted_sections.keys() != expected_sections.keys():
        raise ValueError("response_json must include every questionnaire section")
    for section_id, definition in expected_sections.items():
        if submitted_sections[section_id].get("section_title") != definition.get("section_title"):
            raise ValueError(f"{section_id} has an unsupported section_title")

    expected_questions = question_map(template)
    submitted_questions = question_map(submitted)
    if submitted_questions.keys() != expected_questions.keys():
        raise ValueError("response_json must include every question from the questionnaire version")
    for section in template["sections"]:
        submitted_section = submitted_sections[section["section_id"]]
        section_questions = question_map({"sections": [submitted_section]})
        if section_questions.keys() != {
            question["question_id"] for question in section["questions"]
        }:
            raise ValueError(
                f"{section['section_id']} must contain its defined set of questions"
            )

    normalized_questions: dict[str, dict[str, Any]] = {}
    for question_id, definition in expected_questions.items():
        question = submitted_questions[question_id]
        for field in definition.keys() - {"user_response", "conditional_field"}:
            if question.get(field) != definition[field]:
                raise ValueError(f"{question_id} has an unsupported {field}")
        response = question.get("user_response")
        options = definition.get("options", [])
        question_type = definition.get("question_type")
        if question_type == "multi_select":
            if not isinstance(response, list) or not all(
                isinstance(value, str) and value in options for value in response
            ):
                raise ValueError(f"{question_id} must contain a list of valid options")
            if question_id in {"q2", "q6", "q8", "q9"} and not response:
                raise ValueError(f"{question_id} requires at least one selection")
            if len(response) != len(set(response)):
                raise ValueError(f"{question_id} contains duplicate selections")
            max_selections = definition.get("max_selections")
            if max_selections is not None and len(response) > max_selections:
                raise ValueError(f"{question_id} allows at most {max_selections} selections")
            if "None of the above" in response and len(response) > 1:
                raise ValueError(f"{question_id}: 'None of the above' cannot be combined")
            exclusive_options = {
                "q6": {"None", "Prefer not to say"},
                "q8": {"No", "Prefer not to say"},
                "q9": {"No recent treatments"},
            }.get(question_id, set())
            if len(response) > 1 and exclusive_options.intersection(response):
                raise ValueError(f"{question_id} cannot combine an exclusive option")
        else:
            if not isinstance(response, str) or response not in options:
                raise ValueError(f"{question_id} must contain one valid option")

        if question_type == "single_select_with_conditional_text":
            expected_conditional = definition.get("conditional_field", {})
            conditional = question.get("conditional_field")
            if not isinstance(conditional, dict):
                raise ValueError(f"{question_id} must include conditional_field")
            if any(
                conditional.get(field) != value
                for field, value in expected_conditional.items()
                if field != "user_text_response"
            ):
                raise ValueError(f"{question_id} has an unsupported conditional field")
            if response == expected_conditional.get("trigger_value"):
                details = conditional.get("user_text_response")
                if (
                    not isinstance(details, str)
                    or not details.strip()
                    or len(details) > 1000
                ):
                    raise ValueError(f"{question_id} requires conditional text for this answer")
            else:
                details = None
            normalized_questions[question_id] = {
                **definition,
                "user_response": response,
                "conditional_field": {
                    **expected_conditional,
                    "user_text_response": details,
                },
            }
        else:
            normalized_questions[question_id] = {
                **definition,
                "user_response": response,
            }

    normalized_sections = []
    for section in template["sections"]:
        normalized_sections.append(
            {
                "section_id": section["section_id"],
                "section_title": section["section_title"],
                "questions": [
                    normalized_questions[question["question_id"]]
                    for question in section["questions"]
                ],
            }
        )
    return {
        "questionnaire": {
            "title": template["title"],
            "sections": normalized_sections,
        }
    }


def _expected_skin_type(response_json: dict[str, Any]) -> SkinType:
    questions = _all_questions(response_json)
    answer = questions["q1"]["user_response"]
    return SKIN_TYPE_BY_ANSWER[answer]


def _expected_sensitivity(response_json: dict[str, Any]) -> SensitivityLevel:
    questions = _all_questions(response_json)
    answer = questions["q3"]["user_response"]
    return SENSITIVITY_BY_ANSWER[answer]


def _all_questions(response_json: dict[str, Any]) -> dict[str, dict[str, Any]]:
    questions: dict[str, dict[str, Any]] = {}
    for section in response_json["questionnaire"]["sections"]:
        questions.update(
            (question["question_id"], question)
            for question in section["questions"]
        )
    return questions


def _directly_supported_concern_ids(response_json: dict[str, Any]) -> set[str]:
    questions = _all_questions(response_json)
    concern_ids: set[str] = set()

    skin_type_concerns = {
        "Dry": {"SC0001"},
        "Oily": {"SC0010"},
        "Combination/Oily": {"SC0010"},
        "Sensitive": {"SC0004"},
        "Mature/Ageing": {"SC0011"},
    }
    concern_ids.update(
        skin_type_concerns.get(questions["q1"]["user_response"], set())
    )

    current_concern_ids = {
        "Dryness or dehydration": {"SC0001", "SC0002"},
        "Redness or irritation": {"SC0005", "SC2001"},
        "Acne or breakouts": {"SC0008", "SC0009"},
        "Oiliness": {"SC0010"},
        "Skin sensitivity/reactivity": {"SC0004", "SC0007"},
        "Rosacea": {"SC0006"},
        "Uneven skin tone or pigmentation": {"SC0012", "SC0013"},
        "Dullness": {"SC0015"},
        "Itching or flaking": {"SC2001"},
    }
    for answer in questions["q2"]["user_response"]:
        concern_ids.update(current_concern_ids.get(answer, set()))

    if questions["q3"]["user_response"] in {
        "Yes — highly sensitive/reactive",
        "Yes — mildly sensitive",
    }:
        concern_ids.update({"SC0004", "SC0007"})

    environmental_exposures = {
        "Air-conditioned indoor environment",
        "Outdoor sun exposure",
        "Urban/city pollution",
        "Dry heating environments",
        "Coastal/humid environment",
    }
    if (
        questions["q15"]["user_response"] != "Moderate"
        or questions["q16"]["user_response"] in environmental_exposures
    ):
        concern_ids.add("SC2002")

    return concern_ids


def call_questionnaire_ai(response_json: dict[str, Any]) -> tuple[dict[str, Any], QuestionnaireAnalysis]:
    response_json = validate_questionnaire_payload(response_json)
    template = _read_json(DETECTION_TEMPLATE_PATH)
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise QuestionnaireAIError("GEMINI_API_KEY is not configured")

    try:
        response = genai.Client(api_key=settings.GEMINI_API_KEY).models.generate_content(
            model=settings.QUESTIONNAIRE_AI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(
                            text=(
                                "Extract concerns from this submitted questionnaire. "
                                "Return every concern in the template:\n\n"
                                + json.dumps(
                                    {
                                        "questionnaire_user_answer": response_json,
                                        "questionnaire_detection_template": template,
                                    },
                                    ensure_ascii=False,
                                )
                            )
                        )
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=QUESTIONNAIRE_AI_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=genai_response_schema(QuestionnaireAnalysis),
                temperature=0.1,
            ),
        )
    except Exception as exc:
        logger.exception("Questionnaire AI API call failed")
        raise QuestionnaireAIError(str(exc)) from exc

    try:
        raw = json.loads(response.text)
        analysis = QuestionnaireAnalysis.model_validate(raw)
        template_ids = {
            entry["skin_concern_id"]
            for entry in template["questionnaire_skin_concerns"]
        }
        returned_ids = {
            entry.skin_concern_id
            for entry in analysis.questionnaire_skin_concerns
        }
        if returned_ids != template_ids or len(returned_ids) != len(
            analysis.questionnaire_skin_concerns
        ):
            raise ValueError("Response must contain each questionnaire concern exactly once")
        template_names = {
            entry["skin_concern_id"]: entry["skin_concern_name"]
            for entry in template["questionnaire_skin_concerns"]
        }
        if any(
            entry.skin_concern_name != template_names[entry.skin_concern_id]
            for entry in analysis.questionnaire_skin_concerns
        ):
            raise ValueError("Response concern names must match the supplied template")
        if analysis.skin_type != _expected_skin_type(response_json):
            raise ValueError("LLM skin_type does not match the submitted q1 answer")
        if analysis.sensitivity_level != _expected_sensitivity(response_json):
            raise ValueError("LLM sensitivity_level does not match the submitted q3 answer")
        directly_supported_ids = _directly_supported_concern_ids(response_json)
        for entry in analysis.questionnaire_skin_concerns:
            if entry.skin_concern_exists and entry.skin_concern_id not in directly_supported_ids:
                logger.warning(
                    "Clearing questionnaire concern unsupported by submitted answers "
                    "concern_id=%s",
                    entry.skin_concern_id,
                )
                entry.skin_concern_exists = False
                entry.confidence_score = 0
                entry.if_skin_concern_true_why = ""
    except (TypeError, json.JSONDecodeError, ValidationError, ValueError, KeyError) as exc:
        logger.error("Questionnaire AI response failed validation: %s", exc)
        raise QuestionnaireMalformedResponseError(str(exc)) from exc

    return raw, analysis
