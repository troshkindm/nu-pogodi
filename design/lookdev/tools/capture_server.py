import base64
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'captures')
os.makedirs(OUT, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        name = os.path.basename(body['name'])
        data = body['data'].split(',', 1)[1]
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(base64.b64decode(data))
        if 'meta' in body:
            with open(os.path.join(OUT, name + '.json'), 'w') as f:
                json.dump(body['meta'], f)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')


ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 5502), Handler).serve_forever()
