# coding=utf-8
"""
Scripts 패키지 초기화
숫자로 시작하는 모듈명을 import 가능하게 처리
"""

import importlib.util
import os

_script_dir = os.path.dirname(os.path.abspath(__file__))


def load_script(name: str):
    """
    스크립트 모듈 동적 로드

    Args:
        name: 스크립트 번호 (예: "1", "2", "3")

    Returns:
        로드된 모듈
    """
    scripts = {
        "1": "1_News_to_Telegram.py",
        "2": "2_DART_Prelim_Earnings.py",
        "3": "3_Global_Earnings.py",
        "4": "4_Earnings_Call_Summarizer.py",
        "5": "5_Social_Tracker.py",
        "6": "6_Specific_Web_Crawling.py",
    }

    if name not in scripts:
        raise ValueError(f"Unknown script: {name}")

    filepath = os.path.join(_script_dir, scripts[name])
    spec = importlib.util.spec_from_file_location(f"script_{name}", filepath)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    return module
