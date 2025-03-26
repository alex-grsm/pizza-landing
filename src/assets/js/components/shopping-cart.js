// Паттерн модуля для изоляции состояния
const CartModule = (() => {
    // Приватное состояние
    const state = {
        dom: {}, // DOM-элементы
        cache: { // Кэш данных
            cart: null,
            products: [],
            productsMap: new Map()
        },
        listeners: {}, // Для паттерна observer
        timeouts: {} // Для управления таймерами
    };

    // Инициализация DOM-кэша с единым селектором
    const initDOM = () => {
        const selectors = {
            cartItemsContainer: '.ejCartTab__items',
            totalEl: '.ejCartTab__total',
            cartCounter: '.ejCart__count',
            cartContainer: '.ejCartTab',
            cartOpenButtons: '[data-cart-open]',
            cartCloseButtons: '[data-cart-close]'
        };

        // Создаем все селекторы за один проход
        for (const [key, selector] of Object.entries(selectors)) {
            if (selector.includes('[data-')) {
                state.dom[key] = document.querySelectorAll(selector);
            } else {
                state.dom[key] = document.querySelector(selector);
            }
        }

        // Добавляем делегированный обработчик событий
        if (state.dom.cartItemsContainer && !state.dom.cartItemsContainer._hasEventListener) {
            state.dom.cartItemsContainer.addEventListener('click', handleCartClick);
            state.dom.cartItemsContainer._hasEventListener = true;
        }
    };

    // Observer паттерн для реагирования на изменения корзины
    const subscribe = (event, callback) => {
        if (!state.listeners[event]) {
            state.listeners[event] = [];
        }
        state.listeners[event].push(callback);
        return () => unsubscribe(event, callback); // Возвращаем функцию для отписки
    };

    const unsubscribe = (event, callback) => {
        if (!state.listeners[event]) return;
        state.listeners[event] = state.listeners[event].filter(cb => cb !== callback);
    };

    const publish = (event, data) => {
        if (!state.listeners[event]) return;
        state.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in listener for event "${event}":`, error);
            }
        });
    };

    // Улучшенная функция для получения корзины с проверкой кэша
    const getCart = () => {
        if (state.cache.cart === null) {
            try {
                state.cache.cart = JSON.parse(localStorage.getItem('cart')) || [];
            } catch (error) {
                console.error('Error reading cart from localStorage:', error);
                state.cache.cart = [];
                // Публикуем событие ошибки
                publish('error', {message: 'Ошибка при чтении корзины'});
            }
        }
        return state.cache.cart;
    };

    // Сохранение корзины с улучшенным debounce
    const saveCart = (cart) => {
        state.cache.cart = cart;
        
        if (state.timeouts.saveCart) clearTimeout(state.timeouts.saveCart);
        
        state.timeouts.saveCart = setTimeout(() => {
            try {
                localStorage.setItem('cart', JSON.stringify(cart));
                // Публикуем событие сохранения
                publish('cart:saved', cart);
            } catch (error) {
                console.error('Error saving cart to localStorage:', error);
                publish('error', {message: 'Ошибка при сохранении корзины'});
            }
        }, 300);

        // Немедленно публикуем событие изменения
        publish('cart:updated', cart);
    };

    // Установка кэша продуктов
    const setProductsCache = (products) => {
        state.cache.products = products;
        // Создаем Map для O(1) доступа к продуктам
        state.cache.productsMap = new Map(products.map(p => [p.id, p]));
        publish('products:cached', products);
    };

    // Оптимизированный рендер корзины с использованием DocumentFragment
    const renderCart = () => {
        const { cartItemsContainer } = state.dom;
        if (!cartItemsContainer) return;
        
        const cart = getCart();
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Cart is empty</p>';
            updateTotal();
            return;
        }

        // Используем DocumentFragment для оптимизации DOM-операций
        const fragment = document.createDocumentFragment();
        
        cart.forEach(item => {
            const product = state.cache.productsMap.get(item.id);
            if (!product) return;
            
            // Создаем элемент товара с помощью функции для повторного использования
            const articleEl = createCartItemElement(product, item.quantity);
            fragment.appendChild(articleEl);
        });
        
        // Обновляем DOM за один раз
        cartItemsContainer.innerHTML = '';
        cartItemsContainer.appendChild(fragment);
        
        updateTotal();
    };

    // Выделенная функция для создания элемента товара в корзине
    const createCartItemElement = (product, quantity) => {
        const articleEl = document.createElement('article');
        articleEl.className = 'ejCartTab__item';
        articleEl.dataset.id = product.id;
        
        // Используем шаблонные строки для создания HTML
        articleEl.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="ejCartTab__img" loading="lazy">
            <div class="ejCartTab__info">
                <h3 class="ejCartTab__name">${product.name}</h3>
                <span class="ejCartTab__price">$${product.price}</span>
                <div class="ejCartTab__quantity">
                    <button class="ejCartTab__btn decrement">−</button>
                    <span class="ejCartTab__count">${quantity}</span>
                    <button class="ejCartTab__btn increment">+</button>
                </div>
            </div>
            <button class="ejCartTab__remove">
                <i class="ri-delete-bin-2-fill"></i>
            </button>
        `;
        
        return articleEl;
    };

    // Обновление общей стоимости с использованием reduce
    const updateTotal = () => {
        const { totalEl } = state.dom;
        if (!totalEl) return;
        
        const cart = getCart();
        const total = cart.reduce((sum, item) => {
            const product = state.cache.productsMap.get(item.id);
            return product ? sum + (product.price * item.quantity) : sum;
        }, 0);
        
        totalEl.textContent = `Total: $${total.toFixed(2)}`;
    };

    // Обработчик событий для корзины с делегированием
    const handleCartClick = (event) => {
        const target = event.target;
        const cartItem = target.closest('.ejCartTab__item');
        if (!cartItem) return;
        
        const productId = parseInt(cartItem.getAttribute('data-id'));
        let cart = getCart();
        
        // Выделенные функции для обработки разных типов кликов
        if (target.matches('.ejCartTab__btn.decrement')) {
            handleQuantityChange(cart, productId, -1, cartItem);
        } 
        else if (target.matches('.ejCartTab__btn.increment')) {
            handleQuantityChange(cart, productId, 1, cartItem);
        } 
        else if (target.closest('.ejCartTab__remove')) {
            handleItemRemove(cart, productId, cartItem);
        }
    };

    // Обработка изменения количества товара
    const handleQuantityChange = (cart, productId, change, cartItem) => {
        const updatedCart = cart.map(item => {
            if (item.id === productId) {
                return { ...item, quantity: item.quantity + change };
            }
            return item;
        }).filter(item => item.quantity > 0);
        
        saveCart(updatedCart);
        
        // Оптимизированное обновление UI для одного элемента
        const countEl = cartItem.querySelector('.ejCartTab__count');
        const updatedItem = updatedCart.find(item => item.id === productId);
        
        if (updatedItem) {
            countEl.textContent = updatedItem.quantity;
        } else {
            animateRemoveItem(cartItem);
        }
        
        updateTotal();
        updateCartCounter();
    };

    // Обработка удаления товара
    const handleItemRemove = (cart, productId, cartItem) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        saveCart(updatedCart);
        animateRemoveItem(cartItem);
    };

    // Анимация удаления элемента
    const animateRemoveItem = (cartItem) => {
        cartItem.style.height = cartItem.offsetHeight + 'px';
        cartItem.style.transition = 'all 0.3s';
        
        // Используем requestAnimationFrame для плавной анимации
        requestAnimationFrame(() => {
            cartItem.style.opacity = '0';
            cartItem.style.height = '0';
        });
        
        setTimeout(() => {
            cartItem.remove();
            const cart = getCart();
            if (cart.length === 0 && state.dom.cartItemsContainer) {
                state.dom.cartItemsContainer.innerHTML = '<p>Cart is empty</p>';
            }
            updateTotal();
            updateCartCounter();
        }, 300);
    };

    // Обновление счетчика товаров в корзине
    const updateCartCounter = () => {
        const { cartCounter } = state.dom;
        if (!cartCounter) return;
        
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        cartCounter.textContent = totalItems;
        cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
    };

    // Инициализация открытия/закрытия корзины
    const initCartToggles = () => {
        const { cartContainer, cartOpenButtons, cartCloseButtons } = state.dom;
        if (!cartContainer) return;

        if (cartOpenButtons) {
            cartOpenButtons.forEach(button => {
                button.addEventListener('click', () => {
                    cartContainer.classList.add('active');
                    document.body.classList.add('cart-open');
                    renderCart();
                });
            });
        }

        if (cartCloseButtons) {
            cartCloseButtons.forEach(button => {
                button.addEventListener('click', () => {
                    cartContainer.classList.remove('active');
                    document.body.classList.remove('cart-open');
                });
            });
        }
    };

    // Оптимизированное добавление в корзину с debounce и валидацией
    const addToCart = (productId) => {
        if (typeof productId !== 'number' || isNaN(productId)) {
            console.error('Invalid productId:', productId);
            return;
        }
        
        if (state.timeouts.addToCart) {
            clearTimeout(state.timeouts.addToCart);
        }
        
        state.timeouts.addToCart = setTimeout(() => {
            let cart = getCart();
            const existingItemIndex = cart.findIndex(item => item.id === productId);
            
            // Находим продукт для уведомления
            const product = state.cache.productsMap.get(productId);
            if (!product) {
                console.error('Product not found:', productId);
                return;
            }
            
            if (existingItemIndex !== -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push({ id: productId, quantity: 1 });
            }
            
            saveCart(cart);
            
            // Анимация кнопки
            const addButton = document.querySelector(`.products__button[data-id="${productId}"]`);
            if (addButton) {
                addButton.classList.add('added');
                
                setTimeout(() => {
                    addButton.classList.remove('added');
                }, 1000);
            }
            
            // Уведомление
            NotificationSystem.show('added to cart!', product.name);
            
            updateCartCounter();
            
            // Обновляем UI корзины только если она открыта
            if (state.dom.cartContainer && state.dom.cartContainer.classList.contains('active')) {
                renderCart();
            }
        }, 300);
    };

    // Публичное API модуля
    return {
        init: () => {
            initDOM();
            renderCart();
            updateCartCounter();
            initCartToggles();
        },
        addToCart,
        setProductsCache,
        updateCartUI: renderCart,
        updateCartCounter,
        getCart: () => [...getCart()], // Возвращаем копию, чтобы избежать прямого изменения
        subscribe,
        unsubscribe
    };
})();

