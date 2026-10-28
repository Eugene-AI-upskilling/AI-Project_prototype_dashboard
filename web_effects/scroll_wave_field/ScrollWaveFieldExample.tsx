"use client";

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
