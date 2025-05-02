class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        this.container.appendChild(toast);

        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // Auto remove after duration
        setTimeout(() => this.removeToast(toast), duration);
    }

    removeToast(toast) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    addStyles() {
        // Check if styles already exist
        if (document.getElementById('toast-styles')) {
            return;
        }
        const toastStyleElement = document.createElement('style'); // Renamed variable
        toastStyleElement.id = 'toast-styles'; // Add an ID for checking
        toastStyleElement.textContent = `
            #toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .toast {
                background: white;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }

            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .toast i {
                font-size: 1.2em;
            }

            .toast-success {
                border-left: 4px solid #28a745;
            }

            .toast-error {
                border-left: 4px solid #dc3545;
            }

            .toast-warning {
                border-left: 4px solid #ffc107;
            }

            .toast-info {
                border-left: 4px solid #17a2b8;
            }

            .toast-close {
                background: none;
                border: none;
                font-size: 1.2em;
                cursor: pointer;
                padding: 0 5px;
                color: #666;
            }

            .toast-close:hover {
                color: #333;
            }

            .toast-fade-out {
                animation: slideOut 0.3s ease forwards;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(toastStyleElement); // Use renamed variable
    }
}

// Create global toast instance
window.toast = new Toast();