// Отдельный модуль для системы уведомлений
const NotificationSystem = (() => {
    // Приватное состояние
    const state = {
        notifications: {},
        container: null
    };

    // Получение контейнера для уведомлений с ленивой инициализацией
    const getContainer = () => {
        if (!state.container) {
            let container = document.querySelector('.notification-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'notification-container';
                document.body.appendChild(container);
            }
            state.container = container;
        }
        return state.container;
    };

    // Создание уведомления
    const createNotificationElement = (message, title = null) => {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.id = 'notification-' + Date.now();
        
        notification.innerHTML = `
            <div class="notification__icon">
                <i class="ri-shopping-cart-2-fill"></i>
            </div>
            <div class="notification__content">
                ${title ? `<p class="notification__title">${title}</p>` : ''}
                <p class="notification__message">${message}</p>
            </div>
            <button class="notification__close">
                <i class="ri-close-line"></i>
            </button>
        `;
        
        return notification;
    };

    // Показать уведомление
    const show = (message, title = null, duration = 4000) => {
        const notification = createNotificationElement(message, title);
        const container = getContainer();
        container.appendChild(notification);
        
        // Обработчик для закрытия
        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            hide(notification.id);
        });
        
        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Автоматическое скрытие
        const timeout = setTimeout(() => {
            hide(notification.id);
        }, duration);
        
        // Сохраняем данные уведомления
        state.notifications[notification.id] = {
            element: notification,
            timeout
        };
        
        return notification.id;
    };

    // Скрыть уведомление
    const hide = (id) => {
        const notificationData = state.notifications[id];
        if (!notificationData) return;
        
        clearTimeout(notificationData.timeout);
        const notification = notificationData.element;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // Удаляем после анимации
        notification.addEventListener('transitionend', () => {
            notification.remove();
            delete state.notifications[id];
        }, { once: true });
    };

    // Публичное API
    return {
        show,
        hide
    };
})();

// Экспортируем публичные методы
export const initCart = CartModule.init;
export const addToCart = CartModule.addToCart;
export const setProductsCache = CartModule.setProductsCache;
export const updateCartUI = CartModule.updateCartUI;
export const updateCartCounter = CartModule.updateCartCounter;
export const initCartToggles = () => {}; // Теперь обрабатывается в init()