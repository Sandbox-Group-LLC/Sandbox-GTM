// Pre-built translations for all UI labels across supported languages
// These are used automatically on public event pages

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar';

export interface UITranslations {
  // Section headings
  featuredSpeakers: string;
  conferenceSchedule: string;
  ourSponsors: string;
  ourPartners: string;
  whyAttend: string;
  eventGallery: string;
  frequentlyAskedQuestions: string;
  testimonials: string;
  pricing: string;
  contactUs: string;
  aboutTheEvent: string;
  venue: string;
  
  // Buttons
  registerNow: string;
  getYourPass: string;
  learnMore: string;
  viewDetails: string;
  seeAllSpeakers: string;
  seeFullSchedule: string;
  bookNow: string;
  getStarted: string;
  submit: string;
  send: string;
  
  // Labels
  date: string;
  time: string;
  location: string;
  room: string;
  track: string;
  speaker: string;
  speakers: string;
  session: string;
  sessions: string;
  day: string;
  allDays: string;
  allTracks: string;
  keynote: string;
  workshop: string;
  panel: string;
  breakout: string;
  networking: string;
  
  // Speaker card
  ceo: string;
  cto: string;
  cmo: string;
  cfo: string;
  vp: string;
  director: string;
  manager: string;
  engineer: string;
  designer: string;
  founder: string;
  coFounder: string;
  
  // Event info
  publicEvent: string;
  privateEvent: string;
  registrationOpen: string;
  registrationClosed: string;
  soldOut: string;
  limitedSeats: string;
  freeEvent: string;
  
  // Registration
  completeRegistration: string;
  secureYourSpot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  
  // Footer
  allRightsReserved: string;
  privacyPolicy: string;
  termsOfService: string;
  contactEmail: string;
  followUs: string;
  
  // Misc
  readMore: string;
  showMore: string;
  showLess: string;
  viewAll: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  loading: string;
  noResults: string;
}

