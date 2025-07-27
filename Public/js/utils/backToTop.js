export default class BackToTop {
    constructor(selector = null) {
        this.button = null;
        this.selector = selector;
        this.init();
    }

    init() {
        // Try to use existing button first
        if (this.selector) {
            this.button = document.querySelector(this.selector);
        }
        
        // If no existing button found, create one
        if (!this.button) {
            this.createButton();
        }

        // Add event listeners
        window.addEventListener('scroll', () => this.toggleButton());
        this.button.addEventListener('click', () => this.scrollToTop());
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.innerHTML = '<i class="fas fa-arrow-up"></i>';
        this.button.className = 'back-to-top';
        this.button.id = 'backToTop';
        document.body.appendChild(this.button);

        // Add styles only if we created the button
        const backToTopStyle = document.createElement('style');
        backToTopStyle.textContent = `
            .back-to-top {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                border: none;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                z-index: 1000;
            }

            .back-to-top:hover {
                background: #0056b3;
                transform: translateY(-3px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }

            .back-to-top.visible {
                display: flex;
            }

            @media (max-width: 768px) {
                .back-to-top {
                    bottom: 20px;
                    right: 20px;
                    width: 40px;
                    height: 40px;
                    font-size: 16px;
                }
            }
        `;
        document.head.appendChild(backToTopStyle);
    }

    toggleButton() {
        if (window.scrollY > 300) {
            this.button.classList.add('visible');
        } else {
            this.button.classList.remove('visible');
        }
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}