from typing import Any

from google.genai import types
from pydantic import BaseModel


_SCHEMA_KEY_MAP = {
    "anyOf": "any_of",
    "maxItems": "max_items",
    "maxLength": "max_length",
    "maxProperties": "max_properties",
    "minItems": "min_items",
    "minLength": "min_length",
    "minProperties": "min_properties",
    "propertyOrdering": "property_ordering",
}
_IGNORED_SCHEMA_KEYS = {
    "$defs",
    "$schema",
    "$id",
    "additionalProperties",
    "default",
}
_SUPPORTED_SCHEMA_KEYS = set(types.Schema.model_fields)


def genai_response_schema(model: type[BaseModel]) -> types.Schema:
    """Convert Pydantic JSON Schema to the subset accepted by google-genai."""
    json_schema = model.model_json_schema()
    definitions = json_schema.get("$defs", {})

    def convert(node: Any) -> Any:
        if isinstance(node, list):
            return [convert(item) for item in node]
        if not isinstance(node, dict):
            return node

        reference = node.get("$ref")
        if reference is not None:
            prefix = "#/$defs/"
            if not reference.startswith(prefix) or reference[len(prefix):] not in definitions:
                raise ValueError(f"Unsupported JSON Schema reference: {reference}")
            return convert(definitions[reference[len(prefix):]])

        converted: dict[str, Any] = {}
        for key, value in node.items():
            if key in _IGNORED_SCHEMA_KEYS:
                continue
            genai_key = _SCHEMA_KEY_MAP.get(key, key)
            if genai_key not in _SUPPORTED_SCHEMA_KEYS:
                raise ValueError(f"Unsupported Pydantic JSON Schema keyword: {key}")
            if key == "properties":
                converted[genai_key] = {
                    property_name: convert(property_schema)
                    for property_name, property_schema in value.items()
                }
            else:
                converted[genai_key] = convert(value)
        return converted

    return types.Schema.model_validate(convert(json_schema))
