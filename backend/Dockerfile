# Connectly API (FastAPI)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first: this layer stays cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code (changes most often, so it comes last).
COPY . .

# Run as an unprivileged user, not root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

# Hosting platforms (e.g. Render) tell the app which port to use via $PORT; 3001 otherwise.
ENV PORT=3001
EXPOSE 3001

# Container health: is the API answering?
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.environ.get('PORT','3001'), timeout=4).status == 200 else 1)"

# 0.0.0.0 so Docker's port forwarding can reach the app. "exec" makes uvicorn the main
# process so it receives stop signals; --forwarded-allow-ips trusts the host's HTTPS proxy.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
