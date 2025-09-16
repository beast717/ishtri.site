/**
 * Font Loading Manager - Prevents Layout Shifts
 * Manages web font loading and fallback strategies
 */

class FontLoadingManager {
    constructor(options = {}) {
        this.options = {
            timeout: 3000,
            fallbackDelay: 100,
            enableFontDisplay: true,
            preloadFonts: [
                {
                    family: 'Inter',
                    weights: ['400', '500', '600', '700'],
                    display: 'swap'
                }
            ],
            ...options
        };
        
        this.loadedFonts = new Set();
        this.failedFonts = new Set();
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        document.documentElement.classList.add('fonts-loading');
        
        try {
            // Use Font Loading API if available
            if ('fonts' in document) {
                await this.loadWithFontAPI();
            } else {
                // Fallback to CSS-based loading
                await this.loadWithCSS();
            }
            
            document.documentElement.classList.remove('fonts-loading');
            document.documentElement.classList.add('fonts-loaded');
            
        } catch (error) {
            // Silently handle font loading failures and fallback gracefully
            this.handleFontLoadingFailure();
        }
        
        this.isInitialized = true;
    }

    async loadWithFontAPI() {
        const promises = [];
        
        this.options.preloadFonts.forEach(font => {
            font.weights.forEach(weight => {
                promises.push(this.loadFont(font.family, weight));
            });
        });

        // Wait for critical fonts with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Font loading timeout')), this.options.timeout)
        );

        try {
            await Promise.race([
                Promise.all(promises),
                timeoutPromise
            ]);
        } catch (error) {
            // Continue with available fonts - timeout occurred
            this.handleFontLoadingFailure();
        }

        // Wait for any remaining fonts (non-blocking)
        Promise.allSettled(promises).then(results => {
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    // Font loaded successfully
                } else {
                    // Font failed to load - handled gracefully
                }
            });
        });
    }

    async loadFont(family, weight = '400', style = 'normal') {
        if (!('FontFace' in window)) {
            throw new Error('FontFace API not supported');
        }

        const fontUrl = this.getFontUrl(family, weight, style);
        const fontFace = new FontFace(family, `url(${fontUrl})`, {
            weight,
            style,
            display: 'swap'
        });

        try {
            const loadedFont = await fontFace.load();
            document.fonts.add(loadedFont);
            this.loadedFonts.add(`${family}-${weight}-${style}`);
            return loadedFont;
        } catch (error) {
            this.failedFonts.add(`${family}-${weight}-${style}`);
            throw error;
        }
    }

    getFontUrl(family, weight, style) {
        // Generate Google Fonts URL or return custom font URL
        if (family === 'Inter') {
            const weights = this.options.preloadFonts[0].weights.join(';');
            return `https://fonts.googleapis.com/css2?family=Inter:wght@${weights}&display=swap`;
        }
        
        // Return custom font URL pattern
        return `/fonts/${family}-${weight}-${style}.woff2`;
    }

    async loadWithCSS() {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = this.getFontUrl('Inter', '400');
            
            link.onload = () => {
                // CSS loaded, but fonts might still be loading
                setTimeout(() => {
                    if (this.checkFontLoaded('Inter')) {
                        resolve();
                    } else {
                        reject(new Error('Font not loaded after CSS'));
                    }
                }, this.options.fallbackDelay);
            };
            
            link.onerror = () => reject(new Error('CSS loading failed'));
            
            setTimeout(() => reject(new Error('CSS loading timeout')), this.options.timeout);
            
            document.head.appendChild(link);
        });
    }

    checkFontLoaded(fontFamily) {
        if (!('fonts' in document)) {
            // Fallback check using canvas
            return this.checkFontWithCanvas(fontFamily);
        }
        
        return document.fonts.check(`16px ${fontFamily}`);
    }

    checkFontWithCanvas(fontFamily) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        // Measure with fallback font
        context.font = '16px sans-serif';
        const fallbackWidth = context.measureText(testString).width;
        
        // Measure with target font
        context.font = `16px ${fontFamily}, sans-serif`;
        const targetWidth = context.measureText(testString).width;
        
        return Math.abs(targetWidth - fallbackWidth) > 1;
    }

    handleFontLoadingFailure() {
        document.documentElement.classList.remove('fonts-loading');
        document.documentElement.classList.add('fonts-failed');
        
        // Apply fallback font strategy
        this.applyFallbackFonts();
    }

    applyFallbackFonts() {
        const style = document.createElement('style');
        style.textContent = `
            body, * {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
        `;
        document.head.appendChild(style);
    }

    preloadCriticalFonts() {
        this.options.preloadFonts.forEach(font => {
            font.weights.forEach(weight => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'font';
                link.type = 'font/woff2';
                link.crossOrigin = 'anonymous';
                link.href = this.getFontUrl(font.family, weight);
                document.head.appendChild(link);
            });
        });
    }

    getFontName(index) {
        let currentIndex = 0;
        for (const font of this.options.preloadFonts) {
            for (const weight of font.weights) {
                if (currentIndex === index) {
                    return `${font.family}-${weight}`;
                }
                currentIndex++;
            }
        }
        return 'unknown';
    }

    // Public API
    async waitForFonts() {
        if (this.isInitialized) return;
        
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.isInitialized) {
                    resolve();
                } else {
                    requestAnimationFrame(checkReady);
                }
            };
            checkReady();
        });
    }

    isReady() {
        return this.isInitialized;
    }

    getLoadedFonts() {
        return Array.from(this.loadedFonts);
    }

    getFailedFonts() {
        return Array.from(this.failedFonts);
    }

    // Utility for text measurement to prevent layout shifts
    measureText(text, font = '16px Inter, sans-serif') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text);
    }

    // Apply font loading optimizations to existing elements
    optimizeExistingText() {
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button');
        
        textElements.forEach(element => {
            if (element.textContent.trim()) {
                element.style.fontDisplay = 'swap';
                
                // Add invisible space to preserve layout
                if (element.offsetHeight === 0) {
                    element.style.minHeight = '1em';
                }
            }
        });
    }
}

// Font loading utilities
const FontUtils = {
    /**
     * Create text with fallback sizing to prevent shifts
     */
    createOptimizedText(text, options = {}) {
        const {
            tag = 'span',
            className = '',
            font = 'Inter',
            size = '16px',
            weight = '400'
        } = options;

        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        
        // Set initial styles to prevent shifts
        element.style.fontFamily = `${font}, system-ui, sans-serif`;
        element.style.fontSize = size;
        element.style.fontWeight = weight;
        element.style.fontDisplay = 'swap';
        element.style.lineHeight = '1.6';
        
        return element;
    },

    /**
     * Apply font loading optimization to element
     */
    optimizeElement(element) {
        if (!element) return;
        
        element.style.fontDisplay = 'swap';
        element.style.visibility = 'visible';
        
        // Prevent shifts by setting min dimensions
        const computedStyle = getComputedStyle(element);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        
        if (lineHeight && !isNaN(lineHeight)) {
            element.style.minHeight = `${lineHeight}px`;
        }
    }
};

// Initialize font loading manager
let fontLoadingManager;

document.addEventListener('DOMContentLoaded', () => {
    fontLoadingManager = new FontLoadingManager();
});

// Export for use in other modules
window.FontLoadingManager = FontLoadingManager;
window.FontUtils = FontUtils;
window.fontLoadingManager = fontLoadingManager;

export { FontLoadingManager, FontUtils };