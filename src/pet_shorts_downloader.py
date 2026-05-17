#!/usr/bin/env python3
"""
YouTube 반려동물 숏폼 자동 다운로드 스크립트
의존성: yt-dlp   (pip install yt-dlp)
FFmpeg: mp4 병합에 필요

쿠키 우선순위:
  1. --browser chrome|firefox|edge|safari|brave|chromium  (자동 추출)
  2. --cookies /path/to/cookies.txt                       (Netscape 파일)
  3. 쿠키 없이 시도 (차단될 수 있음)

⚠️  Chrome 쿠키 추출 시 Chrome을 완전히 종료하세요.
    종료가 어려우면 --browser firefox 를 사용하세요.
"""

import os
import sys
import json
import time
import shutil
import platform
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# ── 설정 ─────────────────────────────────────────────────────────────────────

DEFAULT_QUERIES = [
    "강아지 귀여운 #shorts",
    "고양이 웃긴 #shorts",
    "반려동물 귀여운 순간 #shorts",
    "puppy cute #shorts",
    "cat funny #shorts",
]

DEFAULT_OUTPUT_DIR = "./pet_shorts"
MAX_DURATION       = 180     # Shorts 최대 길이(초)
MIN_VIEWS          = 0       # 최소 조회수 (0 = 필터 없음)
MAX_PER_QUERY      = 10      # 검색어당 최대 다운로드 수
MAX_TOTAL          = 50      # 전체 최대 다운로드 수
REQUEST_SLEEP      = 2.0     # 영상 간 딜레이(초)

BROWSER_PRIORITY = ["firefox", "chrome", "edge", "chromium", "brave", "safari", "opera"]

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

# ── 색상 출력 ─────────────────────────────────────────────────────────────────

class C:
    RESET = "\033[0m";  BOLD  = "\033[1m"
    RED   = "\033[91m"; GREEN = "\033[92m"
    YELLOW= "\033[93m"; CYAN  = "\033[96m"
    GRAY  = "\033[90m"

def info(m): print(f"{C.CYAN}[INFO]{C.RESET}  {m}")
def ok(m):   print(f"{C.GREEN}[OK]{C.RESET}    {m}")
def warn(m): print(f"{C.YELLOW}[WARN]{C.RESET}  {m}")
def err(m):  print(f"{C.RED}[ERR]{C.RESET}   {m}", file=sys.stderr)
def dim(m):  print(f"{C.GRAY}{m}{C.RESET}")

# ── yt-dlp 설치 확인 ──────────────────────────────────────────────────────────

def ensure_ytdlp():
    try:
        import yt_dlp  # noqa
    except ImportError:
        warn("yt-dlp 미설치 → pip 자동 설치 시도")
        r = subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp", "-q"],
                           capture_output=True)
        if r.returncode != 0:
            err("설치 실패. 수동으로 'pip install yt-dlp' 를 실행하세요.")
            sys.exit(1)
        ok("yt-dlp 설치 완료")

# ── 브라우저 자동 감지 ────────────────────────────────────────────────────────

def detect_browser():
    system = platform.system()
    mac_apps = {
        "firefox":  "/Applications/Firefox.app",
        "chrome":   "/Applications/Google Chrome.app",
        "edge":     "/Applications/Microsoft Edge.app",
        "safari":   "/Applications/Safari.app",
        "brave":    "/Applications/Brave Browser.app",
        "chromium": "/Applications/Chromium.app",
    }
    bins = {
        "firefox":  ["firefox", "firefox-esr"],
        "chrome":   ["google-chrome", "chrome", "google-chrome-stable"],
        "edge":     ["microsoft-edge", "msedge"],
        "chromium": ["chromium", "chromium-browser"],
        "brave":    ["brave-browser", "brave"],
        "opera":    ["opera"],
        "safari":   [],
    }
    for browser in BROWSER_PRIORITY:
        if browser == "safari" and system != "Darwin":
            continue
        for b in bins.get(browser, []):
            if shutil.which(b):
                return browser
        if system == "Darwin" and browser in mac_apps:
            if Path(mac_apps[browser]).exists():
                return browser
    return None

# ── 쿠키 옵션 결정 ────────────────────────────────────────────────────────────

