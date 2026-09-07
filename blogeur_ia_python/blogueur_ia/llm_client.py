import json
import re
import anthropic

from blogueur_ia.config import settings

_client = anthropic.Anthropic(api_key=settings.llm_api_key)


def _extraire_json(texte: str) -> dict:
    texte = re.sub(r"^```json\s*|\s*```$", "", texte.strip(), flags=re.MULTILINE)
    return json.loads(texte)


class LLMClient:
    """Wrapper minimal autour de l'API Anthropic. Remplaçable par un autre
    provider en réimplémentant ces trois méthodes avec la même signature."""

    def chat(self, user_message: str, system_prompt: str = "", temperature: float = 0.7) -> str:
        resp = _client.messages.create(
            model=settings.llm_model,
            max_tokens=4096,
            system=system_prompt,
            temperature=temperature,
            messages=[{"role": "user", "content": user_message}],
        )
        return "".join(block.text for block in resp.content if block.type == "text")

    def chat_json(self, user_message: str, system_prompt: str = "", temperature: float = 0.7) -> dict:
        texte = self.chat(
            user_message=user_message + "\n\nRéponds UNIQUEMENT en JSON strict, sans texte autour.",
            system_prompt=system_prompt,
            temperature=temperature,
        )
        try:
            return _extraire_json(texte)
        except json.JSONDecodeError:
            # Une relance de correction plutôt qu'un crash sur un JSON mal formé
            corrige = self.chat(
                user_message=f"Le texte suivant devait être du JSON strict mais ne l'est pas. "
                              f"Renvoie UNIQUEMENT le JSON corrigé, rien d'autre :\n{texte}",
                system_prompt=system_prompt,
                temperature=0.2,
            )
            return _extraire_json(corrige)