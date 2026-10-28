"""Originkit Scroll Wave Field 재사용 패키지 (Python 추가 설치 없음).

실행: python web_effects/scroll_wave_field.py
지정 폴더: python web_effects/scroll_wave_field.py --output ./my-effects
원본 추출: python web_effects/scroll_wave_field.py --original

React/TypeScript 코드를 보관하고 추출하는 파일입니다.
파도 애니메이션은 웹브라우저의 WebGL에서 실행됩니다.
이 Python 파일만 복사해도 원본과 사용 예제를 함께 가져갈 수 있습니다.
"""

import argparse
from pathlib import Path


def get_source(*, original: bool = False) -> str:
    """원본 또는 웹 프로젝트에 재사용하기 편하게 보완한 코드를 반환합니다."""
    if original:
        return ORIGINAL_SOURCE
    source = ORIGINAL_SOURCE
    props_start = source.index("interface Props {")
    props_end = source.index("\n}", props_start)
    props_block = source[props_start:props_end]
    # 실행 시 기본값이 있는 속성은 타입에서도 생략할 수 있게 합니다.
    for name, kind in (
        ("background", "string"), ("colors", "string[]"),
        ("density", "number"), ("dotSize", "number"),
        ("scatter", "number"), ("cameraHeight", "number"),
    ):
        props_block = props_block.replace(f"    {name}: {kind}\n",
                                          f"    {name}?: {kind}\n")
    source = source[:props_start] + props_block + source[props_end:]
    return source.replace(
        "interface Props {", "export interface ScrollWaveFieldProps {"
    ).replace(
        "ScrollWaveField(props: Props)",
        "ScrollWaveField(props: ScrollWaveFieldProps)"
    ).replace(
        "minWidth: 1200,", "minWidth: 0,"
    ).replace(
        "minHeight: 800,", "minHeight: 320,"
    ).replace(
        "            ro.disconnect()",
        "            gl.deleteBuffer(gridBuf)\n"
        "            gl.deleteBuffer(seedBuf)\n"
        "            for (const shader of gl.getAttachedShaders(prog) ?? []) {\n"
        "                gl.detachShader(prog, shader)\n"
        "                gl.deleteShader(shader)\n"
        "            }\n"
        "            gl.deleteProgram(prog)\n"
        "            ro.disconnect()",
    )


EXAMPLE = '''"use client";

import ScrollWaveField from "./ScrollWaveField";

export default function ScrollWaveFieldExample() {
  return (
    <ScrollWaveField
      background="#080512"
      colors={["#5A4AE0", "#F2D98A"]}
      density={145}
      dotSize={2}
      scatter={108}
      cameraHeight={50}
      wave={{ waveSpeed: 250, waveHeight: 200, waveLength: 2070 }}
      tilt={{ rollStart: 0, tiltStart: 12 }}
      cursor={{ cursorLift: 45, cursorRadius: 25 }}
      transition={{ type: "spring", mass: 1, delay: 0,
                    damping: 60, stiffness: 800 }}
      style={{ width: "100%", height: "70vh", minHeight: 320 }}
    />
  );
}
'''

GUIDE = '''# Scroll Wave Field — Originkit

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
'''


def export(output: Path, *, original: bool = False) -> list[Path]:
    """원본·컴포넌트·사용 예제를 추출하며 기존 파일은 덮어쓰지 않습니다."""
    output = Path(output)
    files = {
        "ScrollWaveField.tsx": get_source(original=original),
        "ScrollWaveField.original.tsx": ORIGINAL_SOURCE,
        "ScrollWaveFieldExample.tsx": EXAMPLE,
        "README.md": GUIDE,
    }
    existing = [output / name for name in files if (output / name).exists()]
    if existing:
        raise FileExistsError("이미 파일이 있습니다. 다른 --output 폴더를 지정하세요: "
                              + ", ".join(map(str, existing)))
    output.mkdir(parents=True, exist_ok=True)
    paths = []
    for name, content in files.items():
        path = output / name
        with path.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        paths.append(path)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parent / "scroll_wave_field")
    parser.add_argument("--original", action="store_true",
                        help="기본 컴포넌트도 수정 없는 원본으로 추출")
    args = parser.parse_args()
    try:
        paths = export(args.output, original=args.original)
    except FileExistsError as exc:
        parser.exit(1, str(exc) + "\n")
    for path in paths:
        print(path)


