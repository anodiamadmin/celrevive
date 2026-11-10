from google.genai import types

from app.schemas.formulation import FormulationRecommendation
from app.schemas.questionnaire import QuestionnaireAnalysis
from app.schemas.visual_ai import VisualAIResponse
from app.services.genai_schema import genai_response_schema


def test_llm_response_schemas_use_google_genai_compatible_schema_types():
    for model in (
        QuestionnaireAnalysis,
        FormulationRecommendation,
        VisualAIResponse,
    ):
        schema = genai_response_schema(model)

        assert isinstance(schema, types.Schema)

        def verify_supported_schema(node: dict) -> None:
            assert "additionalProperties" not in node
            assert "$ref" not in node
            assert "$defs" not in node
            assert "default" not in node
            for property_schema in node.get("properties", {}).values():
                verify_supported_schema(property_schema)
            if "items" in node:
                verify_supported_schema(node["items"])
            for variant in node.get("any_of", []):
                verify_supported_schema(variant)

        verify_supported_schema(schema.model_dump(by_alias=True, exclude_none=True))
