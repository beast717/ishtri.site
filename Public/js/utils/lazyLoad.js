export default class LazyLoader {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        // Check if browser supports Intersection Observer
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersect(entries),
                {
                    root: null,
                    rootMargin: '50px',
                    threshold: 0.1
                }
            );
        } else {
            // Fallback for browsers that don't support Intersection Observer
            this.fallbackLazyLoad();
        }

        // Add styles only if they don't exist
        if (!document.getElementById('lazy-load-styles')) {
            const style = document.createElement('style');
            style.id = 'lazy-load-styles';
            style.textContent = `
                img[data-src] {
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                img[data-src].loaded {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }

    handleIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
            }
        });
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        }
    }

    fallbackLazyLoad() {
        // Fallback implementation using scroll event
        window.addEventListener('scroll', () => {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                if (this.isInViewport(img)) {
                    this.loadImage(img);
                }
            });
        });
    }

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    observe() {
        // Observe all images with data-src attribute
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (this.observer) {
                this.observer.observe(img);
            }
        });
    }
}

// Initialize lazy loading when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoader.observe();
}); 