def resolve_cookie_opts(browser_arg, file_arg):
    # cookiesfrombrowser 튜플: (browser_name, profile, keyring, container)
    if browser_arg:
        parts = browser_arg.split(":", 1)
        bname = parts[0].strip()
        prof  = parts[1].strip() if len(parts) > 1 else None
        info(f"쿠키: 브라우저 = {bname}" + (f"  프로필 = {prof}" if prof else ""))
        return {"cookiesfrombrowser": (bname, prof, None, None)}

    if file_arg:
        p = Path(file_arg).expanduser()
        if not p.exists():
            err(f"쿠키 파일 없음: {p}")
            sys.exit(1)
        info(f"쿠키: 파일 = {p}")
        return {"cookiefile": str(p)}

    detected = detect_browser()
    if detected:
        info(f"쿠키: 자동 감지 → {detected}")
        return {"cookiesfrombrowser": (detected, None, None, None)}

    warn("브라우저 미감지. 쿠키 없이 시도합니다.")
    warn("해결: --browser chrome  또는  --cookies cookies.txt")
    return {}

# ── 공통 yt-dlp 옵션 ──────────────────────────────────────────────────────────

def base_opts(cookie_opts, verbose=False):
    return {
        **cookie_opts,
        "quiet":                   not verbose,
        "no_warnings":             not verbose,
        "http_headers":            {"User-Agent": UA},
        "retries":                 5,
        "fragment_retries":        5,
        "extractor_retries":       3,
        "sleep_interval":          1,
        "max_sleep_interval":      3,
        "sleep_interval_requests": 1,
    }

# ── 봇 차단 에러 판별 ─────────────────────────────────────────────────────────

def is_bot_error(e):
    msg = str(e).lower()
    return "sign in" in msg or "bot" in msg or "confirm" in msg

# ── Step 1: 검색으로 ID 목록 수집 (extract_flat — 빠름) ───────────────────────

def fetch_ids(query, n, cookie_opts):
    import yt_dlp

    opts = {
        **base_opts(cookie_opts),
        "extract_flat": "in_playlist",
        "skip_download": True,
        "playlistend": n * 4,
    }
    info(f"검색: {C.BOLD}{query}{C.RESET}")
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            res = ydl.extract_info(f"ytsearch{n * 4}:{query}", download=False)
        entries = (res.get("entries") or []) if res else []
        return [e for e in entries if e and e.get("id")]
    except Exception as e:
        if is_bot_error(e):
            err(f"봇 차단 — 쿠키를 확인하세요.")
        else:
            err(f"검색 실패: {e}")
        return []

# ── Step 2: 개별 영상 메타 (duration 확보) ────────────────────────────────────
# extract_flat 모드에서는 duration=None 인 경우가 많으므로
# 개별 URL 로 메타를 재조회해서 duration 을 확인한다.

def fetch_meta(vid_id, cookie_opts):
    import yt_dlp

    opts = {**base_opts(cookie_opts), "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(
                f"https://www.youtube.com/watch?v={vid_id}", download=False)
    except Exception as e:
        if is_bot_error(e):
            err(f"봇 차단 ({vid_id})")
        else:
            dim(f"  메타 실패 ({vid_id}): {e}")
        return None

# ── Step 3: 다운로드 ──────────────────────────────────────────────────────────

def download_video(vid_id, out_dir, cookie_opts):
    import yt_dlp

    tmpl = str(out_dir / "%(upload_date)s_%(id)s_%(title).60s.%(ext)s")
    opts = {
        **base_opts(cookie_opts),
        "outtmpl":             tmpl,
        "format":              "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
        "merge_output_format": "mp4",
        "postprocessors": [{"key": "FFmpegVideoConvertor", "preferedformat": "mp4"}],
    }

    for url in [
        f"https://www.youtube.com/shorts/{vid_id}",
        f"https://www.youtube.com/watch?v={vid_id}",
    ]:
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
            return True
        except Exception as e:
            if is_bot_error(e):
                err("봇 차단 — 쿠키를 확인하세요.")
                return False
            dim(f"  재시도: {e}")

    return False

# ── 로그 저장 ─────────────────────────────────────────────────────────────────

def save_log(out_dir, results):
    path = out_dir / "download_log.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total":   len(results),
            "success": sum(1 for r in results if r.get("success")),
            "videos":  results,
        }, f, ensure_ascii=False, indent=2)
    ok(f"로그: {path}")

# ── 메인 ──────────────────────────────────────────────────────────────────────

