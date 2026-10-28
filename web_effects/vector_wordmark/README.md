# Vector Wordmark — Originkit

마우스를 따라 글자 채움이 점선 윤곽으로 바뀌며, 세 개의 사각 핸들과
삼각 점선 및 좌표 라벨이 움직이는 React + WebGL 효과입니다.
처음 마우스를 움직이기 전에는 자동 스윕 애니메이션이 실행됩니다.

## 사용 방법

1. VectorWordmark.tsx와 VectorWordmarkExample.tsx를 React/Next.js
   프로젝트의 같은 컴포넌트 폴더에 복사합니다.
2. 페이지에서 VectorWordmarkExample을 import하여 렌더링합니다.
3. React와 TypeScript가 있는 프로젝트가 필요합니다. 추가 효과 라이브러리는 없습니다.
   WebGL을 지원하는 브라우저에서 실행하세요.

## 주요 설정

| 속성 | 역할 | 원본 기본값 |
| --- | --- | --- |
| text | 표시할 문구 | VECTOR |
| background | 배경색 | #000000 |
| textColor / shade | 글자 위쪽 / 아래쪽 색 | #FFFFFF |
| accent | 핸들 및 점선 색 | #FFFFFF |
| reach | 마우스 효과 반경 | 290 |
| speed | 자동 스윕 및 핸들 흔들림 속도 | 50 |
| damping | 마우스 추종 속도, 높을수록 빠름 | 60 |
| handles.size | 사각 핸들 크기 | 109 |
| handles.spread | 핸들 사이 간격 | 27 |
| handles.labels | 좌표 라벨 표시 여부 | true |
| font | 글꼴, 두께, 크기, 자간 | 원본 코드 참고 |
| style | 컨테이너 크기 및 스타일 | 원본 코드 참고 |

fontSize는 숫자 또는 px 값으로 지정하세요. 원본은 1200px 컨테이너 폭을
기준으로 글자 크기를 비례 조정합니다. 긴 문구는 fontSize를 줄이세요.
Inter를 사용하려면 웹 프로젝트에서 해당 폰트를 따로 로드해야 합니다.
예제는 설치 없이 사용할 수 있는 Arial을 사용합니다.

## 보관된 코드

VectorWordmark.original.tsx는 붙여넣은 원본입니다.
기본 추출본은 GLSL ES 1.00 셰이더에 맞춰 WebGL 1을 사용하고,
모바일에서 넘치는 1200px 최소 폭을 제거하며, 해제 시 GPU 리소스를 정리합니다.
기타 효과 로직과 원본 출처 표기는 유지합니다.
Python에서 get_source()로 코드를 가져올 수도 있습니다.
원본의 사용·배포 조건은 출처 Originkit의 조건을 확인하세요.
