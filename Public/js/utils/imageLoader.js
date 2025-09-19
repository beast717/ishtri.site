/**
 * Enhanced Lazy Loading with Layout Shift Prevention
 * Optimized for minimal CLS (Cumulative Layout Shift)
 */

class LazyImageLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '100px',
            threshold: [0, 0.1, 0.5],
            enableBlurPlaceholder: true,
            enableProgressiveLoading: true,
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };
        
        this.loadedImages = new Set();
        this.failedImages = new Set();
        this.observer = null;
        this.init();
    }

    init() {
        // Mobile detection - load images immediately on small screens
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!('IntersectionObserver' in window) || isMobile) {
            this.loadAllImages();
            return;
        }

        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            }
        );

        this.observeImages();
    }

    observeImages() {
        const images = document.querySelectorAll('img[data-src], [data-bg-src]');
        images.forEach(img => {
            if (!this.loadedImages.has(img) && !this.failedImages.has(img)) {
                this.observer.observe(img);
                this.setupImageContainer(img);
            }
        });
    }

    setupImageContainer(img) {
        const container = img.closest('.product-image-container, .image-container');
        if (container && !container.querySelector('.image-placeholder')) {
            // Add placeholder if not exists
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.innerHTML = '<i class="fas fa-image"></i>';
            container.appendChild(placeholder);
        }

        // Set loading state
        img.classList.add('lazy-image');
        
        // Preserve aspect ratio
        if (!img.style.aspectRatio && img.dataset.aspectRatio) {
            img.style.aspectRatio = img.dataset.aspectRatio;
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    loadImage(img, attempt = 1) {
        const src = img.dataset.src || img.dataset.bgSrc;
        if (!src || this.loadedImages.has(img)) return;

        // For background images
        if (img.dataset.bgSrc) {
            this.loadBackgroundImage(img, src, attempt);
            return;
        }

        // For regular images
        const tempImg = new Image();
        
        tempImg.onload = () => {
            this.onImageLoad(img, src);
        };
        
        tempImg.onerror = () => {
            this.onImageError(img, src, attempt);
        };

        // Set dimensions to prevent layout shift
        if (img.dataset.width) {
            tempImg.width = img.dataset.width;
        }
        if (img.dataset.height) {
            tempImg.height = img.dataset.height;
        }

        tempImg.src = src;
    }

    loadBackgroundImage(element, src, attempt = 1) {
        const tempImg = new Image();
        
        tempImg.onload = () => {
            element.style.backgroundImage = `url(${src})`;
            element.classList.add('loaded');
            this.hidePlaceholder(element);
            this.loadedImages.add(element);
        };
        
        tempImg.onerror = () => {
            this.onImageError(element, src, attempt);
        };

        tempImg.src = src;
    }

    onImageLoad(img, src) {
        // Prevent layout shift by setting dimensions before src
        if (!img.style.width && img.dataset.width) {
            img.style.width = img.dataset.width + 'px';
        }
        if (!img.style.height && img.dataset.height) {
            img.style.height = img.dataset.height + 'px';
        }

        img.src = src;
        img.classList.add('loaded');
        
        // Copy srcset and sizes if available
        if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
        }
        if (img.dataset.sizes) {
            img.sizes = img.dataset.sizes;
        }

        this.hidePlaceholder(img);
        this.loadedImages.add(img);

        // Trigger custom event
        img.dispatchEvent(new CustomEvent('imageLoaded', {
            detail: { src, element: img }
        }));
    }

    onImageError(img, src, attempt) {
        if (attempt < this.options.retryAttempts) {
            setTimeout(() => {
                this.loadImage(img, attempt + 1);
            }, this.options.retryDelay * attempt);
            return;
        }

        // Final fallback
        const fallbackSrc = img.dataset.fallback || '/images/default.svg';
        img.src = fallbackSrc;
        img.classList.add('error');
        this.hidePlaceholder(img);
        this.failedImages.add(img);
    }

    hidePlaceholder(img) {
        const container = img.closest('.product-image-container, .image-container');
        if (container) {
            const placeholder = container.querySelector('.image-placeholder, .image-blur-placeholder');
            if (placeholder) {
                // Stop the animation and hide immediately
                placeholder.style.animation = 'none';
                placeholder.style.display = 'none';
                placeholder.classList.add('hidden');
                
                // Remove from DOM after a short delay
                setTimeout(() => {
                    if (placeholder.parentNode) {
                        placeholder.parentNode.removeChild(placeholder);
                    }
                }, 50);
            }
        }
    }

    loadAllImages() {
        // Fallback for browsers without IntersectionObserver
        const images = document.querySelectorAll('img[data-src], [data-bg-src]');
        images.forEach(img => this.loadImage(img));
    }

    // Public methods
    refresh() {
        this.observeImages();
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Enhanced image utilities
const ImageUtils = {
    /**
     * Create optimized image element with proper dimensions
     */
    createOptimizedImage(src, options = {}) {
        const {
            alt = '',
            width = null,
            height = null,
            aspectRatio = null,
            className = '',
            lazy = true,
            placeholder = true,
            sizes = null,
            srcset = null
        } = options;

        const container = document.createElement('div');
        container.className = `image-container ${className}`;
        
        if (aspectRatio) {
            container.style.aspectRatio = aspectRatio;
        }

        const img = document.createElement('img');
        
        if (lazy) {
            img.dataset.src = src;
            img.src = 'data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%27100%27%20height=%2775%27/%3e';
        } else {
            img.src = src;
            img.classList.add('critical-image');
        }

        img.alt = alt;
        img.loading = lazy ? 'lazy' : 'eager';
        
        if (width) {
            img.width = width;
            img.dataset.width = width;
        }
        if (height) {
            img.height = height;
            img.dataset.height = height;
        }
        if (srcset) {
            if (lazy) {
                img.dataset.srcset = srcset;
            } else {
                img.srcset = srcset;
            }
        }
        if (sizes) {
            img.sizes = sizes;
        }

        container.appendChild(img);

        if (placeholder && lazy) {
            const placeholderDiv = document.createElement('div');
            placeholderDiv.className = 'image-placeholder';
            placeholderDiv.innerHTML = '<i class="fas fa-image"></i>';
            container.appendChild(placeholderDiv);
        }

        return container;
    },

    /**
     * Update existing images to use optimized loading
     */
    optimizeExistingImages() {
        const images = document.querySelectorAll('img:not([data-src]):not(.optimized)');
        images.forEach(img => {
            if (img.src && !img.complete) {
                // Image is still loading, optimize it
                const src = img.src;
                img.dataset.src = src;
                img.src = 'data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%27100%27%20height=%2775%27/%3e';
                img.loading = 'lazy';
                img.classList.add('lazy-image');
            }
            img.classList.add('optimized');
        });
    }
};

// Initialize lazy loader
let lazyImageLoader;

document.addEventListener('DOMContentLoaded', () => {
    lazyImageLoader = new LazyImageLoader();
    ImageUtils.optimizeExistingImages();
});

// Export for use in other modules
window.LazyImageLoader = LazyImageLoader;
window.ImageUtils = ImageUtils;
window.lazyImageLoader = lazyImageLoader;

export { LazyImageLoader, ImageUtils };