def run(queries, output_dir, max_per_q, max_total, min_views,
        dry_run, browser, cookies):

    ensure_ytdlp()
    cookie_opts = resolve_cookie_opts(browser, cookies)

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    info(f"저장 폴더: {out.resolve()}")
    print()

    total_dl = 0
    seen_ids = set()
    results  = []

    for query in queries:
        if total_dl >= max_total:
            warn("최대 다운로드 수 도달.")
            break

        entries = fetch_ids(query, max_per_q, cookie_opts)
        if not entries:
            warn("  검색 결과 없음.")
            print()
            continue

        info(f"  검색 결과 {len(entries)}개")
        count_q = 0

        for entry in entries:
            if total_dl >= max_total or count_q >= max_per_q:
                break

            vid_id = entry.get("id", "")
            if not vid_id or vid_id in seen_ids:
                continue
            seen_ids.add(vid_id)

            # duration 확인 — extract_flat 에서는 None 인 경우가 많아 개별 재조회
            duration = entry.get("duration")
            title    = (entry.get("title") or vid_id)[:60]

            if duration is None:
                meta = fetch_meta(vid_id, cookie_opts)
                if not meta:
                    results.append({"id": vid_id, "success": False, "reason": "meta_fail"})
                    continue
                duration = meta.get("duration") or 0
                title    = (meta.get("title") or title)[:60]
                views    = meta.get("view_count") or 0
            else:
                views = entry.get("view_count") or 0

            # 길이 필터
            if duration and duration > MAX_DURATION:
                dim(f"  skip (길이 {duration}s > {MAX_DURATION}s): {title[:45]}")
                continue

            # 조회수 필터
            if min_views > 0 and views < min_views:
                dim(f"  skip (조회수 {views:,} < {min_views:,}): {title[:45]}")
                continue

            print(f"\n  [{total_dl+1}] {C.BOLD}{title}{C.RESET}")
            dim(f"       ID: {vid_id}  길이: {duration}s  조회수: {views:,}")

            if dry_run:
                ok("  (dry-run) 스킵")
                results.append({"id": vid_id, "title": title, "success": True, "dry_run": True})
                total_dl += 1; count_q += 1
                continue

            success = download_video(vid_id, out, cookie_opts)
            if success:
                ok("  완료")
                total_dl += 1; count_q += 1
            else:
                err("  실패")

            results.append({
                "id": vid_id, "title": title,
                "duration": duration, "views": views,
                "query": query, "success": success,
            })

            time.sleep(REQUEST_SLEEP)

        print()

    ok(f"완료: {total_dl}개 다운로드 → {out.resolve()}")
    save_log(out, results)

# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="YouTube 반려동물 숏폼 자동 다운로드",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
쿠키 사용법 (봇 차단 해결):
  --browser firefox             Firefox 쿠키 자동 추출 (가장 안정적)
  --browser chrome              Chrome 쿠키 자동 추출 (Chrome 완전 종료 후)
  --browser "chrome:Default"    Chrome 특정 프로필
  --cookies ~/cookies.txt       Netscape 형식 쿠키 파일

쿠키 파일 내보내기:
  Chrome 확장: "Get cookies.txt LOCALLY"

사용 예:
  python pet_shorts_downloader.py --browser firefox
  python pet_shorts_downloader.py --browser chrome -n 5 -o ./videos
  python pet_shorts_downloader.py -q "강아지 귀여운" "고양이 웃긴" --browser firefox
  python pet_shorts_downloader.py --dry-run --browser chrome
        """,
    )
    p.add_argument("-q", "--queries", nargs="+", default=DEFAULT_QUERIES, metavar="QUERY")
    p.add_argument("-o", "--output",  default=DEFAULT_OUTPUT_DIR, metavar="DIR")
    p.add_argument("-n", "--max-per-query", type=int, default=MAX_PER_QUERY, metavar="N")
    p.add_argument("--max-total",  type=int, default=MAX_TOTAL,  metavar="N")
    p.add_argument("--min-views",  type=int, default=MIN_VIEWS,  metavar="N")
    p.add_argument("--browser",  metavar="BROWSER[:PROFILE]",
                   help="쿠키 소스 브라우저 (firefox|chrome|edge|safari|brave)")
    p.add_argument("--cookies",  metavar="FILE",
                   help="Netscape 형식 쿠키 파일 경로")
    p.add_argument("--dry-run", action="store_true",
                   help="다운로드 없이 검색 결과만 확인")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        queries    = args.queries,
        output_dir = args.output,
        max_per_q  = args.max_per_query,
        max_total  = args.max_total,
        min_views  = args.min_views,
        dry_run    = args.dry_run,
        browser    = args.browser,
        cookies    = args.cookies,
    )
