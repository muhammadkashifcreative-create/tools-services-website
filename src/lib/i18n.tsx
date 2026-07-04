import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type LangDef = { code: string; label: string; flag: string; rtl?: boolean };
export const LANGUAGES: readonly LangDef[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Malaysia", flag: "🇲🇾" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
];

export type LangCode = "en" | "es" | "fr" | "de" | "it" | "pt" | "ru" | "zh" | "ja" | "hi" | "id" | "ms" | "tr" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.tools": "Tools Store",
  "nav.blog": "Blog",
  "nav.platforms": "Platforms",
  "nav.features": "Features",
  "nav.how": "How it works",
  "nav.faq": "FAQ",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.support": "Support",
  "nav.dashboard": "Dashboard",
  "nav.newOrder": "New Order",
  "nav.orders": "Orders",
  "nav.wallet": "Wallet",
  "nav.cases": "Cases",
  "nav.admin": "Admin",
  "cta.signIn": "Login",
  "cta.getStarted": "Get started",
  "cta.signOut": "Sign out",
  "cta.newCase": "Open a case",
  "cta.submit": "Submit",
  "cta.reply": "Send reply",
  "case.subject": "Subject",
  "case.category": "Category",
  "case.priority": "Priority",
  "case.status": "Status",
  "case.message": "Describe your issue",
  "language.label": "Language",
  "footer.tagline": "Premium digital tools and subscriptions, delivered instantly worldwide.",
};

