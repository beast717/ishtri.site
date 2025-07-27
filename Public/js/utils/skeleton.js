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
}