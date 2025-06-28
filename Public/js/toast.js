class Toast {
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

        // Use a proper <span> for the message content to avoid layout issues
        const messageSpan = document.createElement('span');
        messageSpan.innerHTML = message; // Use innerHTML to allow for links (e.g., in login prompts)

        const contentDiv = document.createElement('div');
        contentDiv.className = 'toast-content';
        contentDiv.innerHTML = `<i class="fas ${this.getIcon(type)}"></i>`;
        contentDiv.appendChild(messageSpan);
        
        toast.appendChild(contentDiv);

        // Create and append the close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close-btn'; // Use the new, better class name
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close');
        toast.appendChild(closeBtn);

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

// Create global toast instance
window.toast = new Toast();