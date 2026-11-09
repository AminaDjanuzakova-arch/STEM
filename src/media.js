/**
 * Иллюстрации категорий и вопросов (локальные файлы + emoji-fallback)
 */

export const CATEGORY_MEDIA = {
  all: {
    emoji: '🎲',
    label: 'Все темы',
    url: '/images/all.jpg',
  },
  cell: {
    emoji: '🧬',
    label: 'Клетка',
    url: '/images/cell.jpg',
  },
  anatomy: {
    emoji: '🫀',
    label: 'Анатомия',
    url: '/images/anatomy.jpg',
  },
  plants: {
    emoji: '🌱',
    label: 'Растения',
    url: '/images/plants.jpg',
  },
  animals: {
    emoji: '🐾',
    label: 'Животные',
    url: '/images/animals.jpg',
  },
  genetics: {
    emoji: '🧪',
    label: 'Генетика',
    url: '/images/genetics.jpg',
  },
  ecology: {
    emoji: '🌍',
    label: 'Экология',
    url: '/images/ecology.jpg',
  },
  microbiology: {
    emoji: '🦠',
    label: 'Микромир',
    url: '/images/microbiology.jpg',
  },
  nervous: {
    emoji: '🧠',
    label: 'Нервная система',
    url: '/images/nervous.jpg',
  },
  evolution: {
    emoji: '🦴',
    label: 'Эволюция',
    url: '/images/evolution.jpg',
  },
  general: {
    emoji: '🔬',
    label: 'Общая биология',
    url: '/images/general.jpg',
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
 * Визуал для вопроса: emoji + локальное фото категории
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
      img.addEventListener(
        'error',
        () => {
          box.classList.add('is-loaded', 'is-fallback');
        },
        { once: true },
      );
    }
  });
}
