// 지하철 노선 뱃지. 색은 각 노선의 공식 안내 색을 따른다.
// 밝은 노선색(9호선·분당선 등)은 흰 글씨가 잘 안 보여 어두운 글씨를 쓴다.

const LINE_COLORS: Record<string, { bg: string; dark?: boolean }> = {
  "1호선": { bg: "#0052A4" },
  "2호선": { bg: "#00A84D" },
  "3호선": { bg: "#EF7C1C" },
  "4호선": { bg: "#00A5DE" },
  "5호선": { bg: "#996CAC" },
  "6호선": { bg: "#CD7C2F" },
  "7호선": { bg: "#747F00" },
  "8호선": { bg: "#E6186C" },
  "9호선": { bg: "#BDB092", dark: true },
  경의중앙선: { bg: "#77C4A3", dark: true },
  경춘선: { bg: "#0C8E72" },
  공항철도: { bg: "#0090D2" },
  분당선: { bg: "#FABE00", dark: true },
  신분당선: { bg: "#D4003B" },
  우이신설선: { bg: "#B0CE18", dark: true },
  서해선: { bg: "#81A914" },
  김포골드라인: { bg: "#A17800" },
  신림선: { bg: "#6789CA" },
  "GTX-A": { bg: "#9A6292" },
}

export function SubwayBadge({ line }: { line: string }) {
  const color = LINE_COLORS[line]
  return (
    <span
      className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap"
      style={
        color
          ? { backgroundColor: color.bg, color: color.dark ? "#1d1d1f" : "#fff" }
          : { backgroundColor: "rgba(0,0,0,0.08)", color: "#1d1d1f" } // 모르는 노선
      }
    >
      {line}
    </span>
  )
}
