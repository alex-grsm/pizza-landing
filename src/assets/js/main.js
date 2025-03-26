import menu from './components/menu';
import scrollHeader from './components/scroll-header';
import swiperPopular from './components/swiper-popular';
import scrollUp from './components/scroll-up';
import scrollActiveLink from './components/scroll-active-link';
import scrollAnimations from './components/animations';
import { renderProducts } from './components/products';
import { initCart } from './components/shopping-cart';

// Инициализация базовых компонентов сразу
menu();
scrollHeader();
scrollUp();
scrollActiveLink();

const initializeComponents = async () => {
    try {
        // Загружаем и отображаем продукты
        await renderProducts();
        console.log('Products loaded successfully');

        // Инициализируем свайпер после загрузки продуктов
        swiperPopular();

        // Инициализируем корзину и её переключения
        initCart();

        // Запускаем анимации после полной загрузки страницы и небольшой задержки
        window.addEventListener('load', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            scrollAnimations();
            console.log('Animations initialized');
        });
    } catch (error) {
        console.error('Error loading products:', error);
        // Даже в случае ошибки пытаемся инициализировать оставшиеся компоненты
        swiperPopular();
        window.addEventListener('load', scrollAnimations);
    }
};

initializeComponents();
