import { useCallback, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { clinic, type Language } from './config'

type Props = {
  language: Language
  onComplete: () => void
}

const title: Record<Language, string> = {
  uz: 'FAYZ PLUS',
  ru: 'FAYZ PLUS',
  en: 'FAYZ PLUS',
}

const tagline: Record<Language, string> = {
  uz: 'Саломатлигингиз — энг катта қадрият',
  ru: 'Ваше здоровье — наша главная ценность',
  en: 'Your health is our highest priority',
}

const skip: Record<Language, string> = {
  uz: 'Ўтказиб юбориш',
  ru: 'Пропустить',
  en: 'Skip intro',
}

export default function IntroAnimation({ language, onComplete }: Props) {
  const reducedMotion = useReducedMotion()
  const finished = useRef(false)
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(finish, reducedMotion ? 500 : 3100)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [finish, reducedMotion])

  return <motion.div
    className={`intro-overlay${reducedMotion ? ' intro-reduced' : ''}`}
    role="dialog"
    aria-modal="true"
    aria-label={title[language]}
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, filter: reducedMotion ? 'none' : 'blur(8px)' }}
    transition={{ duration: reducedMotion ? 0.18 : 0.56, ease: [0.22, 1, 0.36, 1] }}
  >
    <motion.div className="intro-ambient" aria-hidden="true"
      initial={{ opacity: 0, x: '-9%' }}
      animate={{ opacity: 1, x: '9%' }}
      transition={{ duration: reducedMotion ? 0.18 : 2.7, ease: 'easeInOut' }} />

    <button className="intro-skip" type="button" onClick={finish} autoFocus>{skip[language]}<span aria-hidden="true">↗</span></button>

    <div className="intro-stage">
      {!reducedMotion && <motion.svg className="intro-pulse" viewBox="0 0 640 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0.78, 0] }} transition={{ duration: 1.9, times: [0, 0.4, 1], delay: 0.35 }}>
        <motion.path d="M0 78 H210 L231 78 L245 62 L259 100 L280 34 L301 91 L315 78 H640"
          fill="none" stroke="#52aa98" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.15, delay: 0.38, ease: [0.45, 0, 0.2, 1] }} />
      </motion.svg>}

      <motion.div className="intro-symbol" aria-hidden="true"
        initial={{ opacity: 0, scale: 0.9, filter: reducedMotion ? 'none' : 'blur(7px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: reducedMotion ? 0.22 : 0.7, delay: reducedMotion ? 0 : 1.3, ease: [0.22, 1, 0.36, 1] }}>
        <motion.img src={clinic.logo} alt="" width="84" height="84"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0.25 : 0.7, delay: reducedMotion ? 0 : 1.4 }} />
      </motion.div>

      <motion.h1 className="intro-title"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 12, filter: reducedMotion ? 'none' : 'blur(10px)', letterSpacing: '0.06em' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.01em' }}
        transition={{ duration: reducedMotion ? 0.25 : 0.72, delay: reducedMotion ? 0.1 : 1.93, ease: [0.22, 1, 0.36, 1] }}>
        {title[language]}
      </motion.h1>
      <motion.p className="intro-tagline"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0.2 : 0.65, delay: reducedMotion ? 0.18 : 2.22 }}>
        {tagline[language]}
      </motion.p>
      <motion.div className="intro-rule" aria-hidden="true"
        initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.6, delay: reducedMotion ? 0.1 : 2.18 }} />
    </div>
    <div className="intro-corner intro-corner-left" aria-hidden="true" />
    <div className="intro-corner intro-corner-right" aria-hidden="true" />
  </motion.div>
}
