"""Loopback-only, deterministic provider for an explicit local full-stack check.

The UI never imports this fixture. Start the real FastAPI service separately
with OPENROUTER_API_URL=http://127.0.0.1:8131/chat/completions and a fixture key.
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/chat/completions":
            self.send_error(404)
            return
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        content = request["messages"][-1]["content"]
        response = json.dumps({
            "id": "local-provider-fixture",
            "choices": [{"message": {"role": "assistant", "content": f"Локальная проверка: {content}"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        }, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8131), Handler).serve_forever()
