import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from fastapi import HTTPException
import report_assistant as assistant


REPORT = {"report_id": "synthetic", "predicted_class": "Malignant", "malignant_probability": 0.4159,
          "benign_probability": 0.5841, "threshold_used": 0.2822265625}


def completion(text):
    return io.BytesIO(json.dumps({"choices": [{"message": {"content": text}}]}).encode())


class ReportAssistantTests(unittest.TestCase):
    @patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-only-key"}, clear=True)
    def test_free_openrouter_request_has_report_grounded_instructions(self):
        with patch.object(assistant.request, "urlopen", return_value=completion("This is a model score, not a diagnosis.")) as transport:
            reply = assistant.call_compatible_assistant("openrouter", REPORT, "Explain my report")
        req = transport.call_args.args[0]
        payload = json.loads(req.data)
        self.assertEqual(req.full_url, "https://openrouter.ai/api/v1/chat/completions")
        self.assertTrue(payload["model"].endswith(":free"))
        self.assertEqual(payload["messages"][0]["role"], "system")
        self.assertIn("NOT the", payload["messages"][0]["content"])
        self.assertIn('"threshold_used": 0.2822265625', payload["messages"][1]["content"])
        self.assertIn("model score", reply)

    @patch.dict("os.environ", {"OPENROUTER_API_KEY": "test", "OPENROUTER_MODEL": "paid/model"}, clear=True)
    def test_paid_openrouter_model_is_never_called(self):
        with patch.object(assistant.request, "urlopen") as transport:
            with self.assertRaises(HTTPException):
                assistant.call_compatible_assistant("openrouter", REPORT, "Explain")
            transport.assert_not_called()

    @patch.dict("os.environ", {"OPENROUTER_API_KEY": "test"}, clear=True)
    def test_rate_limit_tries_only_a_second_free_model(self):
        with patch.object(assistant.request, "urlopen", side_effect=[
            HTTPError("https://openrouter.ai", 429, "busy", {}, None), completion("A research-model output.")
        ]) as transport:
            self.assertEqual(assistant.call_compatible_assistant("openrouter", REPORT, "Explain"), "A research-model output.")
        self.assertEqual(transport.call_count, 2)
        self.assertTrue(all(json.loads(call.args[0].data)["model"].endswith(":free") for call in transport.call_args_list))

    @patch.dict("os.environ", {"GROQ_API_KEY": "test"}, clear=True)
    def test_groq_uses_its_own_endpoint(self):
        with patch.object(assistant.request, "urlopen", return_value=completion("A research-model output.")) as transport:
            assistant.call_compatible_assistant("groq", REPORT, "Explain")
        self.assertEqual(transport.call_args.args[0].full_url, "https://api.groq.com/openai/v1/chat/completions")

    @patch.dict("os.environ", {}, clear=True)
    def test_missing_provider_key_is_an_explicit_service_error(self):
        with self.assertRaises(HTTPException) as failure:
            assistant.configured_provider()
        self.assertEqual(failure.exception.status_code, 503)

    def test_unsafe_probability_statement_is_replaced(self):
        reply = assistant.sanitize_reply("There is a 41.59% probability that the lesion is malignant.")
        self.assertIn("not your probability", reply)
        self.assertNotIn("41.59%", reply)

    def test_hidden_reasoning_is_not_displayed(self):
        self.assertEqual(assistant.sanitize_reply("<think>internal text</think>Useful explanation."), "Useful explanation.")


if __name__ == "__main__":
    unittest.main()
