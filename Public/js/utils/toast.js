export default class Toast {
    constructor() {
        this.container = null;
        this.init();
        // REMOVED: The call to this.addStyles() is gone.
    }

    init() {
        // This part is still necessary to create the main container div
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            // We can even add the class here for consistency
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon Wrapper
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'toast-icon-wrapper';
        iconWrapper.innerHTML = `<i class="fas ${this.getIcon(type)}"></i>`;

        // Message Container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'toast-message';
        
        const title = document.createElement('div');
        title.className = 'toast-title';
        title.textContent = type; // Or pass a title argument

        const body = document.createElement('div');
        body.className = 'toast-body';
        body.innerHTML = message;

        messageContainer.appendChild(title);
        messageContainer.appendChild(body);

        // Content Wrapper (Icon + Message)
        const contentDiv = document.createElement('div');
        contentDiv.className = 'toast-content';
        contentDiv.appendChild(iconWrapper);
        contentDiv.appendChild(messageContainer);
        
        toast.appendChild(contentDiv);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.setAttribute('aria-label', 'Close');
        toast.appendChild(closeBtn);

        // Progress Bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'toast-progress';
        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress-bar';
        progressBar.style.animationDuration = `${duration}ms`;
        progressContainer.appendChild(progressBar);
        toast.appendChild(progressContainer);

        this.container.appendChild(toast);

        // Add close button functionality
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // Auto remove after duration
        setTimeout(() => this.removeToast(toast), duration);
    }

    removeToast(toast) {
        if (toast && toast.parentElement) {
            toast.classList.add('toast-fade-out');
            // Wait for the animation to finish before removing the element
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }
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

    // --- DELETED ---
    // The entire addStyles() method has been removed from here.
    // --- DELETED ---
}