# 첨부 원문을 아래 ORIGINAL_SOURCE에 보관합니다.

ORIGINAL_SOURCE = '// Scroll Wave Field — Originkit\n\n"use client"\n\nimport * as React from "react"\nimport { useEffect, useRef } from "react"\nimport { animate, motionValue } from "motion/react"\n\ntype Motion = {\n    type?: "spring" | "tween" | "keyframes" | "inertia"\n    duration?: number\n    ease?: [number, number, number, number]\n    delay?: number\n    stiffness?: number\n    damping?: number\n    mass?: number\n    bounce?: number\n    restSpeed?: number\n    restDelta?: number\n}\n\nconst FIELD_W = 3600\nconst FIELD_D = 7000\n\nconst CAM_Z0 = 700\nconst FOV = 60\nconst DPR_CAP = 1.5\nconst TAU = Math.PI * 2\nconst MAX_COLORS = 8\nconst DEFAULT_COLORS = ["#5A4AE0", "#F2D98A"]\n\nconst WAVE_DIRECTION = 0\nconst WAVE_DIR_X = Math.sin((WAVE_DIRECTION * Math.PI) / 180)\nconst WAVE_DIR_Z = -Math.cos((WAVE_DIRECTION * Math.PI) / 180)\n\nconst CAM_Y_FULL = 550\nconst CAM_REF_AREA = 1200 * 800\n\nconst CAM_SCALE_MIN = 0.5\nconst CAM_SCALE_MAX = 2.5\n\nconst CURSOR_FOLLOW = 7\n\nconst VERT = `\nprecision highp float;\n\nattribute vec2 aGrid;\nattribute vec2 aSeed;\n\nuniform vec2  uRes;\nuniform float uFocal;\nuniform float uTime;\nuniform float uAmp;\nuniform float uScatter;\nuniform float uFreq;\nuniform vec2  uDir;\nuniform float uFlow;\nuniform float uDepth;\nuniform float uCamY;\nuniform float uCamZ;\nuniform float uPitch;\nuniform float uRoll;\n\nuniform float uDot;\nuniform float uColorCount;\nuniform vec2  uJit;\nuniform vec3  uColors[8];\nuniform vec3  uCursor;\nuniform float uCurR;\nuniform float uCurS;\nuniform float uHover;\n\nvarying vec3  vCol;\nvarying float vA;\nvarying float vHot;\n\nvec3 pickColor(float sel) {\n    float idx = floor(sel * uColorCount);\n    vec3 c = uColors[0];\n    for (int i = 1; i < 8; i++) {\n        if (float(i) >= uColorCount) break;\n        if (float(i) == idx) c = uColors[i];\n    }\n    return c;\n}\n\nfloat surf(vec2 q) {\n    return sin(q.x) * 0.55\n         + sin(q.x * 0.55 + q.y * 1.15) * 0.30\n         + sin(q.y * 0.75) * 0.22;\n}\n\nvoid main() {\n    vec2 w = aGrid + (aSeed - 0.5) * uJit;\n\n    w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);\n\n    float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);\n\n    float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;\n\n    float cd = length(w - uCursor.xy);\n    float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursor.z;\n    h += g * uCurS;\n\n    float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;\n\n    vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);\n    float c = cos(uPitch);\n    float s = sin(uPitch);\n    float ry = p.y * c + p.z * s;\n    float rz = -p.y * s + p.z * c;\n\n    if (rz < 40.0) {\n        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);\n        gl_PointSize = 0.0;\n        vCol = uColors[0];\n        vA = 0.0;\n        vHot = 0.0;\n        return;\n    }\n\n    float cr = cos(uRoll);\n    float sr = sin(uRoll);\n    float rx = p.x * cr - ry * sr;\n    float ryr = p.x * sr + ry * cr;\n\n    float sx = rx * uFocal / rz;\n    float sy = ryr * uFocal / rz;\n    gl_Position = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);\n\n    float rad = max(uDot * uFocal / rz, 0.55);\n\n    gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);\n\n    float bri = 0.28 + h3 * 0.72;\n\n    vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;\n    float band = sin(bq.x) + sin(bq.y);\n    float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);\n\n    vCol = pickColor(sel);\n\n    float lum = dot(vCol, vec3(0.299, 0.587, 0.114));\n\n    vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;\n\n    float fog = (1.0 - smoothstep(2800.0, 6400.0, rz))\n              * smoothstep(70.0, 240.0, rz);\n\n    vA = bri * fog * (1.0 + g2 * uHover * 0.55);\n}\n`\n\nconst FRAG = `\nprecision highp float;\n\nvarying vec3  vCol;\nvarying float vA;\nvarying float vHot;\n\nvoid main() {\n    float d = length(gl_PointCoord - 0.5) * 2.0;\n    if (d > 1.0) discard;\n\n    float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;\n\n    vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;\n\n    gl_FragColor = vec4(col * a, a);\n}\n`\n\nfunction parseColor(input: string): [number, number, number] {\n    if (!input) return [0, 0, 0]\n    const s = input.trim()\n    const fn = s.match(/rgba?\\(([^)]+)\\)/i)\n    if (fn) {\n        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))\n        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]\n    }\n    let h = s.replace("#", "")\n    if (h.length === 3 || h.length === 4) {\n        h = h\n            .split("")\n            .map((c) => c + c)\n            .join("")\n    }\n    h = h.padEnd(6, "0")\n    return [\n        parseInt(h.slice(0, 2), 16) / 255,\n        parseInt(h.slice(2, 4), 16) / 255,\n        parseInt(h.slice(4, 6), 16) / 255,\n    ]\n}\n\nfunction mulberry32(a: number) {\n    return function () {\n        a |= 0\n        a = (a + 0x6d2b79f5) | 0\n        let t = Math.imul(a ^ (a >>> 15), 1 | a)\n        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t\n        return ((t ^ (t >>> 14)) >>> 0) / 4294967296\n    }\n}\n\nfunction compile(gl: WebGLRenderingContext, type: number, src: string) {\n    const sh = gl.createShader(type)!\n    gl.shaderSource(sh, src)\n    gl.compileShader(sh)\n    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {\n        console.warn("ScrollWaveField shader:", gl.getShaderInfoLog(sh))\n    }\n    return sh\n}\n\ninterface WaveGroup {\n    waveHeight: number\n    waveLength: number\n    waveSpeed: number\n}\n\ninterface ColorGroup {\n    background: string\n    colors: string[]\n}\n\ninterface TiltGroup {\n    tiltStart: number\n    rollStart: number\n}\ninterface CursorGroup {\n    cursorRadius: number\n    cursorLift: number\n\n    hoverGlow?: number\n}\n\ninterface Props {\n    background: string\n    colors: string[]\n\n    palette?: Partial<ColorGroup>\n    density: number\n    dotSize: number\n    scatter: number\n\n    cameraHeight: number\n    wave?: Partial<WaveGroup>\n    tilt?: Partial<TiltGroup>\n    cursor?: Partial<CursorGroup>\n    transition?: Motion\n\n    flowSpeed?: number\n    width?: number\n    height?: number\n    style?: React.CSSProperties\n}\n\nconst FLOW_PER_WAVE = 260 / 160\n\nconst GLOW_PER_LIFT = 100 / 45\n\nconst DEFAULT_TRANSITION: Motion = {\n    type: "tween",\n    duration: 0.8,\n\n    ease: [0.4, 0, 0.2, 1],\n}\n\nexport default function ScrollWaveField(props: Props) {\n    const {\n        background: backgroundProp,\n        colors: colorsProp,\n        palette = {},\n        density = 145,\n        dotSize = 2,\n        scatter = 108,\n        cameraHeight = 50,\n        wave = {"waveSpeed":250,"waveHeight":200,"waveLength":2070},\n        tilt = {"rollStart":0,"tiltStart":12},\n        cursor = {"cursorLift":45,"cursorRadius":25},\n        transition = {"mass":1,"type":"spring","delay":0,"damping":60,"stiffness":800},\n        flowSpeed: flowSpeedLegacy,\n        width,\n        height,\n        style,\n    } = props\n\n    const hoverMV = useRef(motionValue(0)).current\n    const pressMV = useRef(motionValue(0)).current\n    const transitionRef = useRef(transition)\n    transitionRef.current = transition\n\n    const { waveHeight = 150, waveLength = 1400, waveSpeed = 160 } = wave\n\n    const background = backgroundProp ?? palette.background ?? "#080512"\n    const colors = colorsProp ?? palette.colors ?? DEFAULT_COLORS\n    const { tiltStart = 8, rollStart = 0 } = tilt\n    const {\n        cursorRadius = 25,\n        cursorLift = 45,\n        hoverGlow: hoverGlowLegacy,\n    } = cursor\n\n    const flowSpeed = flowSpeedLegacy ?? waveSpeed * FLOW_PER_WAVE\n    const hoverGlow =\n        hoverGlowLegacy ?? Math.min(400, Math.abs(cursorLift) * GLOW_PER_LIFT)\n\n    const hostRef = useRef<HTMLDivElement>(null)\n    const canvasRef = useRef<HTMLCanvasElement>(null)\n\n    const live = useRef({\n        colors,\n        density,\n        dotSize,\n        waveHeight,\n        scatter,\n        waveLength,\n        waveSpeed,\n        flowSpeed,\n        tiltStart,\n        rollStart,\n        cameraHeight,\n        cursorRadius,\n        cursorLift,\n        hoverGlow,\n    })\n    live.current = {\n        colors,\n        density,\n        dotSize,\n        waveHeight,\n        scatter,\n        waveLength,\n        waveSpeed,\n        flowSpeed,\n        tiltStart,\n        rollStart,\n        cameraHeight,\n        cursorRadius,\n        cursorLift,\n        hoverGlow,\n    }\n\n    const pointer = useRef({\n        x: 0,\n        y: 0,\n        sx: 0,\n        sy: 0,\n        active: 0,\n        target: 0,\n        press: 0,\n        pressTarget: 0,\n    })\n\n    useEffect(() => {\n        const host = hostRef.current\n        const canvas = canvasRef.current\n        if (!host || !canvas) return\n\n        const gl = canvas.getContext("webgl", {\n            alpha: true,\n            antialias: false,\n            premultipliedAlpha: true,\n            depth: false,\n        }) as WebGLRenderingContext | null\n        if (!gl) return\n\n        const prog = gl.createProgram()!\n        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))\n        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))\n        gl.linkProgram(prog)\n        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {\n            console.warn("ScrollWaveField link:", gl.getProgramInfoLog(prog))\n            return\n        }\n        gl.useProgram(prog)\n\n        const aGrid = gl.getAttribLocation(prog, "aGrid")\n        const aSeed = gl.getAttribLocation(prog, "aSeed")\n        const U = (n: string) => gl.getUniformLocation(prog, n)\n        const u = {\n            res: U("uRes"),\n            focal: U("uFocal"),\n            time: U("uTime"),\n            amp: U("uAmp"),\n            scatter: U("uScatter"),\n            freq: U("uFreq"),\n            dir: U("uDir"),\n            flow: U("uFlow"),\n            depth: U("uDepth"),\n            camY: U("uCamY"),\n            camZ: U("uCamZ"),\n            pitch: U("uPitch"),\n            roll: U("uRoll"),\n            dot: U("uDot"),\n            colorCount: U("uColorCount"),\n            jit: U("uJit"),\n            colors: U("uColors[0]"),\n            cursor: U("uCursor"),\n            curR: U("uCurR"),\n            curS: U("uCurS"),\n            hover: U("uHover"),\n        }\n\n        const gridBuf = gl.createBuffer()!\n        const seedBuf = gl.createBuffer()!\n\n        const palBuf = new Float32Array(MAX_COLORS * 3)\n\n        let builtDensity = -1\n        let count = 0\n        let spacingX = 1\n        let spacingZ = 1\n\n        const buildGrid = (d: number) => {\n            const cols = Math.max(8, Math.round(d))\n            const rows = Math.max(8, Math.round(d * 2))\n            count = cols * rows\n            spacingX = FIELD_W / (cols - 1)\n            spacingZ = FIELD_D / (rows - 1)\n\n            const grid = new Float32Array(count * 2)\n            const seed = new Float32Array(count * 2)\n            const rnd = mulberry32(0x5eed)\n            let i = 0\n            for (let r = 0; r < rows; r++) {\n                for (let c = 0; c < cols; c++) {\n                    grid[i * 2] = -FIELD_W / 2 + (c + 0.5) * spacingX\n                    grid[i * 2 + 1] = r * spacingZ\n                    seed[i * 2] = rnd()\n                    seed[i * 2 + 1] = rnd()\n                    i++\n                }\n            }\n            gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)\n            gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW)\n            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)\n            gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW)\n            builtDensity = d\n        }\n\n        gl.disable(gl.DEPTH_TEST)\n        gl.enable(gl.BLEND)\n\n        gl.blendFunc(gl.ONE, gl.ONE)\n\n        let cssW = 0\n        let cssH = 0\n        let dpr = 1\n\n        let areaScale = 1\n        const resize = () => {\n            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)\n            cssW = canvas.clientWidth || host.clientWidth || 0\n            cssH = canvas.clientHeight || host.clientHeight || 0\n            areaScale =\n                cssW > 0 && cssH > 0\n                    ? Math.min(\n                          CAM_SCALE_MAX,\n                          Math.max(\n                              CAM_SCALE_MIN,\n                              Math.sqrt((cssW * cssH) / CAM_REF_AREA)\n                          )\n                      )\n                    : 1\n            const w = Math.max(1, Math.round(cssW * dpr))\n            const h = Math.max(1, Math.round(cssH * dpr))\n            if (canvas.width !== w || canvas.height !== h) {\n                canvas.width = w\n                canvas.height = h\n            }\n            gl.viewport(0, 0, w, h)\n        }\n        resize()\n        const ro = new ResizeObserver(resize)\n        ro.observe(canvas)\n\n        let hoverAnim: { stop: () => void } | null = null\n        let pressAnim: { stop: () => void } | null = null\n        const gateHover = (to: number) => {\n            if (pointer.current.target === to) return\n            pointer.current.target = to\n            hoverAnim?.stop()\n            hoverAnim = animate(hoverMV, to, transitionRef.current)\n        }\n        const gatePress = (to: number) => {\n            if (pointer.current.pressTarget === to) return\n            pointer.current.pressTarget = to\n            pressAnim?.stop()\n            pressAnim = animate(pressMV, to, transitionRef.current)\n        }\n        const onMove = (e: PointerEvent) => {\n            const r = host.getBoundingClientRect()\n\n            const zx = r.width > 0 ? host.clientWidth / r.width : 1\n            const zy = r.height > 0 ? host.clientHeight / r.height : 1\n            pointer.current.x = (e.clientX - r.left) * zx\n            pointer.current.y = (e.clientY - r.top) * zy\n            gateHover(1)\n        }\n        const onLeave = () => {\n            gateHover(0)\n            gatePress(0)\n        }\n        const onDown = () => gatePress(1)\n        const onUp = () => gatePress(0)\n        host.addEventListener("pointermove", onMove)\n        host.addEventListener("pointerleave", onLeave)\n        host.addEventListener("pointerdown", onDown)\n        host.addEventListener("pointercancel", onUp)\n\n        window.addEventListener("pointerup", onUp)\n\n        let raf = 0\n        let last = performance.now()\n        let phase = 0\n\n        let flow = 0\n\n        let hitX = 0\n        let hitZ = -1e6\n\n        const groundHit = (\n            mx: number,\n            my: number,\n            wDev: number,\n            hDev: number,\n            focal: number,\n            pitch: number,\n            roll: number,\n            camY: number,\n            camZ: number\n        ) => {\n            const px = mx * dpr - wDev / 2\n            const py = -(my * dpr - hDev / 2)\n\n            const cr = Math.cos(roll)\n            const sr = Math.sin(roll)\n            const sx = px * cr + py * sr\n            const sy = -px * sr + py * cr\n            const dx = sx / focal\n            const dy = sy / focal\n            const c = Math.cos(pitch)\n            const s = Math.sin(pitch)\n\n            const wy = dy * c - s\n            const wz = dy * s + c\n            if (wy > -1e-4) return null\n            const t = -camY / wy\n            return { x: dx * t, z: camZ + wz * t }\n        }\n\n        const frame = (now: number) => {\n            raf = requestAnimationFrame(frame)\n            const dt = Math.min((now - last) / 1000, 0.05)\n            last = now\n\n            if (cssW <= 0 || cssH <= 0) {\n                resize()\n                if (cssW <= 0 || cssH <= 0) return\n            }\n\n            const L = live.current\n            if (L.density !== builtDensity) buildGrid(L.density)\n            if (count === 0) return\n\n            const p = pointer.current\n\n            p.active = hoverMV.get()\n            p.press = pressMV.get()\n            const speedMul = 1 + p.press\n\n            if (p.active < 0.002) {\n                p.sx = p.x\n                p.sy = p.y\n            } else {\n                const k = 1 - Math.exp(-dt * CURSOR_FOLLOW)\n                p.sx += (p.x - p.sx) * k\n                p.sy += (p.y - p.sy) * k\n            }\n\n            phase += dt * (L.waveSpeed / 100) * speedMul\n            flow = (flow + dt * L.flowSpeed * speedMul) % FIELD_D\n\n            const pitch = (L.tiltStart * Math.PI) / 180\n\n            const roll = (-L.rollStart * Math.PI) / 180\n\n            const camY =\n                (Math.min(100, Math.max(0, L.cameraHeight)) / 100) *\n                CAM_Y_FULL *\n                areaScale\n            const camZ = CAM_Z0\n\n            const wDev = canvas.width\n            const hDev = canvas.height\n            const focal = hDev / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))\n\n            if (p.active <= 0.001) {\n                hitX = 0\n                hitZ = -1e6\n            } else {\n                const hit = groundHit(\n                    p.sx,\n                    p.sy,\n                    wDev,\n                    hDev,\n                    focal,\n                    pitch,\n                    roll,\n                    camY,\n                    camZ\n                )\n\n                if (hit) {\n                    hitX = hit.x\n                    hitZ = hit.z\n                } else if (hitZ === -1e6) {\n                    hitX = 0\n                    hitZ = FIELD_D\n                }\n            }\n            const hx = hitX\n            const hz = hitZ\n\n            const pal =\n                Array.isArray(L.colors) && L.colors.length > 0\n                    ? L.colors.slice(0, 8)\n                    : DEFAULT_COLORS\n            for (let i = 0; i < pal.length; i++) {\n                const [cr2, cg2, cb2] = parseColor(pal[i])\n                palBuf[i * 3] = cr2\n                palBuf[i * 3 + 1] = cg2\n                palBuf[i * 3 + 2] = cb2\n            }\n\n            gl.uniform2f(u.res, wDev, hDev)\n            gl.uniform1f(u.focal, focal)\n            gl.uniform1f(u.time, phase)\n            gl.uniform1f(u.amp, L.waveHeight)\n            gl.uniform1f(u.scatter, L.scatter)\n            gl.uniform1f(u.freq, TAU / Math.max(50, L.waveLength))\n\n            gl.uniform2f(u.dir, WAVE_DIR_X, WAVE_DIR_Z)\n            gl.uniform1f(u.flow, flow)\n            gl.uniform1f(u.depth, FIELD_D)\n            gl.uniform1f(u.camY, camY)\n            gl.uniform1f(u.camZ, camZ)\n            gl.uniform1f(u.pitch, pitch)\n            gl.uniform1f(u.roll, roll)\n            gl.uniform1f(u.dot, L.dotSize)\n            gl.uniform1f(u.colorCount, pal.length)\n            gl.uniform2f(u.jit, spacingX * 0.25, spacingZ * 0.7)\n            gl.uniform3fv(u.colors, palBuf)\n            gl.uniform3f(u.cursor, hx, hz, p.active)\n            gl.uniform1f(\n                u.curR,\n                Math.max(1, (L.cursorRadius / 100) * (FIELD_W / 2))\n            )\n            gl.uniform1f(u.curS, L.cursorLift)\n            gl.uniform1f(u.hover, L.hoverGlow / 100)\n\n            gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)\n            gl.enableVertexAttribArray(aGrid)\n            gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)\n            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)\n            gl.enableVertexAttribArray(aSeed)\n            gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0)\n\n            gl.clearColor(0, 0, 0, 0)\n            gl.clear(gl.COLOR_BUFFER_BIT)\n            gl.drawArrays(gl.POINTS, 0, count)\n        }\n        raf = requestAnimationFrame(frame)\n\n        return () => {\n            cancelAnimationFrame(raf)\n            ro.disconnect()\n            hoverAnim?.stop()\n            pressAnim?.stop()\n            host.removeEventListener("pointermove", onMove)\n            host.removeEventListener("pointerleave", onLeave)\n            host.removeEventListener("pointerdown", onDown)\n            host.removeEventListener("pointercancel", onUp)\n            window.removeEventListener("pointerup", onUp)\n\n        }\n    }, [])\n\n    return (\n        <div\n            ref={hostRef}\n            style={{\n                minWidth: 1200,\n                minHeight: 800,\n                width: "100%",\n                height: "100%",\n                position: "relative",\n                overflow: "hidden",\n\n                background,\n                ...style,\n            }}\n        >\n            <canvas\n                ref={canvasRef}\n                style={{\n                    position: "absolute",\n                    inset: 0,\n                    width: "100%",\n                    height: "100%",\n                    display: "block",\n                }}\n            />\n        </div>\n    )\n}'

if __name__ == "__main__":
    main()
