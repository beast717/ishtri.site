class SkeletonLoader {
    constructor() {
        this.skeletonStyles = `
            .skeleton {
                background: #e2e5e7;
                background: linear-gradient(
                    110deg,
                    #ececec 8%,
                    #f5f5f5 18%,
                    #ececec 33%
                );
                background-size: 200% 100%;
                animation: 1.5s shine linear infinite;
            }

            @keyframes shine {
                to {
                    background-position-x: -200%;
                }
            }

            .skeleton-card {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .skeleton-image {
                width: 100%;
                height: 200px;
                border-radius: 4px;
                margin-bottom: 15px;
            }

            .skeleton-title {
                height: 20px;
                width: 70%;
                margin-bottom: 10px;
            }

            .skeleton-text {
                height: 15px;
                width: 100%;
                margin-bottom: 8px;
            }

            .skeleton-text:last-child {
                width: 60%;
            }

            .skeleton-price {
                height: 25px;
                width: 40%;
                margin-top: 10px;
            }
        `;

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = this.skeletonStyles;
        document.head.appendChild(style);
    }

    createProductSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-price"></div>
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

// Create global skeleton loader instance
window.skeletonLoader = new SkeletonLoader(); 