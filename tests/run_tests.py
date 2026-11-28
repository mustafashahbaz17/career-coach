"""
Career Coach test runner (A10 evidence).

Signs in to Supabase Auth as the test student, sends each test case to a LIVE
n8n webhook, and writes one CSV row per case to tests/results/.

Safe by default:
  - Without --run it only does a PLAN: it signs in, checks the cases, and shows
    how many runs would count toward the monthly limit. No webhook is called.
  - With --run it asks you to type YES first (or pass --yes).

Secrets never go in the repo, in the CSV or on screen. They are read from
environment variables (or the website's gitignored .env / .env.local):
  TEST_EMAIL, TEST_PASSWORD        the test student's login
  VITE_SUPABASE_ANON_KEY           the website's publishable key
  N8N_API_KEY                      optional, used to read the workflow version

Only the Python standard library is used (no installs).
Run from the repo root:  py tests\\run_tests.py onboard-tracks
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SUPABASE_URL = "https://hlslkrjuaciplpeplpay.supabase.co"
N8N_BASE = "https://n8n.devplusops.com"
REPO = Path(__file__).resolve().parent.parent
CASES_DIR = REPO / "tests" / "cases"
RESULTS_DIR = REPO / "tests" / "results"

# Per-workflow settings, matching the Shared contracts.
WORKFLOWS = {
    "onboard-tracks": {"cases": "onboard_tracks.csv", "timeout": 60, "uses_apify": False},
    "linkedin-import": {"cases": "linkedin_import.csv", "timeout": 90, "uses_apify": True},
}

RESULT_COLUMNS = [
    "id", "workflow", "input", "expected", "actual", "pass", "http_status",
    "latency_ms", "run_date", "workflow_id", "workflow_version", "workflow_updated_at", "notes",
]


# ---------------------------------------------------------------- config / secrets

def read_dotenv_value(name):
    """Look for NAME in the website's gitignored .env.local / .env (never printed)."""
    for fname in (".env.local", ".env"):
        path = REPO / fname
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def need(name, hint):
    value = os.environ.get(name) or read_dotenv_value(name)
    if not value:
        sys.exit(f"Missing {name}. {hint}")
    return value


# ---------------------------------------------------------------- HTTP helpers

def http(method, url, headers=None, body=None, timeout=30):
    """Return (status, parsed_json_or_text, latency_ms). Never raises on HTTP errors."""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    except (urllib.error.URLError, TimeoutError) as e:
        return None, f"network error: {getattr(e, 'reason', e)}", int((time.monotonic() - start) * 1000)
    latency = int((time.monotonic() - start) * 1000)
    text = raw.decode("utf-8", errors="replace")
    try:
        return status, json.loads(text) if text else None, latency
    except json.JSONDecodeError:
        return status, text, latency


class Supabase:
    def __init__(self, anon_key):
        self.anon_key = anon_key
        self.token = None
        self.user_id = None

    def sign_in(self, email, password):
        status, data, _ = http(
            "POST", f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": self.anon_key}, body={"email": email, "password": password},
        )
        if status != 200 or not isinstance(data, dict) or "access_token" not in data:
            # Show only the error message, never the request or any token.
            msg = data.get("error_description") or data.get("msg") if isinstance(data, dict) else data
            sys.exit(f"Sign-in failed (HTTP {status}): {msg}")
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]

    def _headers(self, extra=None):
        h = {"apikey": self.anon_key, "Authorization": f"Bearer {self.token}"}
        h.update(extra or {})
        return h

    def get(self, path):
        status, data, _ = http("GET", f"{SUPABASE_URL}/rest/v1/{path}", headers=self._headers())
        if status != 200:
            sys.exit(f"Supabase read failed for {path.split('?')[0]} (HTTP {status}): {data}")
        return data

    def replace_quiz_answers(self, rows):
        """Delete the test student's own quiz answers, then insert the case's answers."""
        status, data, _ = http(
            "DELETE", f"{SUPABASE_URL}/rest/v1/quiz_responses?user_id=eq.{self.user_id}",
            headers=self._headers({"Prefer": "return=minimal"}),
        )
        if status not in (200, 204):
            return f"could not clear old quiz answers (HTTP {status}): {data}"
        if not rows:
            return None
        status, data, _ = http(
            "POST", f"{SUPABASE_URL}/rest/v1/quiz_responses",
            headers=self._headers({"Prefer": "return=minimal"}), body=rows,
        )
        if status not in (200, 201, 204):
            return f"could not save quiz answers (HTTP {status}): {data}"
        return None


# ---------------------------------------------------------------- n8n version

def workflow_version(name):
    """Find the ACTIVE workflow with this name and return (id, versionId, updatedAt)."""
    key = os.environ.get("N8N_API_KEY")
    if not key:
        return "unknown", "unknown (N8N_API_KEY not set)", ""
    status, data, _ = http(
        "GET", f"{N8N_BASE}/api/v1/workflows?limit=250",
        headers={"X-N8N-API-KEY": key, "Accept": "application/json"},
    )
    if status != 200 or not isinstance(data, dict):
        return "unknown", f"unknown (n8n API HTTP {status})", ""
    live = [w for w in data.get("data", []) if w.get("name") == name and w.get("active")]
    if len(live) != 1:
        return "unknown", f"unknown ({len(live)} active workflows named {name})", ""
    w = live[0]
    return w["id"], w.get("versionId") or "unknown", w.get("updatedAt", "")


