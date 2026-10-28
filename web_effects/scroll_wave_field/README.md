# Scroll Wave Field — Originkit

점 입자로 이루어진 입체 파도 배경입니다. 파도가 자동으로 흐르며,
마우스를 올리면 주변 입자가 솟아오르고 밝아집니다.
누르고 있는 동안 파도와 흐름의 속도가 증가합니다.
이 원본에는 페이지 스크롤 위치에 연결하는 로직은 없습니다.

## 웹 프로젝트에서 사용

1. React + TypeScript 프로젝트에서 원본이 사용하는 Motion을 설치합니다.

   ```sh
   npm install motion
   ```

2. ScrollWaveField.tsx와 ScrollWaveFieldExample.tsx를 같은 컴포넌트 폴더에 복사합니다.
3. 페이지에서 ScrollWaveFieldExample을 import하고 렌더링합니다.
   Next.js에서는 포함된 "use client" 선언을 유지하세요.
4. WebGL 지원 브라우저에서 실행합니다. 컨테이너에는 높이가 필요합니다.
   예제에서는 height: "70vh"를 지정했습니다.

## 주요 설정

| 속성 | 역할 | 원본 기본값 |
| --- | --- | --- |
| background | 배경색 | #080512 |
| colors | 입자 색상, 최대 8개 | #5A4AE0, #F2D98A |
| density | 입자 격자 밀도 | 145 |
| dotSize | 입자 크기 | 2 |
| scatter | 입자 높이 흩어짐 | 108 |
| cameraHeight | 카메라 높이, 0~100 | 50 |
| wave.waveHeight | 파도 높이 | 200 |
| wave.waveLength | 파도 길이 | 2070 |
| wave.waveSpeed | 파도 속도 | 250 |
| tilt.tiltStart | 카메라 상하 기울기, 도 단위 | 12 |
| tilt.rollStart | 카메라 회전, 도 단위 | 0 |
| cursor.cursorRadius | 마우스 영향 반경 | 25 |
| cursor.cursorLift | 마우스 주변 상승 높이 | 45 |
| transition | 마우스 반응 전환 | spring, stiffness 800, damping 60 |
| style | 컨테이너 크기 및 스타일 | 예제 참고 |

density=145일 때 입자는 약 42,050개입니다. 밀도가 높으면 입자 수는
대략 density의 제곱에 비례합니다. 성능을 조절하려면 density를 낮추세요.
색상은 원본 파서에 맞춰 #RRGGBB 또는 rgb(r,g,b)로 지정하세요.
palette={{ background: "#080512", colors: ["#5A4AE0", "#F2D98A"] }}로도
색상을 지정할 수 있습니다. 직접 전달한 background/colors가 우선합니다.
wave, tilt를 일부만 전달하면 생략된 항목에는 원본 내부의 보조 기본값이
적용되므로 예제처럼 그룹 전체를 지정하면 같은 모습을 유지하기 쉽습니다.
width/height 속성은 원본에서 화면 크기에 적용되지 않으므로 style을 사용하세요.

## Python 파일 사용

```sh
python web_effects/scroll_wave_field.py --output ./my-effects
```

기존 파일이 있으면 덮어쓰지 않습니다. 다른 --output 폴더를 지정하세요.
get_source()로 React 코드를 가져오거나 export(Path("my-effects"))로 추출할 수 있습니다.
Python 쪽 외부 의존성은 없습니다. 웹 프로젝트에는 React와 Motion이 필요합니다.

## 보관된 코드

- ScrollWaveField.original.tsx: 붙여넣은 원본
- ScrollWaveField.tsx: 타입의 기본값 속성을 선택 항목으로 보완하고,
  고정 최소 폭을 제거하며, 해제 시 GPU 버퍼와 셰이더 및 프로그램을 정리한 버전
- ScrollWaveFieldExample.tsx: 바로 가져다 쓸 수 있는 예제

파도와 마우스 반응 로직, 원본 출처 표기를 유지합니다.
--original 옵션을 쓰면 기본 컴포넌트도 원본으로 추출합니다.
