"use client";

import VectorWordmark from "./VectorWordmark";

export default function VectorWordmarkExample() {
  return (
    <VectorWordmark
      text="VECTOR"
      background="#000000"
      textColor="#FFFFFF"
      shade="#FFFFFF"
      accent="rgba(255,255,255,0.7)"
      reach={290}
      speed={50}
      damping={60}
      handles={{ size: 109, spread: 27, labels: true }}
      font={{ fontFamily: "Arial, sans-serif", fontWeight: 800,
              fontSize: "200px", letterSpacing: "-0.02em" }}
      style={{ width: "100%", height: "70vh", minHeight: 320 }}
    />
  );
}
