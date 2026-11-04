/* ============================================================
   Новокурьинская — demo components
   Vanilla + Alpine.js. No build step, no framework runtime.
   ============================================================ */

/* ---------------------------------------------------------------
   Shared data
   --------------------------------------------------------------- */
window.NV = window.NV || {};

window.NV.CITIES = [
  'Екатеринбург',
  'Верхняя Пышма',
  'Берёзовский',
  'Среднеуральск',
  'Большой Исток',
  'Арамиль',
  'Первоуральск',
  'Ревда',
  'Полевской',
  'Асбест',
  'Нижний Тагил',
];

/* Телефон привязан к городу: при смене города меняется номер. */
window.NV.PHONES = {
  'Екатеринбург':      { raw: '+73432707777', pretty: '+7 (343) 270-77-77' },
  'Верхняя Пышма':     { raw: '+73432707778', pretty: '+7 (343) 270-77-78' },
  'Берёзовский':       { raw: '+73432707779', pretty: '+7 (343) 270-77-79' },
  'Среднеуральск':     { raw: '+73432707780', pretty: '+7 (343) 270-77-80' },
  'Большой Исток':     { raw: '+73432707781', pretty: '+7 (343) 270-77-81' },
  'Арамиль':           { raw: '+73432707782', pretty: '+7 (343) 270-77-82' },
  'Первоуральск':      { raw: '+73439647777', pretty: '+7 (3439) 64-77-77' },
  'Ревда':             { raw: '+73439757777', pretty: '+7 (34397) 5-77-77' },
  'Полевской':         { raw: '+73435047777', pretty: '+7 (34350) 4-77-77' },
  'Асбест':            { raw: '+73436577777', pretty: '+7 (34365) 7-77-77' },
  'Нижний Тагил':      { raw: '+73435417777', pretty: '+7 (3435) 41-77-77' },
};

/* Время доставки. Часть интервалов недоступна — как в реальном расписании курьеров. */
window.NV.SLOTS = [
  '08:00–10:00',
  '10:00–12:00',
  '12:00–14:00',
  '14:00–16:00',
  '16:00–18:00',
  '17:00–19:00',
  '19:00–21:00',
  '21:00–22:30',
];

/**
 * Доступность интервала. Детерминированная заглушка: в бою приходит из API
 * расписания курьеров по конкретному адресу и дате.
 */
window.NV.slotState = function slotState(dateIdx, slotIdx) {
  const seed = (dateIdx * 31 + slotIdx * 17 + dateIdx * slotIdx * 7 + 5) % 11;
  if (dateIdx === 0 && slotIdx < 2) return { ok: false, reason: 'Этот интервал уже прошёл' };
  if (seed === 0 || seed === 1) return { ok: false, reason: 'Все курьеры на это время заняты' };
  if (seed === 5 && dateIdx > 1) return { ok: false, reason: 'Приём заказов на этот интервал закрыт' };
  if (seed === 8 && dateIdx === 0) return { ok: false, reason: 'На сегодня интервал заполнен' };
  return { ok: true, reason: '' };
};

/* ---------------------------------------------------------------
   Alpine components
   --------------------------------------------------------------- */
