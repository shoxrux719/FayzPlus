import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Globe2, HeartPulse, LockKeyhole, MapPin, Phone, ShieldCheck, Star } from 'lucide-react'
import { clinic, type Answer, type Feedback, type Language, type QuestionId } from './config'
import { copy, questionIds } from './i18n'
import IntroAnimation from './IntroAnimation'

type Screen = 'welcome' | 'survey' | 'success'
const TOTAL = 12
const COOLDOWN_MS = 3 * 60 * 1000

function LogoMark({ size = 45 }: { size?: number }) {
  return <img src={clinic.logo} width={size} height={size} alt="" aria-hidden="true" />
}

function initialLanguage(): Language {
  const saved = localStorage.getItem('fayz-language')
  return saved === 'ru' || saved === 'en' ? saved : 'uz'
}

function getQueryValue(key: string, fallback: string) {
  const value = new URLSearchParams(window.location.search).get(key)
  return value && /^[\p{L}\p{N}_-]{1,60}$/u.test(value) ? value : fallback
}

function isPhoneValid(value: string) {
  return /^\d{9}$/.test(value)
}

function localPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  const hasCountryCode = value.trimStart().startsWith('+998') || (digits.startsWith('998') && digits.length > 9)
  return (hasCountryCode ? digits.slice(3) : digits).slice(0, 9)
}

function formatLocalPhone(value: string) {
  return [value.slice(0, 2), value.slice(2, 5), value.slice(5, 7), value.slice(7, 9)].filter(Boolean).join(' ')
}

