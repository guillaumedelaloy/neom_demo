from api.services.skills_loader import get_catalogue_text, load_skills_markdown


def test_skills_markdown_contains_global_rules_section():
    load_skills_markdown.cache_clear()
    text = load_skills_markdown()
    assert "## Global Operating Rules" in text


def test_skills_markdown_contains_tool_guidance_section():
    load_skills_markdown.cache_clear()
    text = load_skills_markdown()
    assert "## Available Tooling Guidance" in text
    assert "`search_documents`" in text


def test_catalogue_text_is_optional_markdown_appendix():
    text = get_catalogue_text()
    assert isinstance(text, str)