document.addEventListener('alpine:init', () => {
  /* ---------- выбор города (кастомный дропдаун) ---------- */
  Alpine.data('cityPicker', () => ({
    open: false,
    city: 'Екатеринбург',
    cities: window.NV.CITIES,
    init() {
      try {
        const saved = localStorage.getItem('nv-city');
        if (saved) this.city = saved;
      } catch (_) {}
    },
    pick(c) {
      this.city = c;
      this.open = false;
      try {
        localStorage.setItem('nv-city', c);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nv:city', { detail: c }));
    },
    get phone() {
      return window.NV.PHONES[this.city] || window.NV.PHONES['Екатеринбург'];
    },
  }));

  /* ---------- город: нижняя шторка на телефоне ----------
     Выезжает снизу, закрывается крестиком, тапом по фону или свайпом вниз. */
  Alpine.data('citySheet', () => ({
    open: false,
    city: 'Екатеринбург',
    cities: window.NV.CITIES,
    dragging: false,
    dragY: 0,
    startY: null,

    init() {
      try {
        const saved = localStorage.getItem('nv-city');
        if (saved) this.city = saved;
      } catch (_) {}
      window.addEventListener('nv:city', (e) => {
        this.city = e.detail;
      });
    },

    show() {
      this.dragY = 0;
      this.open = true;
      document.documentElement.style.overflow = 'hidden';
    },
    close() {
      this.open = false;
      this.dragY = 0;
      this.dragging = false;
      document.documentElement.style.overflow = '';
    },
    pick(c) {
      this.city = c;
      try {
        localStorage.setItem('nv-city', c);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nv:city', { detail: c }));
      this.close();
    },

    start(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.dragging = true;
      this.startY = e.clientY;
      this.dragY = 0;
    },
    move(e) {
      if (!this.dragging || this.startY === null) return;
      this.dragY = Math.max(0, Math.round(e.clientY - this.startY));
    },
    end() {
      if (!this.dragging) return;
      const dy = this.dragY;
      this.dragging = false;
      this.startY = null;
      /* короткий свайп возвращает шторку на место, длинный — закрывает */
      if (dy > 110) this.close();
      else this.dragY = 0;
    },
  }));

  /* ---------- единый источник телефона для шапки ---------- */
  Alpine.data('cityPhone', () => ({
    city: 'Екатеринбург',
    cities: window.NV.CITIES,
    open: false,
    init() {
      try {
        const saved = localStorage.getItem('nv-city');
        if (saved) this.city = saved;
      } catch (_) {}
      window.addEventListener('nv:city', (e) => (this.city = e.detail));
    },
    get phone() {
      return window.NV.PHONES[this.city] || window.NV.PHONES['Екатеринбург'];
    },
    pick(c) {
      this.city = c;
      this.open = false;
      try {
        localStorage.setItem('nv-city', c);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nv:city', { detail: c }));
    },
  }));

  /* ---------- личный кабинет ---------- */
  Alpine.data('accountMenu', () => ({
    open: false,
    closeTimer: null,
    logged: true,
    name: 'Анна Ковалёва',
    email: 'a.kovaleva@example.ru',
    bonus: 340,
    avatar: 'assets/img/avatar-1.webp',

    init() {
      try {
        const saved = localStorage.getItem('nv-auth');
        if (saved !== null) this.logged = saved === '1';
        const av = localStorage.getItem('nv-avatar');
        /* 'drop' — прежний аватар по умолчанию, из выбора он убран */
        if (av && av !== 'drop') this.avatar = av;
      } catch (_) {}
      window.addEventListener('nv:avatar', (e) => {
        this.avatar = e.detail;
      });
      window.addEventListener('nv:auth', (e) => {
        this.logged = Boolean(e.detail);
        try {
          localStorage.setItem('nv-auth', this.logged ? '1' : '0');
        } catch (_) {}
      });
    },

    /* null — значит рисуем SVG-капельку */
    get avatarSrc() {
      return this.avatar && this.avatar !== 'drop' ? this.avatar : null;
    },
    /* есть ли на устройстве настоящий курсор (на тач-экранах hover нет) */
    get canHover() {
      return (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(hover: hover)').matches
      );
    },
    /* меню открывается по наведению; закрывается с задержкой,
       чтобы курсор успел перейти с плашки в саму панель */
    openMenu() {
      if (!this.canHover) return;
      clearTimeout(this.closeTimer);
      this.open = true;
    },
    cancelClose() {
      clearTimeout(this.closeTimer);
    },
    scheduleClose(delay = 350) {
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => (this.open = false), delay);
    },
    closeNow() {
      clearTimeout(this.closeTimer);
      this.open = false;
    },
    /* клик по плашке: с мышью меню уже открыто наведением, поэтому клик его не трогает
       (detail === 0 — клик с клавиатуры, Enter/Space, его отрабатываем);
       на тач-экранах hover нет и меню открывается/закрывается тапом */
    plateClick(event) {
      if (!this.logged) {
        this.$dispatch('open-auth', 'login');
        return;
      }
      const fromKeyboard = !event || event.detail === 0;
      if (this.canHover && !fromKeyboard) return;
      clearTimeout(this.closeTimer);
      this.open = !this.open;
    },

    toggleAuth() {
      this.logged = !this.logged;
      try {
        localStorage.setItem('nv-auth', this.logged ? '1' : '0');
      } catch (_) {}
      this.open = false;
      if (this.logged) window.dispatchEvent(new CustomEvent('nv:auth', { detail: true }));
    },
    get firstName() {
      return this.name.split(' ')[0];
    },
    get initials() {
      return this.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2);
    },
  }));

  /* ---------- модалка обратного звонка ---------- */
  Alpine.data('callbackModal', () => ({
    open: false,
    sent: false,
    topics: [
      'Заявка на доставку воды',
      'Отзыв или предложение по работе компании',
      'Вопрос по программе лояльности',
      'Другое',
    ],
    form: { topic: 'Заявка на доставку воды', name: '', phone: '', email: '', comment: '', consent: false },

    get valid() {
      return this.digits(this.form.phone).length === 11 && this.form.name.trim().length > 1 && this.form.consent;
    },

    digits(v) {
      return String(v || '').replace(/\D/g, '');
    },

    /* маска +7 (999) 999-99-99, ввод только цифр */
    formatPhone(value) {
      let d = this.digits(value);
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      const rest = d.slice(1);
      let out = '+7';
      if (rest.length) out += ' (' + rest.slice(0, 3);
      if (rest.length >= 3) out += ')';
      if (rest.length > 3) out += ' ' + rest.slice(3, 6);
      if (rest.length > 6) out += '-' + rest.slice(6, 8);
      if (rest.length > 8) out += '-' + rest.slice(8, 10);
      return out;
    },

    onPhone(e) {
      const el = e.target;
      const before = el.value.slice(0, el.selectionStart || 0).replace(/\D/g, '').length;
      const formatted = this.formatPhone(el.value);
      el.value = formatted;
      this.form.phone = formatted;

      // возвращаем курсор на то же место по счёту цифр
      let pos = 0;
      let seen = 0;
      while (pos < formatted.length && seen < before) {
        if (/\d/.test(formatted[pos])) seen += 1;
        pos += 1;
      }
      try {
        el.setSelectionRange(pos, pos);
      } catch (_) {}
    },

    /* не даём печатать буквы и лишние символы */
    onPhoneKey(e) {
      if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    },

    show() {
      this.open = true;
      this.sent = false;
    },
    hide() {
      this.open = false;
    },
    submit() {
      if (!this.valid) return;
      this.sent = true;
    },
  }));

  /* ---------- промо-слайдер с параллаксом ---------- */
  Alpine.data('promoSlider', () => ({
    index: 0,
    count: 3,
    timer: null,
    paused: false,
    dragOffset: 0,
    startX: null,
    dragging: false,
    width: 680,
    artScale: 1,
    artScaleGift: 1,
    artX: 0,
    artY: 0,

    init() {
      /* макет баннеров нарисован в канве 680×532 — на узких экранах
         масштабируем его целиком, чтобы композиция не разваливалась */
      const fit = () => {
        const el = this.$el.querySelector('.slider-viewport');
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        /* Макет баннеров нарисован в канве 680×532.
           Десктоп: кадр бывает выше макета (высоту задаёт правая колонка) —
           тянем композицию по высоте, иначе фактура обрывается.
           Телефон: композиция ужимается по ширине и уезжает вниз, чтобы
           бутыли и помпа стояли под текстом, а не поверх него. */
        if (w < 640) {
          const s = Math.min(0.62, Math.max(0.42, w / 640));
          this.artScale = s;
          /* подарок: две бутыли в кадре шире остальных композиций — ужимаем сильнее */
          this.artScaleGift = s * 0.8;
          this.artX = 0;
          /* сдвиг в пикселях кадра: композиция прижата к нижнему правому углу */
          this.artY = Math.round(Math.max(0, h - 532 * s) * 0.42);
        } else {
          this.artScale = w >= 680 ? Math.max(1, h / 532) : Math.min(1, Math.max(w / 680, h / 532));
          this.artScaleGift = this.artScale;
          this.artX = 0;
          this.artY = 0;
        }
      };
      fit();
      this.$nextTick(fit);
      window.addEventListener('resize', fit, { passive: true });
      this.play();
      this.$watch('index', () => {
        if (!this.paused) this.play();
      });
    },

    play() {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (!this.paused && !document.hidden) this.next();
      }, 6500);
    },

    pause() {
      this.paused = true;
    },
    resume() {
      this.paused = false;
    },

    next() {
      this.index = (this.index + 1) % this.count;
    },
    prev() {
      this.index = (this.index - 1 + this.count) % this.count;
    },
    go(i) {
      this.index = i;
    },

    /* Непрерывная позиция карусели: целая часть — активный слайд,
       дробная — насколько его «сдвинули» пальцем. */
    get pos() {
      const w = this.width || 680;
      return this.index + (this.dragging ? -this.dragOffset / w : 0);
    },

    /* Кратчайшее расстояние по кругу: [-count/2, count/2).
       Благодаря этому слайды замкнуты: после третьего идёт первый,
       а перед первым — третий, и маски считаются так же. */
    delta(i) {
      const n = this.count;
      let d = (i - this.pos) % n;
      if (d > n / 2) d -= n;
      if (d <= -n / 2) d += n;
      return d;
    },

    /* Маска слайда. Кадр не «едет» целиком: у активного слайда видимая
       область сжимается, у соседнего — растёт, стык идёт по одной границе.
       d > 0 — слайд справа (въезжает справа), d < 0 — слева. */
    slideStyle(i) {
      const d = this.delta(i);
      const k = Math.min(1, Math.abs(d));
      if (k >= 1) {
        return d > 0 ? 'clip-path: inset(0 0 0 100%)' : 'clip-path: inset(0 100% 0 0)';
      }
      const cut = (k * 100).toFixed(3);
      return d >= 0
        ? `clip-path: inset(0 0 0 ${cut}%)`     // левая кромка отступает — видно правую часть
        : `clip-path: inset(0 ${cut}% 0 0)`;    // правая кромка отступает — видно левую часть
    },

    /* Контент внутри смещается лишь немного и в сторону перелистывания:
       за маской это читается как глубина, а не как переезд баннера. */
    layerStyle(i) {
      const d = Math.max(-1.5, Math.min(1.5, this.delta(i)));
      const shift = d * 7;
      /* в покое масштаб ровно 1 — чтобы макет совпадал пиксель в пиксель;
         лёгкое увеличение нужно только въезжающему слайду */
      const scale = 1 + Math.min(Math.abs(d), 1.5) * 0.03;
      return `transform: translate3d(${shift.toFixed(2)}%, 0, 0) scale(${scale.toFixed(3)})`;
    },
    /* передний план (бутыль, помпа): только сдвиг, без масштаба —
       иначе предмет обрезается рамкой; едет чуть быстрее фона (глубина) */
    foregroundStyle(i) {
      const d = Math.max(-1.5, Math.min(1.5, this.delta(i)));
      const shift = d * 11;
      return `transform: translate3d(${shift.toFixed(2)}%, 0, 0)`;
    },
    /* текст — самый медленный слой */
    textStyle(i) {
      const d = Math.max(-1.5, Math.min(1.5, this.delta(i)));
      const shift = d * 4;
      return `transform: translate3d(${shift.toFixed(2)}%, 0, 0)`;
    },

    onDown(e) {
      /* не мешаем кликам по ссылкам и кнопкам внутри слайда */
      if (e.target.closest('a, button, input, textarea, select')) return;
      this.startX = e.clientX;
      this.width = e.currentTarget.clientWidth || this.width;
      this.dragging = true;
      this.dragOffset = 0;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    },
    onMove(e) {
      if (this.startX === null) return;
      const dx = e.clientX - this.startX;
      /* за краями карусели сопротивление больше — как в нативных каруселях */
      const atEdge = (this.index === 0 && dx > 0) || (this.index === this.count - 1 && dx < 0);
      this.dragOffset = atEdge ? dx * 0.28 : dx;
    },
    onUp() {
      if (this.startX === null) return;
      const dx = this.dragOffset;
      this.dragging = false;
      this.dragOffset = 0;
      this.startX = null;
      if (dx < -50) this.next();
      else if (dx > 50) this.prev();
    },
  }));

  /* ---------- быстрый заказ на первом экране ---------- */
  Alpine.data('quickOrder', () => ({
    line: 'classic',
    volume: '19',
    qty: 1,
    added: false,

    /* tint — цвет линейки (подложки и кнопки), tintHover — он же на наведении, ink — подпись на подложке */
    lines: [
      { id: 'classic', label: 'Классика', img: 'assets/img/water-classic-19.webp', tint: '#31AAFF', tintHover: '#1B93EB', ink: '#FFFFFF' },
      { id: 'premium', label: 'Премиум', img: 'assets/img/water-premium-19.webp', tint: '#1D366D', tintHover: '#172C5A', ink: '#FFFFFF' },
      { id: 'kids', label: 'Детская', img: 'assets/img/water-kids-19.webp', tint: '#E17DD8', tintHover: '#C962C0', ink: '#FFFFFF' },
    ],
    volumes: [
      { id: '19', label: '19 л' },
      { id: '5', label: '5 л' },
      { id: '15', label: '1,5 л' },
      { id: '06', label: '0,6 л' },
      { id: '033', label: '0,33 л' },
    ],
    prices: {
      classic: { 19: 450, 5: 240, 15: 350, '06': 480, '033': 410 },
      premium: { 19: 480, 5: 260, 15: 370, '06': 540, '033': 440 },
      kids: { 19: 510, 5: 280, 15: 400, '06': 570, '033': 480 },
    },
    skus: {
      classic: { 19: 'w-classic-19', 5: 'w-classic-5', 15: 'w-classic-15', '06': 'w-classic-06', '033': 'w-classic-033' },
      premium: { 19: 'w-premium-19', 5: 'w-premium-5', 15: 'w-premium-15', '06': 'w-premium-06', '033': 'w-premium-033' },
      kids: { 19: 'w-kids-19', 5: 'w-kids-5', 15: 'w-kids-15', '06': 'w-kids-06', '033': 'w-kids-033' },
    },

    get lineIndex() {
      return Math.max(0, this.lines.findIndex((l) => l.id === this.line));
    },
    get lineTint() {
      return this.lines[this.lineIndex].tint;
    },
    get lineTintHover() {
      return this.lines[this.lineIndex].tintHover;
    },
    /* кнопка зелёная, когда товар уже в корзине */
    get ctaTint() {
      return this.added ? '#3FCB72' : this.lineTint;
    },
    get ctaHover() {
      return this.added ? '#33B361' : this.lineTintHover;
    },
    get volumeIndex() {
      return Math.max(0, this.volumes.findIndex((v) => v.id === this.volume));
    },
    get price() {
      return this.prices[this.line][this.volume];
    },
    get sku() {
      return this.skus[this.line][this.volume];
    },
    get total() {
      return this.price * this.qty;
    },
    get fmtTotal() {
      return new Intl.NumberFormat('ru-RU').format(this.total) + ' ₽';
    },
    /* «за 1 бутыль» → «за 2 бутыля» → «за 5 бутылей» (формы согласованы с клиентом) */
    plural(n, forms) {
      const a = Math.abs(n) % 100;
      const b = a % 10;
      if (a > 10 && a < 20) return forms[2];
      if (b > 1 && b < 5) return forms[1];
      if (b === 1) return forms[0];
      return forms[2];
    },
    get countLabel() {
      const n = this.qty;
      return this.volume === '19'
        ? `за ${n} ${this.plural(n, ['бутыль', 'бутыля', 'бутылей'])}`
        : `за ${n} ${this.plural(n, ['упаковку', 'упаковки', 'упаковок'])}`;
    },
    /* сумма по символам: цифры рисуются «барабаном», пробелы и ₽ — статикой */
    get totalChars() {
      return [...new Intl.NumberFormat('ru-RU').format(this.total)];
    },
    get volumeLabel() {
      return this.volume === '19' ? 'за 1 бутыль' : 'за упаковку';
    },

    init() {
      /* сменили линейку, объём или количество — кнопка снова «В корзину» */
      this.$watch(() => [this.line, this.volume, this.qty], () => {
        this.added = false;
      });
    },

    inc() {
      this.qty = Math.min(99, this.qty + 1);
    },
    dec() {
      this.qty = Math.max(1, this.qty - 1);
    },
    add() {
      Alpine.store('cart').add(this.sku, this.qty);
      this.added = true;
    },
    /* первое нажатие добавляет, второе — ведёт в корзину */
    toCart() {
      if (this.added) {
        window.location.href = 'cart.html';
        return;
      }
      this.add();
    },
  }));

  /* ---------- вход и регистрация ---------- */
  Alpine.data('authModal', () => ({
    open: false,
    mode: 'login',
    showPass: false,
    done: false,
    doneTitle: '',
    doneText: '',
    form: { name: '', email: '', password: '', consent: false },
    errors: {},

    get title() {
      if (this.mode === 'register') return 'Регистрация';
      if (this.mode === 'reset') return 'Восстановление пароля';
      return 'Вход в личный кабинет';
    },
    get subtitle() {
      if (this.mode === 'register') return 'Заказывайте воду быстрее и копите бонусы';
      if (this.mode === 'reset') return 'Укажите почту — пришлём ссылку для сброса';
      return 'Заказы, адреса и бонусы программы лояльности';
    },
    get submitLabel() {
      if (this.mode === 'register') return 'Создать аккаунт';
      if (this.mode === 'reset') return 'Отправить ссылку';
      return 'Войти';
    },

    show(mode) {
      this.open = true;
      this.done = false;
      this.errors = {};
      this.showPass = false;
      if (typeof mode === 'string' && ['login', 'register', 'reset'].includes(mode)) this.mode = mode;
    },
    hide() {
      this.open = false;
    },
    setMode(mode) {
      this.mode = mode;
      this.errors = {};
    },

    validEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
    },

    validate() {
      const e = {};
      if (this.mode === 'register' && this.form.name.trim().length < 2) {
        e.name = 'Укажите имя';
      }
      if (!this.validEmail(this.form.email)) {
        e.email = 'Проверьте адрес электронной почты';
      }
      if (this.mode !== 'reset') {
        if (this.form.password.length < 8) {
          e.password = 'Минимум 8 символов';
        }
      }
      if (this.mode === 'register' && !this.form.consent) {
        e.consent = 'Без согласия регистрация невозможна';
      }
      this.errors = e;
      return Object.keys(e).length === 0;
    },

    submit() {
      if (!this.validate()) return;
      if (this.mode === 'reset') {
        this.doneTitle = 'Письмо отправлено';
        this.doneText = 'Если такая почта есть в базе, ссылка для сброса пароля придёт в течение пары минут.';
        this.done = true;
        return;
      }
      this.doneTitle = this.mode === 'register' ? 'Аккаунт создан' : 'Вы вошли';
      this.doneText =
        this.mode === 'register'
          ? 'Добро пожаловать! Теперь заказы, адреса и бонусы будут сохраняться в личном кабинете.'
          : 'Заказы, адреса и бонусы доступны в личном кабинете.';
      this.done = true;
      window.dispatchEvent(new CustomEvent('nv:auth', { detail: true }));
    },

    social(name) {
      this.doneTitle = 'Вход через ' + name;
      this.doneText = 'В демо внешняя авторизация не подключена — это заглушка. В бою здесь редирект к провайдеру.';
      this.done = true;
    },
  }));

  /* ---------- шапка: без фона сверху, белая подложка при скролле ---------- */
  Alpine.data('headerScroll', () => ({
    scrolled: false,
    init() {
      const onScroll = () => {
        this.scrolled = window.scrollY > 8;
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    },
  }));

  /* ---------- заглушка главной: спрятанные блоки открыть нельзя ----------
     Ниже первого экрана на главной стоят блоки с [data-draft] + класс hidden:
     они не входят в демонстрацию, и в интерфейсе нет ни кнопки, ни ссылки,
     которая бы их показала. Развернуть можно только вручную (см. reveal()
     ниже) — например, из консоли: Alpine.$data(...).reveal().
     Ссылки из шапки на такие блоки не открывают их, а уводят к самому тизеру,
     чтобы клик не заканчивался пустотой. */
  Alpine.data('draftTeaser', () => ({
    revealed: false,
    init() {
      document.addEventListener(
        'click',
        (e) => {
          const link = e.target.closest && e.target.closest('a[href*="#"]');
          if (!link) return;
          const href = link.getAttribute('href') || '';
          const hash = href.slice(href.indexOf('#'));
          if (!hash || hash === '#') return;
          let target = null;
          try {
            target = document.querySelector(hash);
          } catch (_) {
            return;
          }
          if (!target || !target.closest('[data-draft]')) return;
          e.preventDefault();
          const teaser = document.getElementById('draft');
          if (!teaser) return;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          teaser.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        },
        true
      );
    },
    parts() {
      return Array.from(document.querySelectorAll('[data-draft]'));
    },
    reveal() {
      this.parts().forEach((el) => el.classList.remove('hidden'));
      this.revealed = true;
    },
    hide() {
      this.parts().forEach((el) => el.classList.add('hidden'));
      this.revealed = false;
      const top = document.getElementById('draft');
      if (top) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    },
  }));

  /* ---------- cookie-баннер ---------- */
  Alpine.data('cookieBanner', () => ({
    open: false,
    init() {
      try {
        this.open = !localStorage.getItem('nv-cookie');
      } catch (_) {
        this.open = true;
      }
    },
    accept(all) {
      try {
        localStorage.setItem('nv-cookie', all ? 'all' : 'necessary');
      } catch (_) {}
      this.open = false;
    },
  }));

  /* ---------- подтверждение удаления товара ---------- */
  Alpine.data('removeConfirm', () => ({
    open: false,
    sku: null,
    productName: '',

    init() {
      window.addEventListener('nv:ask-remove', (e) => {
        if (!e.detail || !e.detail.sku) return;
        this.sku = e.detail.sku;
        this.productName = Alpine.store('cart').product(this.sku).name;
        this.open = true;
      });
    },

    close() {
      this.open = false;
      this.sku = null;
      this.productName = '';
    },

    confirm() {
      if (this.sku) Alpine.store('cart').remove(this.sku);
      this.close();
    },
  }));

  /* ---------- выпадающее меню корзины (как у DNS) ---------- */
  Alpine.data('cartFlyout', () => ({
    open: false,
    timer: null,
    hold: null,

    init() {
      window.addEventListener('nv:cart-added', () => this.showTemporarily());
    },

    /* на телефоне панель корзины не нужна: тап по иконке сразу ведёт в корзину */
    get wide() {
      return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches;
    },
    show() {
      if (!this.wide) return;
      clearTimeout(this.timer);
      this.open = true;
    },
    scheduleClose() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.open = false), 260);
    },
    showTemporarily() {
      if (!this.wide) return;
      this.show();
      clearTimeout(this.hold);
      this.hold = setTimeout(() => (this.open = false), 4200);
    },
    get count() {
      return Alpine.store('cart').count;
    },
    fmt(n) {
      return new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)) + ' ₽';
    },
  }));

  /* ---------- заказы ---------- */
  Alpine.store('orders', {
    list: [],

    init() {
      try {
        const raw = localStorage.getItem('nv-orders-v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            this.list = parsed;
            return;
          }
        }
      } catch (_) {}
      this.list = window.NV.seedOrders();
      this.persist();
    },

    persist() {
      try {
        localStorage.setItem('nv-orders-v2', JSON.stringify(this.list));
      } catch (_) {}
    },

    get active() {
      return this.list.filter((o) => o.status === 'active');
    },
    get activeCount() {
      return this.active.length;
    },

    add(order) {
      this.list.unshift(order);
      this.persist();
    },

    cancel(id) {
      const o = this.list.find((x) => x.id === id);
      if (o) {
        o.status = 'cancelled';
        o.cancelledAt = new Date().toISOString();
        this.persist();
      }
    },

    /* повтор завершённого/отменённого заказа: позиции уходят в корзину */
    repeat(order) {
      order.items.forEach((line) => Alpine.store('cart').add(line.sku, line.qty));
    },

    total(order) {
      return order.items.reduce((sum, l) => sum + (window.NV.PRODUCTS[l.sku]?.price || 0) * l.qty, 0);
    },
    count(order) {
      return order.items.reduce((sum, l) => sum + l.qty, 0);
    },
  });

  /* ---------- корзина ---------- */
  Alpine.store('cart', {
    items: [],
    tare: false,
    loaded: false,

    init() {
      try {
        const raw = localStorage.getItem('nv-cart');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.items = Array.isArray(parsed.items) ? parsed.items : [];
          this.tare = Boolean(parsed.tare);
        }
      } catch (_) {
        this.items = [];
      }
      this.loaded = true;
    },

    persist() {
      try {
        localStorage.setItem('nv-cart', JSON.stringify({ items: this.items, tare: this.tare }));
      } catch (_) {}
    },

    product(sku) {
      return window.NV.PRODUCTS[sku] || { name: 'Товар', price: 0, volume: '', img: '' };
    },

    lineTotal(line) {
      return this.product(line.sku).price * line.qty;
    },

    get lines() {
      return this.items.map((line) => ({ ...line, product: this.product(line.sku), total: this.lineTotal(line) }));
    },

    get count() {
      return this.items.reduce((sum, line) => sum + line.qty, 0);
    },

    get goods() {
      return this.items.reduce((sum, line) => sum + this.lineTotal(line), 0);
    },

    get tareTotal() {
      return this.tare ? window.NV.TARE_PRICE : 0;
    },

    get delivery() {
      if (!this.items.length) return 0;
      return this.goods >= window.NV.DELIVERY_FREE_FROM ? 0 : window.NV.DELIVERY_PRICE;
    },

    get total() {
      return this.goods + this.tareTotal + this.delivery;
    },

    get freeDeliveryLeft() {
      return Math.max(0, window.NV.DELIVERY_FREE_FROM - this.goods);
    },

    get freeDeliveryProgress() {
      return Math.min(100, Math.round((this.goods / window.NV.DELIVERY_FREE_FROM) * 100));
    },

    get totalLabel() {
      return new Intl.NumberFormat('ru-RU').format(Math.round(this.total)) + ' ₽';
    },

    qtyOf(sku) {
      const line = this.items.find((l) => l.sku === sku);
      return line ? line.qty : 0;
    },

    add(sku, qty = 1) {
      if (!window.NV.PRODUCTS[sku]) return;
      const line = this.items.find((l) => l.sku === sku);
      if (line) line.qty += qty;
      else this.items.push({ sku, qty });
      this.persist();
      this.flash(this.product(sku).name);
      window.dispatchEvent(new CustomEvent('nv:cart-added', { detail: { sku, qty } }));
    },

    setQty(sku, qty) {
      const line = this.items.find((l) => l.sku === sku);
      if (!line) return;
      line.qty = Math.max(0, Math.min(99, qty));
      if (line.qty === 0) this.remove(sku);
      else this.persist();
    },

    inc(sku) {
      this.setQty(sku, this.qtyOf(sku) + 1);
    },
    /* уменьшение до нуля — это удаление, поэтому спрашиваем подтверждение */
    dec(sku) {
      const qty = this.qtyOf(sku);
      if (qty <= 1) {
        window.dispatchEvent(new CustomEvent('nv:ask-remove', { detail: { sku } }));
        return;
      }
      this.setQty(sku, qty - 1);
    },

    remove(sku) {
      this.items = this.items.filter((l) => l.sku !== sku);
      this.persist();
    },

    setTare(value) {
      this.tare = Boolean(value);
      this.persist();
    },

    clear() {
      this.items = [];
      this.tare = false;
      this.persist();
    },

    /* toast */
    toast: '',
    toastTimer: null,
    flash(name) {
      this.toast = name;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => (this.toast = ''), 2600);
    },
  });
});

