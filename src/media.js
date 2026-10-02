/**
 * Иллюстрации категорий и вопросов (Unsplash CDN + emoji-fallback)
 */

export const CATEGORY_MEDIA = {
  all: {
    emoji: '🎲',
    label: 'Все темы',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=720&q=80',
  },
  cell: {
    emoji: '🧬',
    label: 'Клетка',
    url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=720&q=80',
  },
  anatomy: {
    emoji: '🫀',
    label: 'Анатомия',
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=720&q=80',
  },
  plants: {
    emoji: '🌱',
    label: 'Растения',
    url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=720&q=80',
  },
  animals: {
    emoji: '🐾',
    label: 'Животные',
    url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=720&q=80',
  },
  genetics: {
    emoji: '🧪',
    label: 'Генетика',
    url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=720&q=80',
  },
  ecology: {
    emoji: '🌍',
    label: 'Экология',
    url: 'https://images.unsplash.com/photo-1441974231819-48ea34aa4ad2?auto=format&fit=crop&w=720&q=80',
  },
  microbiology: {
    emoji: '🦠',
    label: 'Микромир',
    url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=720&q=80',
  },
  nervous: {
    emoji: '🧠',
    label: 'Нервная система',
    url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=720&q=80',
  },
  evolution: {
    emoji: '🦴',
    label: 'Эволюция',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=720&q=80',
  },
  general: {
    emoji: '🔬',
    label: 'Общая биология',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=720&q=80',
  },
};

/** Тематические emoji-иллюстрации по типу вопроса */
const TYPE_ILLUSTRATIONS = {
  multiple: '📘',
  truefalse: '⚖️',
  statement: '📌',
  oddone: '🔍',
  image: '🖼️',
  whatif: '💭',
  match: '🔗',
  riddle: '🧩',
  whoami: '🎭',
  speed: '⚡',
};

export function getCategoryMedia(categoryId) {
  return CATEGORY_MEDIA[categoryId] || CATEGORY_MEDIA.general;
}

/**
 * Визуал для вопроса: emoji + фото категории (или imageUrl вопроса)
 */
export function getQuestionVisual(question) {
  const cat = getCategoryMedia(question.category);
  const emoji = question.image || TYPE_ILLUSTRATIONS[question.type] || cat.emoji;
  const url = question.imageUrl || cat.url;
  return { emoji, url, categoryLabel: cat.label };
}

/**
 * HTML блока иллюстрации с плавной загрузкой
 */
export function renderIllustrationHtml({ emoji, url, alt = 'Иллюстрация' }) {
  return `
    <div class="illustration" data-illustration>
      <div class="illustration-skeleton" aria-hidden="true"></div>
      <img
        class="illustration-img"
        src="${url}"
        alt="${alt}"
        loading="eager"
        decoding="async"
        referrerpolicy="no-referrer"
      />
      <div class="illustration-emoji" aria-hidden="true">${emoji}</div>
    </div>
  `;
}

/** Плавное появление картинки после загрузки */
export function bindIllustrationFade(root = document) {
  root.querySelectorAll('[data-illustration]').forEach((box) => {
    const img = box.querySelector('.illustration-img');
    if (!img) return;
    const reveal = () => box.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) {
      reveal();
    } else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', () => {
        box.classList.add('is-loaded', 'is-fallback');
      }, { once: true });
    }
  });
}
