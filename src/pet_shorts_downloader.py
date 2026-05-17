#!/usr/bin/env python3
"""
YouTube 반려동물 숏폼 자동 다운로드 스크립트
의존성: yt-dlp, requests
설치: pip install yt-dlp requests
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

# ── 설정 ─────────────────────────────────────────────────────────────────────

DEFAULT_QUERIES = [
    "강아지 귀여운 shorts",
    "고양이 웃긴 shorts",
    "반려동물 귀여운 순간 shorts",
    "puppy funny shorts",
    "cat cute shorts",
]

DEFAULT_OUTPUT_DIR = "./pet_shorts"
MAX_DURATION = 180       # Shorts 최대 길이(초) — 안전 마진 포함
MIN_VIEWS = 10_000       # 최소 조회수 필터 (0 = 필터 없음)
MAX_PER_QUERY = 10       # 검색어당 최대 다운로드 수
MAX_TOTAL = 50           # 전체 최대 다운로드 수


# ── 색상 출력 헬퍼 ────────────────────────────────────────────────────────────

class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    GRAY   = "\033[90m"

def info(msg):  print(f"{C.CYAN}[INFO]{C.RESET}  {msg}")
def ok(msg):    print(f"{C.GREEN}[OK]{C.RESET}    {msg}")
def warn(msg):  print(f"{C.YELLOW}[WARN]{C.RESET}  {msg}")
def err(msg):   print(f"{C.RED}[ERR]{C.RESET}   {msg}", file=sys.stderr)
def dim(msg):   print(f"{C.GRAY}{msg}{C.RESET}")


# ── yt-dlp 설치 확인 ──────────────────────────────────────────────────────────

def ensure_ytdlp():
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        warn("yt-dlp 가 설치되어 있지 않습니다. 설치를 시도합니다...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "yt-dlp", "-q"],
            capture_output=True
        )
        if result.returncode != 0:
            err("yt-dlp 설치 실패. 수동으로 'pip install yt-dlp' 를 실행하세요.")
            sys.exit(1)
        ok("yt-dlp 설치 완료.")
        return True


# ── 검색 URL 생성 ─────────────────────────────────────────────────────────────

def build_search_url(query: str, max_results: int) -> str:
    """ytsearch:<n>:<query> 형식으로 yt-dlp 검색 URL 반환"""
    return f"ytsearch{max_results}:{query}"


# ── 영상 메타데이터 수집 ───────────────────────────────────────────────────────

def fetch_metadata(query: str, max_results: int) -> list[dict]:
    """검색 결과 메타데이터를 JSON으로 수집"""
    import yt_dlp

    search_url = build_search_url(query, max_results * 3)  # 필터링 여유분

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
        "skip_download": True,
    }

    info(f"검색 중: {C.BOLD}{query}{C.RESET}")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(search_url, download=False)
            entries = info_dict.get("entries", []) if info_dict else []
            return [e for e in entries if e]
    except Exception as e:
        err(f"메타데이터 수집 실패: {e}")
        return []


# ── Shorts 필터링 ─────────────────────────────────────────────────────────────

def is_shorts(entry: dict) -> bool:
    """Shorts 영상 여부 판별 (duration + url 패턴)"""
    duration = entry.get("duration") or 0
    url = entry.get("url", "") or entry.get("webpage_url", "")
    vid_id = entry.get("id", "")

    # duration 기반 (None 이면 일단 통과)
    if duration and duration > MAX_DURATION:
        return False

    # Shorts URL 패턴
    if "/shorts/" in url:
        return True

    # duration ≤ 60 이면 Shorts 가능성 높음
    if duration and duration <= 60:
        return True

    return True  # 판단 불가 시 일단 포함 (다운로드 단계에서 재확인)


def filter_entries(entries: list[dict], min_views: int) -> list[dict]:
    filtered = []
    for e in entries:
        if not is_shorts(e):
            dim(f"  skip (길이 초과): {e.get('title', 'N/A')[:50]}")
            continue
        view_count = e.get("view_count") or 0
        if min_views > 0 and view_count < min_views:
            dim(f"  skip (조회수 부족 {view_count:,}): {e.get('title', 'N/A')[:50]}")
            continue
        filtered.append(e)
    return filtered


# ── 단일 영상 다운로드 ────────────────────────────────────────────────────────

def download_video(video_id: str, output_dir: Path, idx: int) -> bool:
    """yt-dlp 로 영상 하나를 다운로드"""
    import yt_dlp

    url = f"https://www.youtube.com/shorts/{video_id}"
    fallback_url = f"https://www.youtube.com/watch?v={video_id}"

    output_tmpl = str(output_dir / "%(upload_date)s_%(id)s_%(title).60s.%(ext)s")

    ydl_opts = {
        "outtmpl": output_tmpl,
        "format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "match_filter": f"duration <= {MAX_DURATION}",
        "retries": 3,
        "fragment_retries": 3,
        "postprocessors": [{
            "key": "FFmpegVideoConvertor",
            "preferedformat": "mp4",
        }],
    }

    for url_try in [url, fallback_url]:
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url_try])
            return True
        except Exception as e:
            dim(f"    재시도 ({url_try}): {e}")
            continue

    return False


# ── 진행 상황 로그 저장 ───────────────────────────────────────────────────────

def save_log(output_dir: Path, results: list[dict]):
    log_path = output_dir / "download_log.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total": len(results),
            "success": sum(1 for r in results if r["success"]),
            "videos": results,
        }, f, ensure_ascii=False, indent=2)
    ok(f"로그 저장: {log_path}")


# ── 메인 로직 ─────────────────────────────────────────────────────────────────

def run(
    queries: list[str],
    output_dir: str,
    max_per_query: int,
    max_total: int,
    min_views: int,
    dry_run: bool,
):
    ensure_ytdlp()

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    info(f"저장 폴더: {out.resolve()}")

    downloaded = 0
    seen_ids: set[str] = set()
    results: list[dict] = []

    for query in queries:
        if downloaded >= max_total:
            warn("최대 다운로드 수 도달, 종료합니다.")
            break

        print()
        entries = fetch_metadata(query, max_per_query)
        if not entries:
            warn("검색 결과 없음.")
            continue

        filtered = filter_entries(entries, min_views)
        info(f"  → {len(entries)}개 검색 / {len(filtered)}개 필터 통과")

        count_this_query = 0
        for entry in filtered:
            if downloaded >= max_total or count_this_query >= max_per_query:
                break

            vid_id = entry.get("id", "")
            if not vid_id or vid_id in seen_ids:
                continue
            seen_ids.add(vid_id)

            title = entry.get("title", "N/A")[:60]
            duration = entry.get("duration")
            views = entry.get("view_count") or 0

            print(f"\n  [{downloaded+1}] {C.BOLD}{title}{C.RESET}")
            dim(f"       ID: {vid_id} | 길이: {duration}s | 조회수: {views:,}")

            if dry_run:
                ok("  (dry-run) 다운로드 스킵")
                results.append({"id": vid_id, "title": title, "success": True, "dry_run": True})
                downloaded += 1
                count_this_query += 1
                continue

            success = download_video(vid_id, out, downloaded + 1)
            if success:
                ok(f"  다운로드 완료")
                downloaded += 1
                count_this_query += 1
            else:
                err(f"  다운로드 실패")

            results.append({
                "id": vid_id,
                "title": entry.get("title", ""),
                "duration": duration,
                "views": views,
                "query": query,
                "success": success,
            })

            time.sleep(1.5)   # 서버 부하 방지

    print()
    ok(f"완료: 총 {downloaded}개 영상 다운로드 → {out.resolve()}")
    save_log(out, results)


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="YouTube 반려동물 숏폼 자동 다운로드",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python pet_shorts_downloader.py
  python pet_shorts_downloader.py -q "강아지 귀여운" "고양이 웃긴" -n 5
  python pet_shorts_downloader.py -o ./videos --max-total 20 --min-views 50000
  python pet_shorts_downloader.py --dry-run
        """,
    )
    parser.add_argument(
        "-q", "--queries", nargs="+", default=DEFAULT_QUERIES,
        metavar="QUERY",
        help="검색어 목록 (기본값: 반려동물 관련 쿼리 5개)"
    )
    parser.add_argument(
        "-o", "--output", default=DEFAULT_OUTPUT_DIR,
        metavar="DIR",
        help=f"저장 폴더 (기본값: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        "-n", "--max-per-query", type=int, default=MAX_PER_QUERY,
        metavar="N",
        help=f"검색어당 최대 다운로드 수 (기본값: {MAX_PER_QUERY})"
    )
    parser.add_argument(
        "--max-total", type=int, default=MAX_TOTAL,
        metavar="N",
        help=f"전체 최대 다운로드 수 (기본값: {MAX_TOTAL})"
    )
    parser.add_argument(
        "--min-views", type=int, default=MIN_VIEWS,
        metavar="N",
        help=f"최소 조회수 필터 (기본값: {MIN_VIEWS:,} / 0 = 비활성)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="실제 다운로드 없이 검색 결과만 확인"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        queries=args.queries,
        output_dir=args.output,
        max_per_query=args.max_per_query,
        max_total=args.max_total,
        min_views=args.min_views,
        dry_run=args.dry_run,
    )
