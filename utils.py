# coding=utf-8
"""
================================================================================
utils.py - 공통 유틸리티 모듈
================================================================================
Streamlit 대시보드 및 스크립트에서 공통으로 사용하는 함수들

배포/로컬 환경 모두 지원
================================================================================
"""

import os
import streamlit as st

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))


def get_secret(key: str, default: str = None) -> str:
    """
    Streamlit secrets 또는 환경변수에서 값 가져오기

    우선순위:
    1. Streamlit secrets (배포 환경)
    2. 환경변수 / .env 파일 (로컬 환경)
    3. 기본값

    Args:
        key: 환경변수 키 이름
        default: 기본값

    Returns:
        환경변수 값
    """
    # 1. Streamlit secrets 확인 (배포 환경)
    try:
        if hasattr(st, 'secrets') and key in st.secrets:
            return st.secrets[key]
    except Exception:
        pass

    # 2. 환경변수 확인 (로컬 환경)
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(PROJECT_DIR, '.env'))
    except ImportError:
        pass

    value = os.getenv(key)
    if value:
        return value

    return default


def get_openai_api() -> str:
    """OpenAI API 키 가져오기"""
    return get_secret('OPENAI_API') or get_secret('OPENAI_API_KEY')


def get_telegram_config() -> tuple:
    """텔레그램 설정 가져오기 (bot_token, chat_id)"""
    bot_token = get_secret('BOT_TOKEN')
    chat_id = get_secret('CHAT_ID')
    return bot_token, chat_id


def get_naver_api() -> tuple:
    """네이버 API 설정 가져오기 (client_id, client_secret)"""
    client_id = get_secret('NAVER_CLIENT_ID')
    client_secret = get_secret('NAVER_CLIENT_SECRET')
    return client_id, client_secret


def get_dart_api() -> str:
    """DART API 키 가져오기"""
    return get_secret('dart_key') or get_secret('DART_KEY')


def get_output_dir() -> str:
    """출력 디렉토리 경로"""
    output_dir = os.path.join(PROJECT_DIR, 'output')
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def is_deployed() -> bool:
    """배포 환경 여부 확인"""
    try:
        # Streamlit Cloud에서는 secrets가 존재
        return hasattr(st, 'secrets') and len(st.secrets) > 0
    except:
        return False
