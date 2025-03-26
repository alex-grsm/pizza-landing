import ScrollEjuk from '../vendor/scrollejuk.js';

const scrollAnimations = () => {
    const ej = new ScrollEjuk({
        origin: 'top',
        distance: '60px',
        duration: 2500,
        delay: 300,
        observerOptions: {
            rootMargin: '10px',
            threshold: 0.1,
        },
    });
    
    ej.reveal(`.home__data, .popular__container, .footer`);
    ej.reveal(`.home__board`, { delay: 700, distance: '100px', origin: 'right' });
    ej.reveal(`.home__pizza`, { delay: 1400, distance: '100px', origin: 'bottom', rotate: { z: -90 } });
    ej.reveal(`.home__ingredient`, { delay: 2000, interval: 100 });
    
    ej.reveal(`.about__data, .recipe__list, .contact__data`, { origin: 'right' });
    ej.reveal(`.about__img, .recipe__img, .contact__image`, { origin: 'left' });
    ej.reveal(`.contact__sticker`, { interval: 100, rotate: { z: -30 } });
    
    ej.reveal(`.products .products__card`, { interval: 100 });
    ej.reveal(`.products .products__img`, { interval: 100 });
};

export default scrollAnimations;