# ---------------------------------------------------------------- cases

def load_cases(workflow, only):
    path = CASES_DIR / WORKFLOWS[workflow]["cases"]
    with path.open(newline="", encoding="utf-8-sig") as f:
        cases = [row for row in csv.DictReader(f) if (row.get("id") or "").strip()]
    if only:
        wanted = {x.strip() for x in only.split(",")}
        cases = [c for c in cases if c["id"].strip() in wanted]
    return cases


def quiz_rows_for(case, user_id, kinds, options):
    """Turn the case's answers_json into quiz_responses rows. Returns (rows, problems)."""
    try:
        answers = json.loads(case.get("answers_json") or "{}")
    except json.JSONDecodeError as e:
        return [], [f"answers_json is not valid JSON: {e}"]
    rows, problems = [], []
    for qid, value in answers.items():
        kind = kinds.get(qid)
        if kind is None:
            problems.append(f"{qid} is not an active quiz question")
        elif kind == "text":
            if str(value).strip():
                rows.append({"user_id": user_id, "question_id": qid, "text_answer": str(value)})
        else:
            keys = value if isinstance(value, list) else [value]
            if kind == "single" and len(keys) != 1:
                problems.append(f"{qid} takes exactly one option")
            for k in keys:
                if (qid, k) not in options:
                    problems.append(f"{qid} has no option '{k}'")
                rows.append({"user_id": user_id, "question_id": qid, "option_key": k})
    return rows, problems


def expected_text(workflow, case):
    if (case.get("expected_code") or "").strip():
        return f"code={case['expected_code'].strip()}"
    if workflow == "onboard-tracks":
        if (case.get("kind") or "").strip().lower() == "mixed":
            return "needs_followup=true"
        return f"{case.get('expected_track', '').strip()} in top 3"
    fields = ["university", "degree", "major", "grad_year", "experience_count"]
    return "; ".join(f"{f}={case.get('expected_' + f, '').strip()}" for f in fields
                     if (case.get("expected_" + f) or "").strip())


def norm(v):
    return " ".join(str(v).strip().lower().split()) if v is not None else ""


def judge(workflow, case, status, reply):
    """Return (pass_bool, note)."""
    if not isinstance(reply, dict):
        return False, "reply was not JSON"
    want_code = (case.get("expected_code") or "").strip()
    if want_code:
        got = reply.get("code") if reply.get("ok") is False else "ok"
        return got == want_code, f"got code={got}"
    if reply.get("ok") is not True:
        return False, f"failed with code={reply.get('code')}"

    if workflow == "onboard-tracks":
        tracks = reply.get("tracks") or []
        keys = [t.get("track_key") for t in tracks if isinstance(t, dict)]
        if len(keys) != 3:
            return False, f"expected exactly 3 tracks, got {len(keys)}"
        if (case.get("kind") or "").strip().lower() == "mixed":
            return reply.get("needs_followup") is True, f"needs_followup={reply.get('needs_followup')}"
        want = (case.get("expected_track") or "").strip()
        return want in keys, f"top 3 = {', '.join(keys)}"

    # linkedin-import: every filled-in expected field must match
    mapped = reply.get("mapped") or {}
    misses = []
    for f in ["university", "degree", "major", "grad_year"]:
        want = (case.get("expected_" + f) or "").strip()
        if want and norm(mapped.get(f)) != norm(want):
            misses.append(f"{f}: got {mapped.get(f)!r}")
    want_n = (case.get("expected_experience_count") or "").strip()
    if want_n and len(mapped.get("experience") or []) != int(want_n):
        misses.append(f"experience_count: got {len(mapped.get('experience') or [])}")
    return not misses, "; ".join(misses) or "all expected fields match"


def input_text(workflow, case):
    if workflow == "onboard-tracks":
        return case.get("answers_json", "")
    return case.get("linkedin_url", "")


# ---------------------------------------------------------------- main