export const uiTranslations: Record<SupportedLocale, UITranslations> = {
  en: {
    // Section headings
    featuredSpeakers: "Featured Speakers",
    conferenceSchedule: "Conference Schedule",
    ourSponsors: "Our Sponsors",
    ourPartners: "Our Partners",
    whyAttend: "Why Attend?",
    eventGallery: "Event Gallery",
    frequentlyAskedQuestions: "Frequently Asked Questions",
    testimonials: "Testimonials",
    pricing: "Pricing",
    contactUs: "Contact Us",
    aboutTheEvent: "About the Event",
    venue: "Venue",
    
    // Buttons
    registerNow: "Register Now",
    getYourPass: "Get Your Pass",
    learnMore: "Learn More",
    viewDetails: "View Details",
    seeAllSpeakers: "See All Speakers",
    seeFullSchedule: "See Full Schedule",
    bookNow: "Book Now",
    getStarted: "Get Started",
    submit: "Submit",
    send: "Send",
    
    // Labels
    date: "Date",
    time: "Time",
    location: "Location",
    room: "Room",
    track: "Track",
    speaker: "Speaker",
    speakers: "Speakers",
    session: "Session",
    sessions: "Sessions",
    day: "Day",
    allDays: "All Days",
    allTracks: "All Tracks",
    keynote: "Keynote",
    workshop: "Workshop",
    panel: "Panel",
    breakout: "Breakout",
    networking: "Networking",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "Director",
    manager: "Manager",
    engineer: "Engineer",
    designer: "Designer",
    founder: "Founder",
    coFounder: "Co-Founder",
    
    // Event info
    publicEvent: "Public Event",
    privateEvent: "Private Event",
    registrationOpen: "Registration Open",
    registrationClosed: "Registration Closed",
    soldOut: "Sold Out",
    limitedSeats: "Limited Seats",
    freeEvent: "Free Event",
    
    // Registration
    completeRegistration: "Complete your registration",
    secureYourSpot: "Secure your spot",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    jobTitle: "Job Title",
    
    // Footer
    allRightsReserved: "All rights reserved",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    contactEmail: "Contact Email",
    followUs: "Follow Us",
    
    // Misc
    readMore: "Read More",
    showMore: "Show More",
    showLess: "Show Less",
    viewAll: "View All",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    loading: "Loading...",
    noResults: "No results found",
  },
  
  es: {
    // Section headings
    featuredSpeakers: "Ponentes Destacados",
    conferenceSchedule: "Programa de la Conferencia",
    ourSponsors: "Nuestros Patrocinadores",
    ourPartners: "Nuestros Socios",
    whyAttend: "¿Por Qué Asistir?",
    eventGallery: "Galería del Evento",
    frequentlyAskedQuestions: "Preguntas Frecuentes",
    testimonials: "Testimonios",
    pricing: "Precios",
    contactUs: "Contáctenos",
    aboutTheEvent: "Sobre el Evento",
    venue: "Lugar",
    
    // Buttons
    registerNow: "Regístrate Ahora",
    getYourPass: "Obtén Tu Pase",
    learnMore: "Saber Más",
    viewDetails: "Ver Detalles",
    seeAllSpeakers: "Ver Todos los Ponentes",
    seeFullSchedule: "Ver Programa Completo",
    bookNow: "Reservar Ahora",
    getStarted: "Comenzar",
    submit: "Enviar",
    send: "Enviar",
    
    // Labels
    date: "Fecha",
    time: "Hora",
    location: "Ubicación",
    room: "Sala",
    track: "Tema",
    speaker: "Ponente",
    speakers: "Ponentes",
    session: "Sesión",
    sessions: "Sesiones",
    day: "Día",
    allDays: "Todos los Días",
    allTracks: "Todos los Temas",
    keynote: "Conferencia Magistral",
    workshop: "Taller",
    panel: "Panel",
    breakout: "Sesión Paralela",
    networking: "Networking",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "Director",
    manager: "Gerente",
    engineer: "Ingeniero",
    designer: "Diseñador",
    founder: "Fundador",
    coFounder: "Cofundador",
    
    // Event info
    publicEvent: "Evento Público",
    privateEvent: "Evento Privado",
    registrationOpen: "Registro Abierto",
    registrationClosed: "Registro Cerrado",
    soldOut: "Agotado",
    limitedSeats: "Plazas Limitadas",
    freeEvent: "Evento Gratuito",
    
    // Registration
    completeRegistration: "Completa tu registro",
    secureYourSpot: "Asegura tu lugar",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo Electrónico",
    phone: "Teléfono",
    company: "Empresa",
    jobTitle: "Cargo",
    
    // Footer
    allRightsReserved: "Todos los derechos reservados",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    contactEmail: "Correo de Contacto",
    followUs: "Síguenos",
    
    // Misc
    readMore: "Leer Más",
    showMore: "Mostrar Más",
    showLess: "Mostrar Menos",
    viewAll: "Ver Todo",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    loading: "Cargando...",
    noResults: "No se encontraron resultados",
  },
  
  fr: {
    // Section headings
    featuredSpeakers: "Intervenants Vedettes",
    conferenceSchedule: "Programme de la Conférence",
    ourSponsors: "Nos Sponsors",
    ourPartners: "Nos Partenaires",
    whyAttend: "Pourquoi Participer?",
    eventGallery: "Galerie de l'Événement",
    frequentlyAskedQuestions: "Questions Fréquentes",
    testimonials: "Témoignages",
    pricing: "Tarifs",
    contactUs: "Contactez-Nous",
    aboutTheEvent: "À Propos de l'Événement",
    venue: "Lieu",
    
    // Buttons
    registerNow: "S'inscrire Maintenant",
    getYourPass: "Obtenez Votre Pass",
    learnMore: "En Savoir Plus",
    viewDetails: "Voir les Détails",
    seeAllSpeakers: "Voir Tous les Intervenants",
    seeFullSchedule: "Voir le Programme Complet",
    bookNow: "Réserver Maintenant",
    getStarted: "Commencer",
    submit: "Soumettre",
    send: "Envoyer",
    
    // Labels
    date: "Date",
    time: "Heure",
    location: "Lieu",
    room: "Salle",
    track: "Thème",
    speaker: "Intervenant",
    speakers: "Intervenants",
    session: "Session",
    sessions: "Sessions",
    day: "Jour",
    allDays: "Tous les Jours",
    allTracks: "Tous les Thèmes",
    keynote: "Keynote",
    workshop: "Atelier",
    panel: "Table Ronde",
    breakout: "Session Parallèle",
    networking: "Networking",
    
    // Speaker card
    ceo: "PDG",
    cto: "Directeur Technique",
    cmo: "Directeur Marketing",
    cfo: "Directeur Financier",
    vp: "VP",
    director: "Directeur",
    manager: "Manager",
    engineer: "Ingénieur",
    designer: "Designer",
    founder: "Fondateur",
    coFounder: "Cofondateur",
    
    // Event info
    publicEvent: "Événement Public",
    privateEvent: "Événement Privé",
    registrationOpen: "Inscriptions Ouvertes",
    registrationClosed: "Inscriptions Fermées",
    soldOut: "Complet",
    limitedSeats: "Places Limitées",
    freeEvent: "Événement Gratuit",
    
    // Registration
    completeRegistration: "Complétez votre inscription",
    secureYourSpot: "Réservez votre place",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    company: "Entreprise",
    jobTitle: "Poste",
    
    // Footer
    allRightsReserved: "Tous droits réservés",
    privacyPolicy: "Politique de Confidentialité",
    termsOfService: "Conditions d'Utilisation",
    contactEmail: "Email de Contact",
    followUs: "Suivez-Nous",
    
    // Misc
    readMore: "Lire Plus",
    showMore: "Afficher Plus",
    showLess: "Afficher Moins",
    viewAll: "Voir Tout",
    close: "Fermer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    loading: "Chargement...",
    noResults: "Aucun résultat trouvé",
  },
  
  de: {
    // Section headings
    featuredSpeakers: "Unsere Referenten",
    conferenceSchedule: "Konferenzprogramm",
    ourSponsors: "Unsere Sponsoren",
    ourPartners: "Unsere Partner",
    whyAttend: "Warum Teilnehmen?",
    eventGallery: "Veranstaltungsgalerie",
    frequentlyAskedQuestions: "Häufig Gestellte Fragen",
    testimonials: "Referenzen",
    pricing: "Preise",
    contactUs: "Kontakt",
    aboutTheEvent: "Über die Veranstaltung",
    venue: "Veranstaltungsort",
    
    // Buttons
    registerNow: "Jetzt Anmelden",
    getYourPass: "Pass Sichern",
    learnMore: "Mehr Erfahren",
    viewDetails: "Details Anzeigen",
    seeAllSpeakers: "Alle Referenten",
    seeFullSchedule: "Vollständiges Programm",
    bookNow: "Jetzt Buchen",
    getStarted: "Loslegen",
    submit: "Absenden",
    send: "Senden",
    
    // Labels
    date: "Datum",
    time: "Zeit",
    location: "Ort",
    room: "Raum",
    track: "Thema",
    speaker: "Referent",
    speakers: "Referenten",
    session: "Session",
    sessions: "Sessions",
    day: "Tag",
    allDays: "Alle Tage",
    allTracks: "Alle Themen",
    keynote: "Keynote",
    workshop: "Workshop",
    panel: "Podiumsdiskussion",
    breakout: "Breakout-Session",
    networking: "Networking",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "Direktor",
    manager: "Manager",
    engineer: "Ingenieur",
    designer: "Designer",
    founder: "Gründer",
    coFounder: "Mitgründer",
    
    // Event info
    publicEvent: "Öffentliche Veranstaltung",
    privateEvent: "Private Veranstaltung",
    registrationOpen: "Anmeldung Offen",
    registrationClosed: "Anmeldung Geschlossen",
    soldOut: "Ausverkauft",
    limitedSeats: "Begrenzte Plätze",
    freeEvent: "Kostenlose Veranstaltung",
    
    // Registration
    completeRegistration: "Anmeldung abschließen",
    secureYourSpot: "Platz sichern",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    phone: "Telefon",
    company: "Unternehmen",
    jobTitle: "Position",
    
    // Footer
    allRightsReserved: "Alle Rechte vorbehalten",
    privacyPolicy: "Datenschutz",
    termsOfService: "Nutzungsbedingungen",
    contactEmail: "Kontakt-E-Mail",
    followUs: "Folgen Sie Uns",
    
    // Misc
    readMore: "Mehr Lesen",
    showMore: "Mehr Anzeigen",
    showLess: "Weniger Anzeigen",
    viewAll: "Alle Anzeigen",
    close: "Schließen",
    back: "Zurück",
    next: "Weiter",
    previous: "Zurück",
    loading: "Laden...",
    noResults: "Keine Ergebnisse gefunden",
  },
  
  it: {
    // Section headings
    featuredSpeakers: "Relatori in Evidenza",
    conferenceSchedule: "Programma della Conferenza",
    ourSponsors: "I Nostri Sponsor",
    ourPartners: "I Nostri Partner",
    whyAttend: "Perché Partecipare?",
    eventGallery: "Galleria dell'Evento",
    frequentlyAskedQuestions: "Domande Frequenti",
    testimonials: "Testimonianze",
    pricing: "Prezzi",
    contactUs: "Contattaci",
    aboutTheEvent: "Sull'Evento",
    venue: "Sede",
    
    // Buttons
    registerNow: "Registrati Ora",
    getYourPass: "Ottieni il Tuo Pass",
    learnMore: "Scopri di Più",
    viewDetails: "Vedi Dettagli",
    seeAllSpeakers: "Vedi Tutti i Relatori",
    seeFullSchedule: "Vedi Programma Completo",
    bookNow: "Prenota Ora",
    getStarted: "Inizia",
    submit: "Invia",
    send: "Invia",
    
    // Labels
    date: "Data",
    time: "Ora",
    location: "Luogo",
    room: "Sala",
    track: "Tema",
    speaker: "Relatore",
    speakers: "Relatori",
    session: "Sessione",
    sessions: "Sessioni",
    day: "Giorno",
    allDays: "Tutti i Giorni",
    allTracks: "Tutti i Temi",
    keynote: "Keynote",
    workshop: "Workshop",
    panel: "Tavola Rotonda",
    breakout: "Sessione Parallela",
    networking: "Networking",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "Direttore",
    manager: "Manager",
    engineer: "Ingegnere",
    designer: "Designer",
    founder: "Fondatore",
    coFounder: "Cofondatore",
    
    // Event info
    publicEvent: "Evento Pubblico",
    privateEvent: "Evento Privato",
    registrationOpen: "Iscrizioni Aperte",
    registrationClosed: "Iscrizioni Chiuse",
    soldOut: "Esaurito",
    limitedSeats: "Posti Limitati",
    freeEvent: "Evento Gratuito",
    
    // Registration
    completeRegistration: "Completa la registrazione",
    secureYourSpot: "Assicurati il tuo posto",
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    phone: "Telefono",
    company: "Azienda",
    jobTitle: "Ruolo",
    
    // Footer
    allRightsReserved: "Tutti i diritti riservati",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Termini di Servizio",
    contactEmail: "Email di Contatto",
    followUs: "Seguici",
    
    // Misc
    readMore: "Leggi di Più",
    showMore: "Mostra di Più",
    showLess: "Mostra Meno",
    viewAll: "Vedi Tutto",
    close: "Chiudi",
    back: "Indietro",
    next: "Avanti",
    previous: "Precedente",
    loading: "Caricamento...",
    noResults: "Nessun risultato trovato",
  },
  
  pt: {
    // Section headings
    featuredSpeakers: "Palestrantes em Destaque",
    conferenceSchedule: "Programação da Conferência",
    ourSponsors: "Nossos Patrocinadores",
    ourPartners: "Nossos Parceiros",
    whyAttend: "Por Que Participar?",
    eventGallery: "Galeria do Evento",
    frequentlyAskedQuestions: "Perguntas Frequentes",
    testimonials: "Depoimentos",
    pricing: "Preços",
    contactUs: "Contato",
    aboutTheEvent: "Sobre o Evento",
    venue: "Local",
    
    // Buttons
    registerNow: "Registre-se Agora",
    getYourPass: "Garanta Seu Passe",
    learnMore: "Saiba Mais",
    viewDetails: "Ver Detalhes",
    seeAllSpeakers: "Ver Todos os Palestrantes",
    seeFullSchedule: "Ver Programação Completa",
    bookNow: "Reserve Agora",
    getStarted: "Começar",
    submit: "Enviar",
    send: "Enviar",
    
    // Labels
    date: "Data",
    time: "Hora",
    location: "Local",
    room: "Sala",
    track: "Trilha",
    speaker: "Palestrante",
    speakers: "Palestrantes",
    session: "Sessão",
    sessions: "Sessões",
    day: "Dia",
    allDays: "Todos os Dias",
    allTracks: "Todas as Trilhas",
    keynote: "Keynote",
    workshop: "Workshop",
    panel: "Painel",
    breakout: "Sessão Paralela",
    networking: "Networking",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "Diretor",
    manager: "Gerente",
    engineer: "Engenheiro",
    designer: "Designer",
    founder: "Fundador",
    coFounder: "Cofundador",
    
    // Event info
    publicEvent: "Evento Público",
    privateEvent: "Evento Privado",
    registrationOpen: "Inscrições Abertas",
    registrationClosed: "Inscrições Encerradas",
    soldOut: "Esgotado",
    limitedSeats: "Vagas Limitadas",
    freeEvent: "Evento Gratuito",
    
    // Registration
    completeRegistration: "Complete sua inscrição",
    secureYourSpot: "Garanta sua vaga",
    firstName: "Nome",
    lastName: "Sobrenome",
    email: "Email",
    phone: "Telefone",
    company: "Empresa",
    jobTitle: "Cargo",
    
    // Footer
    allRightsReserved: "Todos os direitos reservados",
    privacyPolicy: "Política de Privacidade",
    termsOfService: "Termos de Serviço",
    contactEmail: "Email de Contato",
    followUs: "Siga-nos",
    
    // Misc
    readMore: "Leia Mais",
    showMore: "Mostrar Mais",
    showLess: "Mostrar Menos",
    viewAll: "Ver Tudo",
    close: "Fechar",
    back: "Voltar",
    next: "Próximo",
    previous: "Anterior",
    loading: "Carregando...",
    noResults: "Nenhum resultado encontrado",
  },
  
  zh: {
    // Section headings
    featuredSpeakers: "特邀演讲嘉宾",
    conferenceSchedule: "会议日程",
    ourSponsors: "赞助商",
    ourPartners: "合作伙伴",
    whyAttend: "为什么参加？",
    eventGallery: "活动图集",
    frequentlyAskedQuestions: "常见问题",
    testimonials: "参会感言",
    pricing: "价格",
    contactUs: "联系我们",
    aboutTheEvent: "关于活动",
    venue: "场地",
    
    // Buttons
    registerNow: "立即注册",
    getYourPass: "获取通行证",
    learnMore: "了解更多",
    viewDetails: "查看详情",
    seeAllSpeakers: "查看所有演讲者",
    seeFullSchedule: "查看完整日程",
    bookNow: "立即预订",
    getStarted: "开始",
    submit: "提交",
    send: "发送",
    
    // Labels
    date: "日期",
    time: "时间",
    location: "地点",
    room: "会议室",
    track: "主题",
    speaker: "演讲者",
    speakers: "演讲者",
    session: "场次",
    sessions: "场次",
    day: "日",
    allDays: "所有日期",
    allTracks: "所有主题",
    keynote: "主题演讲",
    workshop: "工作坊",
    panel: "圆桌讨论",
    breakout: "分组讨论",
    networking: "社交活动",
    
    // Speaker card
    ceo: "首席执行官",
    cto: "首席技术官",
    cmo: "首席营销官",
    cfo: "首席财务官",
    vp: "副总裁",
    director: "总监",
    manager: "经理",
    engineer: "工程师",
    designer: "设计师",
    founder: "创始人",
    coFounder: "联合创始人",
    
    // Event info
    publicEvent: "公开活动",
    privateEvent: "私人活动",
    registrationOpen: "开放注册",
    registrationClosed: "注册已关闭",
    soldOut: "售罄",
    limitedSeats: "名额有限",
    freeEvent: "免费活动",
    
    // Registration
    completeRegistration: "完成注册",
    secureYourSpot: "预留您的席位",
    firstName: "名",
    lastName: "姓",
    email: "电子邮件",
    phone: "电话",
    company: "公司",
    jobTitle: "职位",
    
    // Footer
    allRightsReserved: "版权所有",
    privacyPolicy: "隐私政策",
    termsOfService: "服务条款",
    contactEmail: "联系邮箱",
    followUs: "关注我们",
    
    // Misc
    readMore: "阅读更多",
    showMore: "显示更多",
    showLess: "收起",
    viewAll: "查看全部",
    close: "关闭",
    back: "返回",
    next: "下一步",
    previous: "上一步",
    loading: "加载中...",
    noResults: "未找到结果",
  },
  
  ja: {
    // Section headings
    featuredSpeakers: "注目のスピーカー",
    conferenceSchedule: "カンファレンススケジュール",
    ourSponsors: "スポンサー",
    ourPartners: "パートナー",
    whyAttend: "参加する理由",
    eventGallery: "イベントギャラリー",
    frequentlyAskedQuestions: "よくある質問",
    testimonials: "参加者の声",
    pricing: "料金",
    contactUs: "お問い合わせ",
    aboutTheEvent: "イベントについて",
    venue: "会場",
    
    // Buttons
    registerNow: "今すぐ登録",
    getYourPass: "パスを取得",
    learnMore: "詳細を見る",
    viewDetails: "詳細を表示",
    seeAllSpeakers: "全スピーカーを見る",
    seeFullSchedule: "全スケジュールを見る",
    bookNow: "今すぐ予約",
    getStarted: "始める",
    submit: "送信",
    send: "送信",
    
    // Labels
    date: "日付",
    time: "時間",
    location: "場所",
    room: "会議室",
    track: "トラック",
    speaker: "スピーカー",
    speakers: "スピーカー",
    session: "セッション",
    sessions: "セッション",
    day: "日",
    allDays: "すべての日",
    allTracks: "すべてのトラック",
    keynote: "基調講演",
    workshop: "ワークショップ",
    panel: "パネルディスカッション",
    breakout: "分科会",
    networking: "ネットワーキング",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "ディレクター",
    manager: "マネージャー",
    engineer: "エンジニア",
    designer: "デザイナー",
    founder: "創業者",
    coFounder: "共同創業者",
    
    // Event info
    publicEvent: "公開イベント",
    privateEvent: "プライベートイベント",
    registrationOpen: "登録受付中",
    registrationClosed: "登録終了",
    soldOut: "完売",
    limitedSeats: "席数限定",
    freeEvent: "無料イベント",
    
    // Registration
    completeRegistration: "登録を完了",
    secureYourSpot: "席を確保",
    firstName: "名",
    lastName: "姓",
    email: "メール",
    phone: "電話番号",
    company: "会社名",
    jobTitle: "役職",
    
    // Footer
    allRightsReserved: "無断複写・転載を禁じます",
    privacyPolicy: "プライバシーポリシー",
    termsOfService: "利用規約",
    contactEmail: "連絡先メール",
    followUs: "フォロー",
    
    // Misc
    readMore: "続きを読む",
    showMore: "もっと見る",
    showLess: "閉じる",
    viewAll: "すべて見る",
    close: "閉じる",
    back: "戻る",
    next: "次へ",
    previous: "前へ",
    loading: "読み込み中...",
    noResults: "結果が見つかりません",
  },
  
  ko: {
    // Section headings
    featuredSpeakers: "주요 연사",
    conferenceSchedule: "컨퍼런스 일정",
    ourSponsors: "후원사",
    ourPartners: "파트너",
    whyAttend: "참석 이유",
    eventGallery: "이벤트 갤러리",
    frequentlyAskedQuestions: "자주 묻는 질문",
    testimonials: "참가자 후기",
    pricing: "가격",
    contactUs: "문의하기",
    aboutTheEvent: "이벤트 소개",
    venue: "장소",
    
    // Buttons
    registerNow: "지금 등록",
    getYourPass: "패스 받기",
    learnMore: "자세히 보기",
    viewDetails: "상세 보기",
    seeAllSpeakers: "모든 연사 보기",
    seeFullSchedule: "전체 일정 보기",
    bookNow: "지금 예약",
    getStarted: "시작하기",
    submit: "제출",
    send: "보내기",
    
    // Labels
    date: "날짜",
    time: "시간",
    location: "장소",
    room: "회의실",
    track: "트랙",
    speaker: "연사",
    speakers: "연사",
    session: "세션",
    sessions: "세션",
    day: "일",
    allDays: "전체 일정",
    allTracks: "전체 트랙",
    keynote: "기조연설",
    workshop: "워크숍",
    panel: "패널 토론",
    breakout: "분과 세션",
    networking: "네트워킹",
    
    // Speaker card
    ceo: "CEO",
    cto: "CTO",
    cmo: "CMO",
    cfo: "CFO",
    vp: "VP",
    director: "이사",
    manager: "매니저",
    engineer: "엔지니어",
    designer: "디자이너",
    founder: "창업자",
    coFounder: "공동 창업자",
    
    // Event info
    publicEvent: "공개 이벤트",
    privateEvent: "비공개 이벤트",
    registrationOpen: "등록 접수 중",
    registrationClosed: "등록 마감",
    soldOut: "매진",
    limitedSeats: "좌석 한정",
    freeEvent: "무료 이벤트",
    
    // Registration
    completeRegistration: "등록 완료",
    secureYourSpot: "자리 확보",
    firstName: "이름",
    lastName: "성",
    email: "이메일",
    phone: "전화번호",
    company: "회사",
    jobTitle: "직책",
    
    // Footer
    allRightsReserved: "모든 권리 보유",
    privacyPolicy: "개인정보처리방침",
    termsOfService: "서비스 이용약관",
    contactEmail: "연락처 이메일",
    followUs: "팔로우",
    
    // Misc
    readMore: "더 읽기",
    showMore: "더 보기",
    showLess: "접기",
    viewAll: "전체 보기",
    close: "닫기",
    back: "뒤로",
    next: "다음",
    previous: "이전",
    loading: "로딩 중...",
    noResults: "결과 없음",
  },
  
  ar: {
    // Section headings
    featuredSpeakers: "المتحدثون المميزون",
    conferenceSchedule: "جدول المؤتمر",
    ourSponsors: "الرعاة",
    ourPartners: "الشركاء",
    whyAttend: "لماذا الحضور؟",
    eventGallery: "معرض الفعالية",
    frequentlyAskedQuestions: "الأسئلة الشائعة",
    testimonials: "آراء المشاركين",
    pricing: "الأسعار",
    contactUs: "اتصل بنا",
    aboutTheEvent: "عن الفعالية",
    venue: "المكان",
    
    // Buttons
    registerNow: "سجل الآن",
    getYourPass: "احصل على تذكرتك",
    learnMore: "اعرف المزيد",
    viewDetails: "عرض التفاصيل",
    seeAllSpeakers: "عرض جميع المتحدثين",
    seeFullSchedule: "عرض الجدول الكامل",
    bookNow: "احجز الآن",
    getStarted: "ابدأ",
    submit: "إرسال",
    send: "إرسال",
    
    // Labels
    date: "التاريخ",
    time: "الوقت",
    location: "الموقع",
    room: "القاعة",
    track: "المسار",
    speaker: "المتحدث",
    speakers: "المتحدثون",
    session: "الجلسة",
    sessions: "الجلسات",
    day: "اليوم",
    allDays: "كل الأيام",
    allTracks: "كل المسارات",
    keynote: "الكلمة الرئيسية",
    workshop: "ورشة عمل",
    panel: "حلقة نقاش",
    breakout: "جلسة فرعية",
    networking: "التواصل",
    
    // Speaker card
    ceo: "الرئيس التنفيذي",
    cto: "المدير التقني",
    cmo: "مدير التسويق",
    cfo: "المدير المالي",
    vp: "نائب الرئيس",
    director: "مدير",
    manager: "مدير",
    engineer: "مهندس",
    designer: "مصمم",
    founder: "المؤسس",
    coFounder: "المؤسس المشارك",
    
    // Event info
    publicEvent: "فعالية عامة",
    privateEvent: "فعالية خاصة",
    registrationOpen: "التسجيل مفتوح",
    registrationClosed: "التسجيل مغلق",
    soldOut: "نفدت التذاكر",
    limitedSeats: "مقاعد محدودة",
    freeEvent: "فعالية مجانية",
    
    // Registration
    completeRegistration: "أكمل التسجيل",
    secureYourSpot: "احجز مكانك",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    company: "الشركة",
    jobTitle: "المسمى الوظيفي",
    
    // Footer
    allRightsReserved: "جميع الحقوق محفوظة",
    privacyPolicy: "سياسة الخصوصية",
    termsOfService: "شروط الخدمة",
    contactEmail: "البريد الإلكتروني للتواصل",
    followUs: "تابعنا",
    
    // Misc
    readMore: "اقرأ المزيد",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    viewAll: "عرض الكل",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    loading: "جاري التحميل...",
    noResults: "لا توجد نتائج",
  },
};

// Helper to get translations for a locale, with English fallback
export function getUITranslations(locale: string): UITranslations {
  const supportedLocale = locale as SupportedLocale;
  return uiTranslations[supportedLocale] || uiTranslations.en;
}

// Helper to get a specific translation key
export function t(locale: string, key: keyof UITranslations): string {
  const translations = getUITranslations(locale);
  return translations[key] || uiTranslations.en[key] || key;
}