/* ---------------------------------------------------------------
   Обычные (не Alpine) утилиты — доступны до старта Alpine
   --------------------------------------------------------------- */
window.NV.PRODUCTS = {
  'w-classic-19': { name: 'Вода «Классика» 19 л', price: 450, volume: '19 л', img: 'assets/img/water-classic-19.webp' },
  'w-premium-19': { name: 'Вода «Премиум» 19 л', price: 480, volume: '19 л', img: 'assets/img/water-premium-19.webp' },
  'w-kids-19':    { name: 'Вода «Детская» 19 л', price: 510, volume: '19 л', img: 'assets/img/water-kids-19.webp' },
  'w-classic-06': { name: 'Вода «Классика» 0,6 л, 12 шт', price: 480, volume: '0,6 л × 12', img: 'assets/img/water-classic-06.webp' },
  'w-classic-033': { name: 'Вода «Классика» 0,33 л, 12 шт', price: 410, volume: '0,33 л × 12', img: 'assets/img/water-classic-033.webp' },
  'w-premium-033': { name: 'Вода «Премиум» 0,33 л, 12 шт', price: 440, volume: '0,33 л × 12', img: 'assets/img/water-premium-033.webp' },
  'w-kids-033':    { name: 'Вода «Детская» 0,33 л, 12 шт', price: 480, volume: '0,33 л × 12', img: 'assets/img/water-kids-033.webp' },
  'w-premium-06': { name: 'Вода «Премиум» 0,6 л, 12 шт', price: 540, volume: '0,6 л × 12', img: 'assets/img/water-premium-06.webp' },
  'w-kids-06':    { name: 'Вода «Детская» 0,6 л, 12 шт', price: 570, volume: '0,6 л × 12', img: 'assets/img/water-kids-06.webp' },
  'w-classic-15': { name: 'Вода «Классика» 1,5 л, 6 шт', price: 350, volume: '1,5 л × 6', img: 'assets/img/water-classic-15.webp' },
  'w-premium-15': { name: 'Вода «Премиум» 1,5 л, 6 шт', price: 370, volume: '1,5 л × 6', img: 'assets/img/water-premium-15.webp' },
  'w-kids-15':    { name: 'Вода «Детская» 1,5 л, 6 шт', price: 400, volume: '1,5 л × 6', img: 'assets/img/water-kids-15.webp' },
  'w-classic-5':  { name: 'Вода «Классика» 5 л, 2 шт', price: 240, volume: '5 л × 2', img: 'assets/img/water-classic-5.webp' },
  'w-premium-5':  { name: 'Вода «Премиум» 5 л, 2 шт', price: 260, volume: '5 л × 2', img: 'assets/img/water-premium-5.webp' },
  'w-kids-5':     { name: 'Вода «Детская» 5 л, 2 шт', price: 280, volume: '5 л × 2', img: 'assets/img/water-kids-5.webp' },
  'c-aquawell':   { name: 'Кулер Aqua Well 36 TD', price: 7800, volume: 'настольный', img: 'assets/img/cooler-aquawell36.webp' },
  'c-aguawell':   { name: 'Кулер AguaWell 16L/E', price: 14700, volume: 'напольный', img: 'assets/img/cooler-aguawell16.webp' },
  'c-black':      { name: 'Кулер Ecotronic K42-LXEM', price: 27100, volume: 'напольный', img: 'assets/img/cooler-black.webp' },
  'pompa':        { name: 'Помпа механическая Dolphin Eco', price: 550, volume: '—', img: 'assets/img/pompa.webp' },
  'bottle-19':    { name: 'Бутыль 19 л (в собственность)', price: 500, volume: '19 л', img: 'assets/img/tara-19.webp' },
  'coffee':       { name: 'Кофе Jacobs Monarch, 190 г', price: 950, volume: '190 г', img: 'assets/img/coffee-jacobs.webp' },
  'tea':          { name: 'Чай Greenfield Barberry Garden, 25 пак.', price: 170, volume: '25 пак.', img: 'assets/img/tea-greenfield.webp' },
};

