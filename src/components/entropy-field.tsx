export function EntropyField({ bytes }: { bytes: Uint8Array | null }) {
  const data = bytes && bytes.length > 0 ? Array.from(bytes) : [];
  const count = data.length;
  const cx = 160;
  const cy = 160;
  const radius = 108;

  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label={bytes ? "Entropy compass" : "Idle entropy compass"}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-line)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={radius * 0.62} fill="none" stroke="var(--color-line)" strokeWidth="1" />
      {data.map((value, index) => {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        const magnitude = (value / 255) * radius * 0.28;
        const inner = radius * 0.68;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * (inner + magnitude);
        const y2 = cy + Math.sin(angle) * (inner + magnitude);
        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-foreground)"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity={0.28 + (value / 255) * 0.72}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="2.5" fill="var(--color-foreground)" />
    </svg>
  );
}
