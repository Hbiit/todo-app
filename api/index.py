"""Vercel Serverless Function entrypoint for Taskflow FastAPI."""
import os
import sys

# Ensure backend directory is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(root_dir, "backend")

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from main import app  # noqa: E402
