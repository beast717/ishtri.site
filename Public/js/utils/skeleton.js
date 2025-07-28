export default class SkeletonLoader {
    constructor() {
        // Removed inline styles - using modular CSS system instead
        // Styles are now handled by components/_skeleton.css
    }

    createProductSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'product skeleton-product';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-image"></div>
            <div>
                <div class="skeleton skeleton-text skeleton-title"></div>
                <div class="skeleton skeleton-text skeleton-price"></div>
                <div class="skeleton skeleton-text skeleton-location"></div>
            </div>
        `;
        return skeleton;
    }

    createSavedSearchSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'search-item skeleton-search';
        skeleton.innerHTML = `
            <div>
                <div class="skeleton skeleton-text skeleton-title"></div>
                <div class="skeleton skeleton-text skeleton-location"></div>
                <div class="skeleton skeleton-text skeleton-description"></div>
            </div>
            <div class="search-item-actions">
                <div class="skeleton skeleton-text" style="width: 100px; height: 36px; border-radius: 4px;"></div>
                <div class="skeleton skeleton-text" style="width: 80px; height: 36px; border-radius: 4px;"></div>
            </div>
        `;
        return skeleton;
    }

    createMessageSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-message';
        skeleton.style.height = '65px';
        skeleton.style.margin = '10px';
        return skeleton;
    }

    createGridSkeleton(count = 4) {
        const container = document.createElement('div');
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        container.style.gap = '20px';
        container.style.padding = '20px';

        for (let i = 0; i < count; i++) {
            container.appendChild(this.createProductSkeleton());
        }

        return container;
    }

    showInContainer(containerId, type = 'product', count = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            let skeleton;
            if (type === 'savedSearch') {
                skeleton = this.createSavedSearchSkeleton();
            } else if (type === 'message') {
                skeleton = this.createMessageSkeleton();
            } else {
                skeleton = this.createProductSkeleton();
            }
            container.appendChild(skeleton);
        }
    }

    hideInContainer(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
}