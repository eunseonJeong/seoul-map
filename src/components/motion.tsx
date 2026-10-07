"use client"

import { useEffect, useRef } from "react"
import {
  animate,
  motion,
  MotionConfig,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import { cn } from "@/lib/utils"

// 공통 움직임: 스크롤 등장, 숫자 올리기, 마우스 기울기.
// OS 의 '동작 줄이기'를 켠 사용자에게는 움직임 없이 바로 보여 준다.

/** 앱 전체에 '동작 줄이기' 설정을 따르게 한다 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** 화면에 들어오면 아래에서 떠오른다. delay 로 여러 장을 차례로 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/** 화면에 들어오면 0에서 value 까지 숫자가 올라간다. 1,234 처럼 천 단위 쉼표 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.1,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const format = (n: number) =>
    `${prefix}${n.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`

  useEffect(() => {
    const el = ref.current
    if (!el || !inView || reduce) return
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (n) => (el.textContent = format(n)),
    })
    return () => controls.stop()
    // format 은 value·decimals·prefix·suffix 로만 바뀐다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value, decimals, prefix, suffix, duration])

  // 서버 렌더·자바스크립트 전에도 최종 값이 보이게 둔다 (등장할 때 0부터 다시 올라감)
  return (
    <span ref={ref} className="tabular">
      {format(value)}
    </span>
  )
}

/**
 * 마우스를 따라 살짝 기울고, 표면에 빛이 비친다.
 * 터치 기기와 '동작 줄이기'에서는 기울지 않는다. max 는 최대 기울기(도)
 */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: React.ReactNode
  className?: string
  max?: number
}) {
  const reduce = useReducedMotion()
  // 카드 안 마우스 위치 (0~1). 가운데가 0.5
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const spring = { stiffness: 220, damping: 22, mass: 0.6 }
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring)
  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.22), transparent 55%)`
  const glareOpacity = useSpring(0, spring)

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
    glareOpacity.set(1)
  }
  function onPointerLeave() {
    px.set(0.5)
    py.set(0.5)
    glareOpacity.set(0)
  }

  return (
    <div className="h-full [perspective:900px]">
      <motion.div
        className={cn("relative transform-gpu", className)}
        style={{ rotateX, rotateY }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glare, opacity: glareOpacity }}
        />
      </motion.div>
    </div>
  )
}
