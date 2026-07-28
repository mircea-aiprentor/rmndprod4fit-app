import os, json, urllib.request

base = os.environ["INTEGRATION_PROXY_URL"]
job_id = "d5351c2e-25e4-4e01-8ea5-fa49c1e6c724"
key = "sk-emergent-dD7C8Cd6002Eb89C9B"
req = urllib.request.Request(
    base + "/stripe/sandboxes",
    data=json.dumps({"job_id": job_id}).encode(),
    headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as r:
    sandbox = json.load(r)

print(json.dumps({
    "sandbox_secret_key": sandbox.get("sandbox_secret_key"),
    "sandbox_publishable_key": sandbox.get("sandbox_publishable_key"),
    "sandbox_account_id": sandbox.get("sandbox_account_id"),
    "preview_webhook_secret": sandbox.get("preview_webhook_secret"),
    "onboarding_url": sandbox.get("onboarding_url"),
}, indent=2))
