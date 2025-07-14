// /Public/js/pages/auth.js

function handleFormToggle() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupLink = document.getElementById('showSignupLink');
    const showLoginLink = document.getElementById('showLoginLink');

    if (!loginForm || !signupForm || !showSignupLink || !showLoginLink) return;

    const toggle = () => {
        loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
        signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
        document.querySelectorAll('.alert').forEach(alert => alert.style.display = 'none');
    };

    showSignupLink.addEventListener('click', toggle);
    showLoginLink.addEventListener('click', toggle);
}

function handlePasswordVisibility() {
    const svgIconShow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
    const svgIconHide = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

    document.querySelectorAll('.password-toggle-icon').forEach(icon => {
        icon.innerHTML = svgIconShow; // Set initial state
        icon.addEventListener('click', (e) => {
            const input = e.currentTarget.closest('.password-toggle').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                e.currentTarget.innerHTML = svgIconHide;
            } else {
                input.type = 'password';
                e.currentTarget.innerHTML = svgIconShow;
            }
        });
    });
}

async function handleGoogleResponse(response) {
    const errorMessage = document.getElementById('errorMessage');
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (res.ok) {
            window.location.href = '/';
        } else {
            if (errorMessage) {
                errorMessage.textContent = data.error || 'Google login failed';
                errorMessage.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorMessage) {
            errorMessage.textContent = 'Connection error. Please try again.';
            errorMessage.style.display = 'block';
        }
    }
}

function initializeGoogleAuth() {
    if (typeof google === 'undefined') {
        setTimeout(initializeGoogleAuth, 100);
        return;
    }
    google.accounts.id.initialize({
        client_id: '502881498259-u0g6k4se00su93ocksenfrh96jv8j9bn.apps.googleusercontent.com',
        callback: handleGoogleResponse,
    });
    const googleSignInButton = document.getElementById('googleSignIn');
    if (googleSignInButton) {
        google.accounts.id.renderButton(googleSignInButton, { theme: 'outline', size: 'large' });
    }
}

function handleFormSubmissions() {
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.querySelector('#signupForm form');
    
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                window.location.href = '/';
            } else {
                const errorData = await response.json();
                const errorMessage = document.getElementById('errorMessage');
                errorMessage.textContent = errorData.message || 'Invalid credentials.';
                errorMessage.style.display = 'block';
            }
        });
    }

    if(signupForm) {
        let messageArea = document.getElementById('signupMessageArea');
        if (!messageArea) {
            messageArea = document.createElement('div');
            messageArea.id = 'signupMessageArea';
            signupForm.parentNode.insertBefore(messageArea, signupForm);
        }
        
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());

            if (data.passord !== data.confirmPassword) {
                messageArea.className = 'alert alert-error';
                messageArea.textContent = 'Passwords do not match.';
                messageArea.style.display = 'block';
                return;
            }
            
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            
            const responseData = await response.json();
            messageArea.className = response.ok ? 'alert alert-success' : 'alert alert-error';
            messageArea.textContent = responseData.message;
            messageArea.style.display = 'block';

            if(response.ok) {
                signupForm.reset();
            }
        });
    }
}

export default function initAuthPage() {
    handleFormToggle();
    handlePasswordVisibility();
    initializeGoogleAuth();
    handleFormSubmissions();
}