/**
 * Enhanced Skeleton Loading Manager
 * Provides smooth transitions and prevents layout shifts
 */

class SkeletonManager {
    constructor(options = {}) {
        this.options = {
            transitionDuration: 300,
            staggerDelay: 100,
            enableProgressiveLoading: true,
            autoHide: true,
            ...options
        };
        
        this.activeSkeletons = new Map();
        this.observers = new Map();
        this.init();
    }

    init() {
        this.setupMutationObserver();
    }

    /**
     * Create skeleton elements that match target content
     */
    createSkeleton(type, count = 1, container = null) {
        const skeletons = [];
        
        for (let i = 0; i < count; i++) {
            const skeleton = this.createSkeletonElement(type, i);
            skeletons.push(skeleton);
            
            if (container) {
                container.appendChild(skeleton);
            }
        }
        
        return count === 1 ? skeletons[0] : skeletons;
    }

    createSkeletonElement(type, index = 0) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton-${type} skeleton-container`;
        skeleton.style.setProperty('--skeleton-index', index);
        
        if (this.options.enableProgressiveLoading) {
            skeleton.classList.add('skeleton-progressive');
        }

        switch (type) {
            case 'product':
                skeleton.innerHTML = this.getProductSkeletonHTML();
                break;
            case 'card':
                skeleton.innerHTML = this.getCardSkeletonHTML();
                break;
            case 'search':
                skeleton.innerHTML = this.getSearchSkeletonHTML();
                break;
            case 'notification':
                skeleton.innerHTML = this.getNotificationSkeletonHTML();
                break;
            case 'list-item':
                skeleton.innerHTML = this.getListItemSkeletonHTML();
                break;
            default:
                skeleton.innerHTML = this.getGenericSkeletonHTML();
        }

        return skeleton;
    }

    getProductSkeletonHTML() {
        return `
            <div class="skeleton-image-container">
                <div class="skeleton-image skeleton"></div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-price"></div>
                </div>
                <div class="skeleton-details">
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton skeleton-text" style="width: 45%;"></div>
                    <div class="skeleton skeleton-location"></div>
                </div>
            </div>
        `;
    }

    getCardSkeletonHTML() {
        return `
            <div class="skeleton-image skeleton"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text" style="width: 80%;"></div>
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
                <div class="skeleton skeleton-price"></div>
            </div>
        `;
    }

    getSearchSkeletonHTML() {
        return `
            <div class="skeleton-main">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text" style="width: 90%;"></div>
                <div class="skeleton skeleton-text small" style="width: 50%;"></div>
            </div>
            <div class="skeleton-actions">
                <div class="skeleton skeleton-button"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        `;
    }

    getNotificationSkeletonHTML() {
        return `
            <div class="skeleton skeleton-icon"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text large" style="width: 80%;"></div>
                <div class="skeleton skeleton-text" style="width: 95%;"></div>
                <div class="skeleton skeleton-timestamp"></div>
            </div>
        `;
    }

    getListItemSkeletonHTML() {
        return `
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text large" style="width: 70%;"></div>
                <div class="skeleton skeleton-text" style="width: 90%;"></div>
            </div>
        `;
    }

    getGenericSkeletonHTML() {
        return `
            <div class="skeleton skeleton-text large" style="width: 60%;"></div>
            <div class="skeleton skeleton-text" style="width: 80%;"></div>
            <div class="skeleton skeleton-text" style="width: 40%;"></div>
        `;
    }

    /**
     * Show skeleton while content loads
     */
    showSkeleton(container, type = 'generic', count = 1) {
        if (!container) return null;

        const skeletonId = this.generateId();
        const wrapper = document.createElement('div');
        wrapper.className = 'skeleton-wrapper';
        wrapper.setAttribute('data-skeleton-id', skeletonId);

        const skeletons = this.createSkeleton(type, count);
        if (Array.isArray(skeletons)) {
            skeletons.forEach(skeleton => wrapper.appendChild(skeleton));
        } else {
            wrapper.appendChild(skeletons);
        }

        // Preserve original content dimensions
        this.preserveContainerDimensions(container);
        
        container.appendChild(wrapper);
        this.activeSkeletons.set(skeletonId, { container, wrapper, type });

        // Show with animation
        requestAnimationFrame(() => {
            wrapper.classList.add('skeleton-visible');
        });

        return skeletonId;
    }

    /**
     * Hide skeleton and show real content
     */
    hideSkeleton(skeletonId, callback = null) {
        const skeletonData = this.activeSkeletons.get(skeletonId);
        if (!skeletonData) return;

        const { wrapper } = skeletonData;
        
        wrapper.classList.add('skeleton-hidden');
        
        setTimeout(() => {
            if (wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            }
            this.activeSkeletons.delete(skeletonId);
            
            if (callback) {
                callback();
            }
        }, this.options.transitionDuration);
    }

    /**
     * Replace skeleton with real content smoothly
     */
    replaceSkeleton(skeletonId, content) {
        const skeletonData = this.activeSkeletons.get(skeletonId);
        if (!skeletonData) return;

        const { container, wrapper } = skeletonData;
        
        // Prepare content for smooth transition
        if (typeof content === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            content = tempDiv.firstElementChild || tempDiv;
        }

        content.style.opacity = '0';
        container.appendChild(content);

        // Hide skeleton and show content
        wrapper.classList.add('skeleton-hidden');
        
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transition = `opacity ${this.options.transitionDuration}ms ease`;
            
            if (wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            }
            this.activeSkeletons.delete(skeletonId);
        }, this.options.transitionDuration / 2);
    }

    /**
     * Show loading state for existing content
     */
    showLoadingState(element, type = 'overlay') {
        if (!element) return;

        const loadingId = this.generateId();
        element.setAttribute('data-loading-id', loadingId);

        if (type === 'overlay') {
            element.classList.add('content-loading');
        } else if (type === 'skeleton') {
            const originalContent = element.innerHTML;
            element.setAttribute('data-original-content', originalContent);
            element.innerHTML = '';
            this.showSkeleton(element, 'generic', 1);
        }

        return loadingId;
    }

    /**
     * Hide loading state
     */
    hideLoadingState(element) {
        if (!element) return;

        element.classList.remove('content-loading');
        
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
            element.innerHTML = originalContent;
            element.removeAttribute('data-original-content');
        }
        
        element.removeAttribute('data-loading-id');
    }

    /**
     * Preserve container dimensions to prevent layout shift
     */
    preserveContainerDimensions(container) {
        if (!container) return;

        const rect = container.getBoundingClientRect();
        if (rect.height > 0) {
            container.style.minHeight = `${rect.height}px`;
        }
    }

    /**
     * Setup mutation observer to auto-hide skeletons when content loads
     */
    setupMutationObserver() {
        if (!this.options.autoHide) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            !node.classList.contains('skeleton-wrapper') &&
                            !node.classList.contains('skeleton')) {
                            
                            // Check if parent has skeleton that should be hidden
                            const parent = node.parentNode;
                            if (parent) {
                                const skeletonWrapper = parent.querySelector('.skeleton-wrapper');
                                if (skeletonWrapper) {
                                    const skeletonId = skeletonWrapper.getAttribute('data-skeleton-id');
                                    if (skeletonId) {
                                        this.hideSkeleton(skeletonId);
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Utility methods
     */
    generateId() {
        return 'skeleton_' + Math.random().toString(36).substr(2, 9);
    }

    clearAllSkeletons() {
        this.activeSkeletons.forEach((data, id) => {
            this.hideSkeleton(id);
        });
    }

    // Public API for common patterns
    showProductsSkeleton(container, count = 3) {
        return this.showSkeleton(container, 'product', count);
    }

    showCardsSkeleton(container, count = 6) {
        return this.showSkeleton(container, 'card', count);
    }

    showListSkeleton(container, count = 5) {
        return this.showSkeleton(container, 'list-item', count);
    }
}

// Initialize skeleton manager
let skeletonManager;

document.addEventListener('DOMContentLoaded', () => {
    skeletonManager = new SkeletonManager();
});

// Export for use in other modules
window.SkeletonManager = SkeletonManager;
window.skeletonManager = skeletonManager;

export { SkeletonManager };