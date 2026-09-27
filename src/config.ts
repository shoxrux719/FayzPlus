export const clinic = {
  name: 'Fayz Plus',
  displayName: 'FAYZ PLUS',
  logo: '/logo-mark.png?v=original',
  primaryColor: '#0c776d',
  phone: '+998905730083',
  secondPhone: '+998995170083',
  address: {
    uz: 'Андижон вилояти, Балиқчи тумани, Чинобод шаҳарчаси. Мўлжал: 54-мактаб',
    ru: 'Андижанская область, Балыкчинский район, посёлок Чинобод. Ориентир: школа №54',
    en: 'Chinobod, Baliqchi District, Andijan Region. Landmark: School 54',
  },
  hours: { uz: 'Душанба–Шанба, 09:00–16:00', ru: 'Понедельник–суббота, 09:00–16:00', en: 'Monday–Saturday, 09:00–16:00' },
  website: 'https://www.fayzplus.uz',
  telegram: ['fayz1717', 'fayz1718'],
  instagram: ['chinobod_fayz', 'nevro_help', 'drzokirjonov'],
  branches: [{ id: 'chinobod', name: 'Чинобод' }],
  doctors: [] as { id: string; name: string }[],
  services: [
    { id: 'consultation', uz: 'Шифокор маслаҳати', ru: 'Консультация врача', en: 'Doctor consultation' },
    { id: 'endoscopy', uz: 'Эндоскопик жарроҳлик', ru: 'Эндоскопическая хирургия', en: 'Endoscopic surgery' },
    { id: 'neuralgia', uz: 'Уч шохли нерв невралгиясини даволаш', ru: 'Лечение невралгии тройничного нерва', en: 'Trigeminal neuralgia care' },
    { id: 'spine', uz: 'Умуртқа поғонасини даволаш', ru: 'Лечение позвоночника', en: 'Spine treatment' },
    { id: 'rehab', uz: 'Реабилитация', ru: 'Реабилитация', en: 'Rehabilitation' },
    { id: 'other', uz: 'Бошқа хизмат', ru: 'Другая услуга', en: 'Other service' },
  ],
} as const

export type Language = 'uz' | 'ru' | 'en'
export type QuestionId = 'reception' | 'staff' | 'consultation' | 'explanation' | 'cleanliness' | 'waiting' | 'rating' | 'recommend'
export type Answer = 0 | 1 | 2 | 3 | 4 | 5
export type Feedback = {
  language: Language
  branch: string
  source: string
  service: string
  doctor: string
  answers: Record<QuestionId, Answer>
  rating: number
  comment: string
  name: string
  phone: string
  wantsContact: boolean
  startedAt: number
  website: string
}