def main():
    p = argparse.ArgumentParser(description="Run Career Coach test cases against the live n8n webhooks.")
    p.add_argument("workflow", choices=sorted(WORKFLOWS))
    p.add_argument("--run", action="store_true", help="actually call the live webhook (default: plan only)")
    p.add_argument("--yes", action="store_true", help="skip the typed YES confirmation (use only after agreeing)")
    p.add_argument("--only", help="comma-separated case ids to run")
    p.add_argument("--max", type=int, help="run at most this many cases")
    args = p.parse_args()

    cfg = WORKFLOWS[args.workflow]
    anon = need("VITE_SUPABASE_ANON_KEY",
                "Set it to the website's publishable key (same value as in Vercel), "
                "e.g. in a gitignored .env.local at the repo root.")
    email = need("TEST_EMAIL", "Set the test student's email as an environment variable.")
    password = need("TEST_PASSWORD", "Set the test student's password as an environment variable.")

    cases = load_cases(args.workflow, args.only)
    if args.max is not None:
        cases = cases[: args.max]
    if not cases:
        sys.exit(f"No cases to run in tests/cases/{cfg['cases']}.")

    sb = Supabase(anon)
    sb.sign_in(email, password)
    print(f"Signed in as the test student (user id {sb.user_id[:8]}...).")

    # Check every case before anything is sent.
    kinds = options = None
    problems = {}
    if args.workflow == "onboard-tracks":
        kinds = {q["id"]: q["kind"] for q in sb.get("quiz_questions?select=id,kind")}
        options = {(o["question_id"], o["key"]) for o in sb.get("quiz_options?select=question_id,key")}
        for c in cases:
            _, probs = quiz_rows_for(c, sb.user_id, kinds, options)
            if probs:
                problems[c["id"]] = probs
    if problems:
        for cid, probs in problems.items():
            print(f"  case {cid}: " + "; ".join(probs))
        sys.exit("Fix the cases above first. Nothing was sent.")

    plan = (sb.get(f"profiles?select=plan&id=eq.{sb.user_id}") or [{}])[0].get("plan", "free")
    limit_rows = sb.get(f"plan_limits?select=monthly_limit&plan=eq.{plan}&feature=eq.{args.workflow}")
    limit = limit_rows[0]["monthly_limit"] if limit_rows else 0
    usage_rows = sb.get(f"monthly_usage?select=runs&feature=eq.{args.workflow}&user_id=eq.{sb.user_id}")
    used = usage_rows[0]["runs"] if usage_rows else 0
    wf_id, wf_version, wf_updated = workflow_version(args.workflow)

    print(f"\nPLAN for {args.workflow}")
    print(f"  live workflow:   id {wf_id}, version {wf_version}, updated {wf_updated}")
    print(f"  cases:           {len(cases)}")
    print(f"  test account:    plan '{plan}', used {used} of {limit} this month")
    print(f"  allowance left:  {max(limit - used, 0)} successful runs (only successes count)")
    if len(cases) > max(limit - used, 0):
        print("  WARNING: more cases than allowance left; later cases will get limit_reached.")
    if cfg["uses_apify"]:
        print("  COST:            every case may call Apify (paid) and the model.")
    else:
        print("  COST:            every case calls the model once (or twice on a retry).")
    if args.workflow == "onboard-tracks":
        print("  SIDE EFFECT:     before each case, the test student's saved quiz answers are deleted")
        print("                   and replaced with that case's answers.")

    if not args.run:
        print("\nPlan only. Nothing was sent. Add --run to call the live webhook.")
        return

    if not args.yes:
        if not sys.stdin.isatty():
            sys.exit("Refusing to run without a typed YES. Pass --yes only after agreeing to the run.")
        if input("\nType YES to call the live webhook: ").strip() != "YES":
            sys.exit("Cancelled. Nothing was sent.")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = RESULTS_DIR / f"{args.workflow}_{stamp}.csv"
    url = f"{N8N_BASE}/webhook/{args.workflow}"
    passed = 0

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=RESULT_COLUMNS)
        writer.writeheader()
        for i, case in enumerate(cases, 1):
            note = ""
            if args.workflow == "onboard-tracks":
                rows, _ = quiz_rows_for(case, sb.user_id, kinds, options)
                err = sb.replace_quiz_answers(rows)
                if err:
                    status, reply, latency, ok, note = None, None, 0, False, err
            if not note:
                body = {} if args.workflow == "onboard-tracks" else {"linkedin_url": case.get("linkedin_url", "")}
                status, reply, latency = http(
                    "POST", url, timeout=cfg["timeout"], body=body,
                    headers={"Authorization": f"Bearer {sb.token}", "Accept": "application/json"},
                )
                ok, note = judge(args.workflow, case, status, reply)
            passed += ok
            writer.writerow({
                "id": case["id"], "workflow": args.workflow,
                "input": input_text(args.workflow, case),
                "expected": expected_text(args.workflow, case),
                "actual": json.dumps(reply, ensure_ascii=False) if isinstance(reply, (dict, list)) else (reply or ""),
                "pass": "yes" if ok else "no",
                "http_status": status if status is not None else "",
                "latency_ms": latency,
                "run_date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "workflow_id": wf_id, "workflow_version": wf_version, "workflow_updated_at": wf_updated,
                "notes": " | ".join(x for x in [note, case.get("notes", "")] if x),
            })
            f.flush()
            print(f"  [{i}/{len(cases)}] {case['id']}: {'PASS' if ok else 'FAIL'} ({note})")
            if isinstance(reply, dict) and reply.get("code") == "limit_reached" \
                    and (case.get("expected_code") or "").strip() != "limit_reached":
                print("  Monthly limit reached, so the remaining cases were not sent.")
                break

    print(f"\nPassed {passed} of {i}. Results: {out_path.relative_to(REPO)}")


if __name__ == "__main__":
    main()