function App() {
  const reducedMotion = useReducedMotion()
  const [introOpen, setIntroOpen] = useState(true)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [screen, setScreen] = useState<Screen>('welcome')
  const [step, setStep] = useState(0)
  const [service, setService] = useState('')
  const [doctor, setDoctor] = useState('')
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, Answer>>>({})
  const [comment, setComment] = useState('')
  const [wantsContact, setWantsContact] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [demoSaved, setDemoSaved] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [website, setWebsite] = useState('')
  const t = copy[language]
  const rating = answers.rating || 0
  const urlData = useMemo(() => ({ branch: getQueryValue('branch', 'chinobod'), source: getQueryValue('source', 'website'), doctor: getQueryValue('doctor', '') }), [])
  const finishIntro = useCallback(() => {
    setIntroOpen(false)
  }, [])

  useEffect(() => {
    const content = document.getElementById('site-content')
    if (introOpen) content?.setAttribute('inert', '')
    else content?.removeAttribute('inert')
  }, [introOpen])

  useEffect(() => {
    localStorage.setItem('fayz-language', language)
    document.documentElement.lang = language === 'uz' ? 'uz-Cyrl' : language
    document.title = `${clinic.name} — ${language === 'uz' ? 'фикр-мулоҳаза' : language === 'ru' ? 'обратная связь' : 'feedback'}`
  }, [language])

  function begin() {
    const last = Number(localStorage.getItem('fayz-last-submitted') || 0)
    if (Date.now() - last < COOLDOWN_MS) { setError(t.cooldown); return }
    setError('')
    setStartedAt(Date.now())
    setDoctor(urlData.doctor)
    setStep(0)
    setScreen('survey')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setScreen('welcome'); setStep(0); setService(''); setDoctor(''); setAnswers({}); setComment('')
    setWantsContact(null); setName(''); setPhone(''); setError(''); setDemoSaved(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function pickService(value: string) { setService(value); setError(''); setStep(1) }
  function pickDoctor(value: string) { setDoctor(value); setError(''); setStep(2) }
  function pickAnswer(id: QuestionId, value: Answer) {
    setAnswers(previous => ({ ...previous, [id]: value }))
    setError('')
    setStep(previous => Math.min(previous + 1, TOTAL - 1))
  }

  function goBack() {
    setError('')
    if (step === 0) setScreen('welcome')
    else setStep(previous => previous - 1)
  }

  async function submit() {
    if (wantsContact === null) { setError(t.requiredError); return }
    if (wantsContact && !isPhoneValid(phone)) { setError(t.phoneError); return }
    if (busy) return
    const complete = questionIds.every(id => answers[id] !== undefined)
    if (!complete || !service) { setError(t.requiredError); return }

    const feedback: Feedback = {
      language, branch: urlData.branch, source: urlData.source, service, doctor,
      answers: answers as Record<QuestionId, Answer>, rating,
      comment: comment.trim().slice(0, 2000), name: wantsContact ? name.trim().slice(0, 120) : '',
      phone: wantsContact ? `+998${phone}` : '', wantsContact,
      startedAt, website,
    }
    setBusy(true); setError('')
    try {
      if (import.meta.env.DEV && import.meta.env.VITE_DELIVERY_CONFIGURED !== 'true') {
        const entries = JSON.parse(localStorage.getItem('fayz-demo-feedback') || '[]') as Feedback[]
        localStorage.setItem('fayz-demo-feedback', JSON.stringify([...entries, feedback]))
        setDemoSaved(true)
      } else {
        const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback) })
        if (!response.ok) throw new Error('submit failed')
      }
      localStorage.setItem('fayz-last-submitted', String(Date.now()))
      setScreen('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { setError(t.errorText) }
    finally { setBusy(false) }
  }

  function optionsFor(id: QuestionId) {
    if (id === 'reception' || id === 'cleanliness') return [
      { value: 2 as Answer, label: t.answers.great }, { value: 1 as Answer, label: t.answers.okay }, { value: 0 as Answer, label: t.answers.bad },
    ]
    if (id === 'waiting') return [
      { value: 2 as Answer, label: t.answers.no }, { value: 1 as Answer, label: t.answers.aLittle }, { value: 0 as Answer, label: t.answers.yes },
    ]
    if (id === 'recommend') return [
      { value: 2 as Answer, label: t.answers.yes }, { value: 1 as Answer, label: t.answers.maybe }, { value: 0 as Answer, label: t.answers.no },
    ]
    return [
      { value: 2 as Answer, label: t.answers.yes }, { value: 1 as Answer, label: t.answers.partly }, { value: 0 as Answer, label: t.answers.no },
    ]
  }

  const activeQuestion = step >= 2 && step <= 9 ? questionIds[step - 2] : null

  return <>
    <AnimatePresence>{introOpen && <IntroAnimation language={language} onComplete={finishIntro} />}</AnimatePresence>
    <motion.div id="site-content" aria-hidden={introOpen}
      initial={introOpen ? { opacity: 0, scale: 0.985, filter: reducedMotion ? 'none' : 'blur(8px)' } : false}
      animate={introOpen ? { opacity: 0, scale: 0.985, filter: reducedMotion ? 'none' : 'blur(8px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: reducedMotion ? 0.18 : 0.68, ease: [0.22, 1, 0.36, 1] }}>
  <div className="site-shell" style={{ '--primary': clinic.primaryColor } as CSSProperties}>
    <div className="top-line" />
    <header className="site-header">
      <button type="button" className="brand" onClick={reset} aria-label={clinic.name}>
        <LogoMark />
        <span className="brand-text"><strong>{clinic.displayName}</strong><small>{t.clinicSub}</small></span>
      </button>
      <div className="header-actions">
        <a className="header-phone" href={`tel:${clinic.phone}`}><Phone size={17} strokeWidth={2} /><span>{t.navHelp}</span></a>
        <div className="language-switch" role="group" aria-label="Language">
          {(['uz', 'ru', 'en'] as const).map(item => <button key={item} type="button" onClick={() => setLanguage(item)} className={language === item ? 'active' : ''} aria-pressed={language === item}>{item === 'uz' ? 'ЎЗ' : item.toUpperCase()}</button>)}
        </div>
      </div>
    </header>

    <main className={screen === 'welcome' ? 'main welcome-main' : 'main form-main'}>
      {screen === 'welcome' && <>
        <section className="welcome-card" aria-labelledby="hero-heading">
          <div className="welcome-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />{t.eyebrow}</span>
            <h1 id="hero-heading">{t.heroTitle}</h1>
            <p>{t.heroText}</p>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <button className="primary-button start-button" type="button" onClick={begin}>{t.start}<ArrowRight size={21} /></button>
            <div className="hero-notes"><span><Clock3 size={17} />{t.time}</span><span><LockKeyhole size={17} />{t.private}</span></div>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-ring ring-one" /><div className="art-ring ring-two" />
            <div className="art-center"><LogoMark size={92} /></div>
            <div className="art-pill pill-top"><HeartPulse size={20} /><span>{clinic.displayName}</span></div>
            <div className="art-pill pill-bottom"><ShieldCheck size={19} /><span>01 / 08</span></div>
            <div className="art-decoration decoration-one" /><div className="art-decoration decoration-two" />
          </div>
        </section>
        <section className="trust-strip" aria-label={t.trustTitle}>
          <div className="trust-icon"><HeartPulse size={25} /></div>
          <div><h2>{t.trustTitle}</h2><p>{t.trustText}</p></div>
          <span className="trust-line" />
        </section>
      </>}

      {screen === 'survey' && <section className="survey-card" aria-live="polite">
        <div className="survey-top"><span className="survey-kicker">{t.step} {String(step + 1).padStart(2, '0')} <span>{t.of} {TOTAL}</span></span><span className="survey-percent">{Math.round(((step + 1) / TOTAL) * 100)}%</span></div>
        <div className="progress-track" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL} aria-label={`${t.step} ${step + 1} ${t.of} ${TOTAL}`}><span style={{ width: `${((step + 1) / TOTAL) * 100}%` }} /></div>
        <div className="survey-body" key={`${step}-${language}`}>
          {step === 0 && <><div className="question-icon"><HeartPulse size={27} /></div><h1>{t.serviceTitle}</h1><p className="question-hint">{t.serviceHint}</p><div className="choices services">{clinic.services.map(item => <button className={`choice ${service === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => pickService(item.id)}><span>{item[language]}</span><span className="choice-circle">{service === item.id ? <Check size={18} /> : <ArrowRight size={17} />}</span></button>)}</div></>}
          {step === 1 && <><div className="question-icon"><HeartPulse size={27} /></div><h1>{t.doctorTitle}</h1><p className="question-hint">{t.doctorHint}</p><div className="choices">{clinic.doctors.map(item => <button className={`choice ${doctor === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => pickDoctor(item.id)}><span>{item.name}</span><span className="choice-circle"><ArrowRight size={17} /></span></button>)}<button className="choice" type="button" onClick={() => pickDoctor('unknown')}><span>{t.doctorUnknown}</span><span className="choice-circle"><ArrowRight size={17} /></span></button><button className="choice" type="button" onClick={() => pickDoctor('other')}><span>{t.doctorOther}</span><span className="choice-circle"><ArrowRight size={17} /></span></button></div></>}
          {activeQuestion && <><div className="question-icon">{activeQuestion === 'rating' ? <Star size={27} /> : <HeartPulse size={27} />}</div><h1>{t.questions[activeQuestion]}</h1><p className="question-hint">{t.choose}</p>{activeQuestion === 'rating' ? <><div className="rating-row" role="group" aria-label={t.questions.rating}>{([1, 2, 3, 4, 5] as Answer[]).map(value => <button key={value} type="button" className={`rating-button ${rating >= value ? 'filled' : ''}`} aria-label={`${value} / 5`} aria-pressed={rating === value} onClick={() => pickAnswer('rating', value)}><Star size={34} strokeWidth={1.7} fill={rating >= value ? 'currentColor' : 'none'} /><span>{value}</span></button>)}</div><div className="rating-caption"><span>{t.ratingLow}</span><span>{t.ratingHigh}</span></div></> : <div className="choices">{optionsFor(activeQuestion).map(option => <button className={`choice ${answers[activeQuestion] === option.value ? 'selected' : ''}`} type="button" key={option.value} onClick={() => pickAnswer(activeQuestion, option.value)}><span>{option.label}</span><span className="choice-circle">{answers[activeQuestion] === option.value ? <Check size={18} /> : <ArrowRight size={17} />}</span></button>)}</div>}</>}
          {step === 10 && <><div className="question-icon"><HeartPulse size={27} /></div><h1>{rating <= 3 ? t.lowTitle : t.commentTitle}</h1><p className="question-hint">{rating <= 3 ? t.lowHint : t.commentHint}</p><label className="field-label" htmlFor="feedback-comment">{t.commentTitle}</label><textarea id="feedback-comment" value={comment} maxLength={2000} onChange={event => setComment(event.target.value)} placeholder={t.commentPlaceholder} rows={5} /><button className="primary-button next-button" type="button" onClick={() => { setError(''); setStep(11) }}>{t.next}<ArrowRight size={20} /></button></>}
          {step === 11 && <><div className="question-icon"><Phone size={27} /></div><h1>{t.contactTitle}</h1><p className="question-hint">{t.contactHint}</p><div className="choices contact-choices"><button className={`choice ${wantsContact === false ? 'selected' : ''}`} type="button" onClick={() => { setWantsContact(false); setError('') }} aria-pressed={wantsContact === false}><span>{t.contactNo}</span><span className="choice-circle">{wantsContact === false ? <Check size={18} /> : <ArrowRight size={17} />}</span></button><button className={`choice ${wantsContact === true ? 'selected' : ''}`} type="button" onClick={() => { setWantsContact(true); setError('') }} aria-pressed={wantsContact === true}><span>{t.contactYes}</span><span className="choice-circle">{wantsContact === true ? <Check size={18} /> : <ArrowRight size={17} />}</span></button></div>{wantsContact && <div className="contact-fields"><label className="field-label" htmlFor="patient-name">{t.name}</label><input id="patient-name" autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder={t.namePlaceholder} /><label className="field-label" htmlFor="patient-phone">{t.phone}</label><div className={`phone-input${error === t.phoneError ? ' invalid' : ''}`}><span className="phone-prefix" id="phone-country-code">+998</span><input id="patient-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={formatLocalPhone(phone)} onChange={event => { setPhone(localPhoneDigits(event.target.value)); setError('') }} placeholder={t.phonePlaceholder} aria-describedby="phone-country-code" aria-invalid={error === t.phoneError} /></div></div>}<div className="honey" aria-hidden="true"><label htmlFor="website-field">Website</label><input id="website-field" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></div><button className="primary-button next-button" type="button" disabled={busy || wantsContact === null} onClick={submit}>{busy ? t.sending : t.send}{!busy && <ArrowRight size={20} />}</button></>}
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
        <div className="survey-footer"><button type="button" className="back-button" onClick={goBack}><ArrowLeft size={18} />{t.back}</button><span className="footer-lock"><LockKeyhole size={15} />{t.private}</span></div>
      </section>}

      {screen === 'success' && <section className="success-card" aria-live="polite"><div className="success-mark"><CheckCircle2 size={58} strokeWidth={1.6} /></div><span className="eyebrow"><span className="eyebrow-dot" />FAYZ PLUS</span><h1>{t.successTitle}</h1><p>{t.successText}</p>{demoSaved && <p className="demo-note">{t.demo}</p>}<button type="button" className="primary-button" onClick={reset}>{t.home}<ArrowRight size={20} /></button></section>}
    </main>

    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand"><div className="footer-brand-top"><LogoMark size={38} /><strong>{clinic.displayName}</strong></div><h2>{t.footerAbout}</h2><p>{t.footerText}</p></div>
        <div className="footer-detail"><h3>{t.address}</h3><p><MapPin size={18} />{clinic.address[language]}</p><h3>{t.schedule}</h3><p><Clock3 size={18} />{clinic.hours[language]}</p></div>
        <div className="footer-detail footer-links"><h3>{t.contact}</h3><a href={`tel:${clinic.phone}`}><Phone size={17} />+998 90 573 00 83</a><a href={`tel:${clinic.secondPhone}`}><Phone size={17} />+998 99 517 00 83</a><a href={clinic.website} target="_blank" rel="noreferrer"><Globe2 size={17} />{t.website}</a><div className="social-links">{clinic.telegram.map(handle => <a key={handle} href={`https://t.me/${handle}`} target="_blank" rel="noreferrer">Telegram @{handle}</a>)}{clinic.instagram.map(handle => <a key={handle} href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer">Instagram @{handle}</a>)}</div></div>
      </div>
      <div className="footer-bottom"><span>{t.rights}</span></div>
    </footer>
  </div>
  </motion.div>
  </>
}

export default App