window.NV.DELIVERY_FREE_FROM = 1000;
window.NV.DELIVERY_PRICE = 200;
window.NV.TARE_PRICE = 500;
window.NV.money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

/* Демо-история заказов, чтобы раздел «Заказы» не был пустым */
window.NV.seedOrders = function seedOrders() {
  const at = (daysAgo, hour = 12) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 20, 0, 0);
    return d;
  };
  /* дата доставки выводится из того же смещения, поэтому карточка и createdAt
     всегда рассказывают одну историю */
  const slotFor = (daysAgo, time) => {
    if (daysAgo === 0) return 'сегодня, ' + time;
    if (daysAgo === 1) return 'вчера, ' + time;
    return at(daysAgo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + time;
  };

  const A1 = 'ул. Анри Барбюса, д. 6, кв. 12';
  const A2 = 'ул. Ленина, д. 24, офис 301';
  const A3 = 'ул. Малышева, д. 51, кв. 204';

  /* [id, дней назад, статус, адрес, время, оплата, позиции] — год истории,
     чтобы в кабинете была осмысленная аналитика, а не две точки на графике */
  const rows = [
    ['48301', 1,   'active',    A1, '17:00–19:00', 'card', [['w-classic-19', 2], ['pompa', 1]]],
    ['48125', 9,   'done',      A2, '10:00–12:00', 'cash', [['w-premium-19', 3], ['w-kids-19', 1], ['bottle-19', 4]]],
    ['47998', 23,  'done',      A1, '19:00–21:00', 'card', [['w-classic-06', 2], ['coffee', 1]]],
    ['47654', 41,  'cancelled', A3, '12:00–14:00', 'card', [['w-kids-19', 2]]],
    ['47512', 47,  'done',      A1, '09:00–11:00', 'card', [['w-classic-19', 3]]],
    ['47330', 61,  'done',      A1, '18:00–20:00', 'card', [['w-classic-19', 2], ['w-premium-15', 1]]],
    ['47108', 78,  'done',      A2, '11:00–13:00', 'cash', [['w-premium-19', 2], ['w-classic-5', 2]]],
    ['46922', 94,  'done',      A1, '15:00–17:00', 'card', [['w-classic-19', 4]]],
    ['46640', 112, 'done',      A1, '10:00–12:00', 'card', [['w-classic-19', 2], ['tea', 2]]],
    ['46371', 129, 'done',      A2, '16:00–18:00', 'card', [['w-premium-19', 3]]],
    ['46095', 147, 'cancelled', A3, '13:00–15:00', 'cash', [['w-kids-19', 1]]],
    ['45888', 158, 'done',      A1, '09:00–11:00', 'card', [['w-classic-19', 2], ['bottle-19', 2]]],
    ['45620', 176, 'done',      A1, '17:00–19:00', 'card', [['w-classic-19', 3]]],
    ['45344', 193, 'done',      A2, '12:00–14:00', 'cash', [['w-premium-19', 2], ['w-kids-5', 1]]],
    ['45070', 211, 'done',      A1, '18:00–20:00', 'card', [['w-classic-19', 2]]],
    ['44812', 228, 'done',      A1, '11:00–13:00', 'card', [['w-classic-19', 4], ['pompa', 1]]],
    ['44510', 246, 'done',      A1, '14:00–16:00', 'cash', [['w-classic-19', 2], ['coffee', 1]]],
    ['44250', 262, 'done',      A1, '10:00–12:00', 'card', [['w-classic-19', 3]]],
    ['43980', 279, 'done',      A2, '17:00–19:00', 'card', [['w-premium-19', 2], ['w-kids-15', 1]]],
    ['43720', 298, 'cancelled', A3, '11:00–13:00', 'cash', [['w-kids-19', 2]]],
    ['43440', 317, 'done',      A1, '18:00–20:00', 'card', [['w-classic-19', 2], ['bottle-19', 2]]],
    ['43150', 338, 'done',      A1, '09:00–11:00', 'card', [['w-classic-19', 4]]],
  ];

  return rows.map(([id, days, status, address, time, payment, items]) => ({
    id,
    createdAt: at(days, 10 + (days % 8)).toISOString(),
    status,
    items: items.map(([sku, qty]) => ({ sku, qty })),
    address,
    slot: slotFor(days, time),
    payment,
  }));
};