const dicts: Record<LangCode, Dict> = {
  en,
  es: {
    "nav.home": "Inicio", "nav.tools": "Herramientas", "nav.blog": "Blog", "nav.platforms": "Plataformas",
    "nav.features": "Características", "nav.how": "Cómo funciona", "nav.faq": "FAQ",
    "nav.about": "Acerca", "nav.contact": "Contacto", "nav.support": "Soporte", "nav.dashboard": "Panel",
    "nav.newOrder": "Nuevo pedido", "nav.orders": "Pedidos", "nav.wallet": "Cartera",
    "nav.cases": "Casos", "nav.admin": "Admin",
    "cta.signIn": "Iniciar sesión", "cta.getStarted": "Empezar", "cta.signOut": "Cerrar sesión",
    "cta.newCase": "Abrir un caso", "cta.submit": "Enviar", "cta.reply": "Responder",
    "language.label": "Idioma",
    "footer.tagline": "Herramientas digitales premium y suscripciones, entregadas al instante en todo el mundo.",
  },
  fr: {
    "nav.home": "Accueil", "nav.tools": "Outils", "nav.blog": "Blog", "nav.platforms": "Plateformes",
    "nav.features": "Fonctions", "nav.how": "Comment ça marche", "nav.faq": "FAQ",
    "nav.about": "À propos", "nav.contact": "Contact", "nav.support": "Support", "nav.dashboard": "Tableau",
    "nav.newOrder": "Nouvelle commande", "nav.orders": "Commandes", "nav.wallet": "Portefeuille",
    "nav.cases": "Cas", "nav.admin": "Admin",
    "cta.signIn": "Connexion", "cta.getStarted": "Commencer", "cta.signOut": "Déconnexion",
    "cta.newCase": "Ouvrir un cas", "cta.submit": "Envoyer", "cta.reply": "Répondre",
    "language.label": "Langue",
    "footer.tagline": "Outils numériques premium et abonnements, livrés instantanément dans le monde entier.",
  },
  de: {
    "nav.home": "Start", "nav.tools": "Tools", "nav.blog": "Blog", "nav.platforms": "Plattformen",
    "nav.features": "Funktionen", "nav.how": "So funktioniert's", "nav.faq": "FAQ",
    "nav.about": "Über", "nav.contact": "Kontakt", "nav.support": "Support", "nav.dashboard": "Dashboard",
    "nav.newOrder": "Neue Bestellung", "nav.orders": "Bestellungen", "nav.wallet": "Wallet",
    "nav.cases": "Fälle", "nav.admin": "Admin",
    "cta.signIn": "Anmelden", "cta.getStarted": "Loslegen", "cta.signOut": "Abmelden",
    "cta.newCase": "Fall öffnen", "cta.submit": "Senden", "cta.reply": "Antworten",
    "language.label": "Sprache",
    "footer.tagline": "Premium-Digitaltools und Abonnements – weltweit sofort geliefert.",
  },
  it: {
    "nav.home": "Home", "nav.tools": "Strumenti", "nav.blog": "Blog", "nav.platforms": "Piattaforme",
    "nav.features": "Funzioni", "nav.how": "Come funziona", "nav.faq": "FAQ",
    "nav.about": "Chi siamo", "nav.contact": "Contatti", "nav.support": "Supporto", "nav.dashboard": "Dashboard",
    "nav.newOrder": "Nuovo ordine", "nav.orders": "Ordini", "nav.wallet": "Portafoglio",
    "nav.cases": "Casi", "nav.admin": "Admin",
    "cta.signIn": "Accedi", "cta.getStarted": "Inizia", "cta.signOut": "Esci",
    "cta.newCase": "Apri un caso", "cta.submit": "Invia", "cta.reply": "Rispondi",
    "language.label": "Lingua",
    "footer.tagline": "Strumenti digitali premium e abbonamenti, consegnati all'istante in tutto il mondo.",
  },
  pt: {
    "nav.home": "Início", "nav.tools": "Ferramentas", "nav.blog": "Blog", "nav.platforms": "Plataformas",
    "nav.features": "Recursos", "nav.how": "Como funciona", "nav.faq": "FAQ",
    "nav.about": "Sobre", "nav.contact": "Contacto", "nav.support": "Suporte", "nav.dashboard": "Painel",
    "nav.newOrder": "Novo pedido", "nav.orders": "Pedidos", "nav.wallet": "Carteira",
    "nav.cases": "Casos", "nav.admin": "Admin",
    "cta.signIn": "Entrar", "cta.getStarted": "Começar", "cta.signOut": "Sair",
    "cta.newCase": "Abrir caso", "cta.submit": "Enviar", "cta.reply": "Responder",
    "language.label": "Idioma",
    "footer.tagline": "Ferramentas digitais premium e subscrições, entregues instantaneamente em todo o mundo.",
  },
  ru: {
    "nav.home": "Главная", "nav.tools": "Инструменты", "nav.blog": "Блог", "nav.platforms": "Платформы",
    "nav.features": "Возможности", "nav.how": "Как это работает", "nav.faq": "ЧаВо",
    "nav.about": "О нас", "nav.contact": "Контакты", "nav.support": "Поддержка", "nav.dashboard": "Панель",
    "nav.newOrder": "Новый заказ", "nav.orders": "Заказы", "nav.wallet": "Кошелёк",
    "nav.cases": "Заявки", "nav.admin": "Админ",
    "cta.signIn": "Войти", "cta.getStarted": "Начать", "cta.signOut": "Выйти",
    "cta.newCase": "Открыть заявку", "cta.submit": "Отправить", "cta.reply": "Ответить",
    "language.label": "Язык",
    "footer.tagline": "Премиальные цифровые инструменты и подписки — мгновенная доставка по всему миру.",
  },
  zh: {
    "nav.home": "首页", "nav.tools": "工具", "nav.blog": "博客", "nav.platforms": "平台",
    "nav.features": "功能", "nav.how": "工作方式", "nav.faq": "常见问题",
    "nav.about": "关于", "nav.contact": "联系", "nav.support": "支持", "nav.dashboard": "仪表板",
    "nav.newOrder": "新订单", "nav.orders": "订单", "nav.wallet": "钱包",
    "nav.cases": "工单", "nav.admin": "管理",
    "cta.signIn": "登录", "cta.getStarted": "开始", "cta.signOut": "退出",
    "cta.newCase": "提交工单", "cta.submit": "提交", "cta.reply": "回复",
    "language.label": "语言",
    "footer.tagline": "优质数字工具与订阅，全球即时交付。",
  },
  ja: {
    "nav.home": "ホーム", "nav.tools": "ツール", "nav.blog": "ブログ", "nav.platforms": "プラットフォーム",
    "nav.features": "機能", "nav.how": "使い方", "nav.faq": "FAQ",
    "nav.about": "概要", "nav.contact": "お問い合わせ", "nav.support": "サポート", "nav.dashboard": "ダッシュボード",
    "nav.newOrder": "新規注文", "nav.orders": "注文", "nav.wallet": "ウォレット",
    "nav.cases": "ケース", "nav.admin": "管理",
    "cta.signIn": "ログイン", "cta.getStarted": "開始", "cta.signOut": "ログアウト",
    "cta.newCase": "ケース作成", "cta.submit": "送信", "cta.reply": "返信",
    "language.label": "言語",
    "footer.tagline": "プレミアムなデジタルツールとサブスクリプションを世界中に即時お届け。",
  },
  hi: {
    "nav.home": "होम", "nav.tools": "टूल्स", "nav.blog": "ब्लॉग", "nav.platforms": "प्लेटफ़ॉर्म",
    "nav.features": "विशेषताएँ", "nav.how": "कैसे काम करता है", "nav.faq": "सामान्य प्रश्न",
    "nav.about": "हमारे बारे में", "nav.contact": "संपर्क", "nav.support": "सहायता", "nav.dashboard": "डैशबोर्ड",
    "nav.newOrder": "नया ऑर्डर", "nav.orders": "ऑर्डर", "nav.wallet": "वॉलेट",
    "nav.cases": "केस", "nav.admin": "एडमिन",
    "cta.signIn": "साइन इन", "cta.getStarted": "शुरू करें", "cta.signOut": "साइन आउट",
    "cta.newCase": "केस खोलें", "cta.submit": "सबमिट", "cta.reply": "उत्तर",
    "language.label": "भाषा",
    "footer.tagline": "प्रीमियम डिजिटल टूल्स और सब्सक्रिप्शन — दुनिया भर में तुरंत डिलीवरी।",
  },
  id: {
    "nav.home": "Beranda", "nav.tools": "Alat", "nav.blog": "Blog", "nav.platforms": "Platform",
    "nav.features": "Fitur", "nav.how": "Cara kerja", "nav.faq": "FAQ",
    "nav.about": "Tentang", "nav.contact": "Kontak", "nav.support": "Dukungan", "nav.dashboard": "Dasbor",
    "nav.newOrder": "Pesanan baru", "nav.orders": "Pesanan", "nav.wallet": "Dompet",
    "nav.cases": "Tiket", "nav.admin": "Admin",
    "cta.signIn": "Masuk", "cta.getStarted": "Mulai", "cta.signOut": "Keluar",
    "cta.newCase": "Buka tiket", "cta.submit": "Kirim", "cta.reply": "Balas",
    "language.label": "Bahasa",
    "footer.tagline": "Alat digital premium dan langganan, dikirim instan ke seluruh dunia.",
  },
  ms: {
    "nav.home": "Utama", "nav.tools": "Alatan", "nav.blog": "Blog", "nav.platforms": "Platform",
    "nav.features": "Ciri", "nav.how": "Cara berfungsi", "nav.faq": "FAQ",
    "nav.about": "Tentang", "nav.contact": "Hubungi", "nav.support": "Sokongan", "nav.dashboard": "Papan Pemuka",
    "nav.newOrder": "Pesanan baru", "nav.orders": "Pesanan", "nav.wallet": "Dompet",
    "nav.cases": "Tiket", "nav.admin": "Admin",
    "cta.signIn": "Log masuk", "cta.getStarted": "Mula", "cta.signOut": "Log keluar",
    "cta.newCase": "Buka tiket", "cta.submit": "Hantar", "cta.reply": "Balas",
    "language.label": "Bahasa",
    "footer.tagline": "Alatan digital premium dan langganan, dihantar serta-merta ke seluruh dunia.",
  },
  tr: {
    "nav.home": "Ana sayfa", "nav.tools": "Araçlar", "nav.blog": "Blog", "nav.platforms": "Platformlar",
    "nav.features": "Özellikler", "nav.how": "Nasıl çalışır", "nav.faq": "SSS",
    "nav.about": "Hakkında", "nav.contact": "İletişim", "nav.support": "Destek", "nav.dashboard": "Panel",
    "nav.newOrder": "Yeni sipariş", "nav.orders": "Siparişler", "nav.wallet": "Cüzdan",
    "nav.cases": "Talepler", "nav.admin": "Yönetici",
    "cta.signIn": "Giriş", "cta.getStarted": "Başla", "cta.signOut": "Çıkış",
    "cta.newCase": "Talep aç", "cta.submit": "Gönder", "cta.reply": "Yanıtla",
    "language.label": "Dil",
    "footer.tagline": "Premium dijital araçlar ve abonelikler, dünya çapında anında teslim.",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.tools": "الأدوات", "nav.blog": "المدونة", "nav.platforms": "المنصات",
    "nav.features": "الميزات", "nav.how": "كيف يعمل", "nav.faq": "الأسئلة",
    "nav.about": "حول", "nav.contact": "اتصل", "nav.support": "الدعم", "nav.dashboard": "لوحة التحكم",
    "nav.newOrder": "طلب جديد", "nav.orders": "الطلبات", "nav.wallet": "المحفظة",
    "nav.cases": "التذاكر", "nav.admin": "المشرف",
    "cta.signIn": "تسجيل الدخول", "cta.getStarted": "ابدأ", "cta.signOut": "خروج",
    "cta.newCase": "افتح تذكرة", "cta.submit": "إرسال", "cta.reply": "رد",
    "language.label": "اللغة",
    "footer.tagline": "أدوات رقمية متميزة واشتراكات تُسلَّم فوراً في جميع أنحاء العالم.",
  },
};

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "socialpadu_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved && dicts[saved]) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    const isRtl = LANGUAGES.find((l) => l.code === lang)?.rtl;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    },
    t: (key, fallback) => dicts[lang]?.[key] ?? en[key] ?? fallback ?? key,
  }), [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) return { lang: "en" as LangCode, setLang: () => {}, t: (_k: string, f?: string) => f ?? _k };
  return ctx;
}