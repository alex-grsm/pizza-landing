// products.js
import { addToCart, setProductsCache } from './shopping-cart';

// Кэш для хранения данных продуктов, чтобы уменьшить запросы к серверу
const cache = {
    products: null,
    timestamp: 0,
    maxAge: 5 * 60 * 1000 // 5 минут
};

/**
 * Проверяет, актуален ли кэш
 * @returns {boolean} true, если кэш актуален
 */
const isCacheValid = () => {
    return cache.products && (Date.now() - cache.timestamp < cache.maxAge);
};

/**
 * Добавляет путь к директории products к имени файла
 * @param {string} filename - Имя файла изображения из JSON
 * @returns {string} Полный путь к изображению
 */
const getImagePath = (filename) => {
    return `/products/${filename}`;
};

/**
 * Функция для загрузки данных о продуктах с кэшированием
 * @param {boolean} forceRefresh - Принудительно обновить данные
 * @returns {Promise<Array>} Массив продуктов с полными путями к изображениям
 */
export const fetchProducts = async (forceRefresh = false) => {
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh && isCacheValid()) {
        return cache.products;
    }

    try {
        // В режиме разработки путь к JSON может отличаться от продакшена
        const jsonPath = import.meta.env.DEV 
            ? '/src/data/products.json' 
            : '/data/products.json'; // Путь после сборки
        
        // Добавляем параметр для предотвращения кэширования браузером в режиме разработки
        const url = import.meta.env.DEV 
            ? `${jsonPath}?_=${Date.now()}` 
            : jsonPath;
            
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const products = await response.json();
        
        // Добавляем полные пути к изображениям для всех продуктов
        const productsWithImages = products.map(product => ({
            ...product,
            image: getImagePath(product.image)
        }));

        // Обновляем кэш
        cache.products = productsWithImages;
        cache.timestamp = Date.now();
        
        return productsWithImages;
    } catch (error) {
        console.error('Error fetching products:', error);
        
        // Если есть кэшированные данные, используем их в случае ошибки
        if (cache.products) {
            console.log('Using cached products data due to fetch error');
            return cache.products;
        }
        
        throw error;
    }
};

/**
 * Создает HTML элемент карточки продукта
 * @param {Object} product - Информация о продукте
 * @returns {HTMLElement} Элемент карточки продукта
 */
const createProductCard = (product) => {
    const card = document.createElement('article');
    card.className = 'products__card';
    card.setAttribute('data-id', product.id);
    
    // Используем шаблонные строки для создания HTML
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="products__img" loading="lazy">
        <h3 class="products__name">${product.name}</h3>
        <span class="products__price">$${product.price}</span>
        <button class="products__button" data-id="${product.id}" aria-label="Add ${product.name} to cart">
            <i class="ri-shopping-bag-3-fill" aria-hidden="true"></i>
        </button>
    `;
    
    return card;
};

/**
 * Настройка ленивой загрузки изображений с помощью IntersectionObserver
 * @param {HTMLElement} container - Контейнер с изображениями
 */
const setupLazyLoading = (container) => {
    // Проверяем поддержку IntersectionObserver
    if ('IntersectionObserver' in window) {
        const lazyImageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // Загружаем изображение только когда оно входит в область видимости
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    lazyImageObserver.unobserve(img);
                }
            });
        });

        // Находим все изображения с атрибутом data-src
        const lazyImages = container.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            lazyImageObserver.observe(img);
        });
    } else {
        // Для браузеров без поддержки IntersectionObserver загружаем все сразу
        const lazyImages = container.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
};

/**
 * Настройка обработчиков событий для карточек продуктов
 * @param {HTMLElement} container - Контейнер с продуктами
 */
const setupEventHandlers = (container) => {
    // Очищаем предыдущие обработчики
    if (container._clickHandler) {
        container.removeEventListener('click', container._clickHandler);
    }
    
    // Используем делегирование событий для экономии памяти
    container._clickHandler = (event) => {
        const button = event.target.closest('.products__button');
        if (!button) return;
        
        event.preventDefault();
        
        const productId = parseInt(button.dataset.id);
        if (isNaN(productId)) {
            console.error('Invalid product ID');
            return;
        }
        
        // Добавляем в корзину
        addToCart(productId);
        
        // Анимация кнопки
        button.classList.add('added');
        
        // Используем requestAnimationFrame для плавности анимации
        requestAnimationFrame(() => {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    button.classList.remove('added');
                });
            }, 1500);
        });
    };
    
    container.addEventListener('click', container._clickHandler);
};

/**
 * Эффективно рендерит продукты с помощью DocumentFragment
 * @param {Array} products - Массив продуктов
 * @param {HTMLElement} container - Контейнер для отображения
 */
const renderProductsToDOM = (products, container) => {
    // Создаем фрагмент для оптимизации DOM-операций
    const fragment = document.createDocumentFragment();
    
    // Добавляем все продукты во фрагмент
    products.forEach(product => {
        const card = createProductCard(product);
        fragment.appendChild(card);
    });
    
    // Очищаем контейнер и добавляем фрагмент за одну операцию
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Устанавливаем обработчики событий
    setupEventHandlers(container);
};

/**
 * Функция для загрузки и отображения продуктов
 * @param {boolean} forceRefresh - Принудительно обновить данные
 * @returns {Promise} Promise, который разрешается после загрузки всех продуктов
 */
export const renderProducts = async (forceRefresh = false) => {
    try {
        // Находим контейнер для продуктов
        const productsContainer = document.querySelector('.products__container');
        if (!productsContainer) {
            throw new Error('Products container not found');
        }
        
        // Показываем индикатор загрузки, если загрузка займет время
        const loadingTimer = setTimeout(() => {
            productsContainer.innerHTML = '<div class="products__loading">Loading products...</div>';
        }, 300);
        
        // Загружаем данные о продуктах
        const products = await fetchProducts(forceRefresh);
        
        // Отменяем таймер индикатора загрузки
        clearTimeout(loadingTimer);
        
        // Сохраняем продукты в кэше корзины
        setProductsCache(products);
        
        // Отображаем продукты
        renderProductsToDOM(products, productsContainer);
        
        // Добавляем отслеживание ошибок загрузки изображений
        productsContainer.addEventListener('error', (event) => {
            if (event.target.tagName === 'IMG') {
                console.warn(`Failed to load image: ${event.target.src}`);
                // Заменяем на изображение-заглушку
                event.target.src = '/products/placeholder.png';
                event.target.classList.add('image-error');
            }
        }, true); // true для фазы перехвата, чтобы обработать до всплытия
        
        return products;
    } catch (error) {
        console.error('Error rendering products:', error);
        
        // Показываем сообщение об ошибке пользователю
        const productsContainer = document.querySelector('.products__container');
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div class="products__error">
                    <p>Sorry, we couldn't load the products.</p>
                    <button class="products__retry">Try Again</button>
                </div>
            `;
            
            // Добавляем обработчик для кнопки повторной попытки
            const retryButton = productsContainer.querySelector('.products__retry');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    renderProducts(true); // Принудительно обновляем данные
                });
            }
        }
        
        throw error;
    }
};

// Экспортируем функцию для повторной попытки загрузки продуктов
export const refreshProducts = () => renderProducts(true);