/* ---------------------------------------------------------------
   Переполнение навигации: всё, что не влезает в строку разделов,
   переезжает в выпадашку «Ещё».
   --------------------------------------------------------------- */
(function initNavOverflow() {
  const GAP = 4; // gap-1

  function buildMoreItem(item) {
    const a = document.createElement('a');
    a.className = 'dropdown-item !justify-start';
    a.href = item.getAttribute('href') || '#';
    a.textContent = (item.textContent || '').trim();
    return a;
  }

  function layout(nav) {
    const items = Array.from(nav.querySelectorAll('[data-nav-item]'));
    const more = nav.querySelector('[data-nav-more]');
    const list = nav.querySelector('[data-more-list]');
    if (!items.length || !more || !list) return;

    // сброс
    items.forEach((el) => (el.style.display = ''));
    more.classList.add('hidden');
    list.innerHTML = '';

    const cs = getComputedStyle(nav);
    const avail =
      nav.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    if (avail <= 0) return;

    // ширина кнопки «Ещё» с запасом
    more.classList.remove('hidden');
    more.style.visibility = 'hidden';
    const moreWidth = more.getBoundingClientRect().width + GAP;
    more.classList.add('hidden');
    more.style.visibility = '';

    let used = 0;
    let cut = items.length;
    for (let i = 0; i < items.length; i += 1) {
      const w = items[i].getBoundingClientRect().width + GAP;
      if (used + w > avail - moreWidth) {
        cut = i;
        break;
      }
      used += w;
    }

    if (cut >= items.length) return; // всё влезло

    const rest = items.slice(cut);
    rest.forEach((el) => (el.style.display = 'none'));

    rest.forEach((item) => {
      const children = item.querySelector('[data-nav-children]');
      if (children) {
        const title = document.createElement('p');
        title.className = 'px-3 pb-1 pt-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-mute';
        title.textContent = item.dataset.navTitle || 'Инфо';
        list.appendChild(title);
        children.querySelectorAll('a').forEach((a) => {
          const clone = a.cloneNode(true);
          clone.className = 'dropdown-item !justify-start !pl-3';
          list.appendChild(clone);
        });
      } else {
        list.appendChild(buildMoreItem(item));
      }
    });

    more.classList.remove('hidden');
  }

  function layoutAll() {
    document.querySelectorAll('[data-nav]').forEach(layout);
  }

  let raf = null;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      layoutAll();
    });
  }

  function start() {
    layoutAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    window.addEventListener('resize', schedule);
    // высота строки меняется при показе/скрытии баннеров — пересчитываем ещё раз
    setTimeout(schedule, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
