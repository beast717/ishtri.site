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
            // Force reload all auth-related elements
            window.location.href = '/';
            setTimeout(() => window.location.reload(true), 500); // Hard reload
        } else {
            showErrorMessage(errorMessage, data.error || 'Google login failed');
        }
    } catch (error) {
        console.error('Google auth error:', error);
        showErrorMessage(errorMessage, 'Connection error. Please try again');
    }
}

function initializeGoogleAuth() {
    if (typeof google === 'undefined') {
        setTimeout(initializeGoogleAuth, 100);
        return;
    }
    
    const googleSignInButton = document.getElementById('googleSignIn');
    
    if (!googleSignInButton) {
        console.error('Google Sign-In button element not found!');
        return;
    }
    
    try {
        // Clear any existing content
        googleSignInButton.innerHTML = '';
        
        google.accounts.id.initialize({
            client_id: '502881498259-u0g6k4se00su93ocksenfrh96jv8j9bn.apps.googleusercontent.com',
            callback: handleGoogleResponse,
            auto_select: false,
            context: 'signin',
            use_fedcm_for_prompt: false // Disable FedCM which can cause issues
        });
        
        google.accounts.id.renderButton(
            googleSignInButton,
            { 
                type: 'standard', 
                theme: 'outline', 
                size: 'large', 
                width: '240',
                text: 'signin_with'
            }
        );
        
        // Check if button was actually rendered
        setTimeout(() => {
            const iframe = googleSignInButton.querySelector('iframe');
            if (!iframe) {
                // Add fallback message
                googleSignInButton.innerHTML = `
                    <div class="google-signin-fallback">
                        Google Sign-In temporarily unavailable<br>
                        <small>Please use regular login below</small>
                    </div>
                `;
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
        
        // Show error message in the button container
        googleSignInButton.innerHTML = `
            <div class="google-signin-error">
                Google Sign-In Error<br>
                <small>Please use regular login</small>
            </div>
        `;
    }
}

function handleFormSubmissions() {
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.querySelector('#signupForm form');
    
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = loginForm.querySelector('button');
            const errorMessage = document.getElementById('errorMessage');
            
            // Show loading state
            button.innerHTML = 'Processing...';
            button.disabled = true;
            errorMessage.style.display = 'none';

            try {
                const formData = new FormData(loginForm);
                const data = Object.fromEntries(formData.entries());
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const responseData = await response.json();
                
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    showErrorMessage(errorMessage, responseData.message || 'Invalid credentials', loginForm.querySelector('#loginPassword'));
                    resetButton(button, 'Continue →');
                }
            } catch (error) {
                console.error('Login error:', error);
                showErrorMessage(errorMessage, 'Connection error. Please try again later', loginForm.querySelector('#loginPassword'));
                resetButton(button, 'Continue →');
            }
        });
    }

    if(signupForm) {
        let messageArea = document.getElementById('signupMessageArea');
        if (!messageArea) {
            messageArea = document.createElement('div');
            messageArea.id = 'signupMessageArea';
            signupForm.insertBefore(messageArea, signupForm.querySelector('button'));
        }

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = signupForm.querySelector('button');
            const password = signupForm.querySelector('#signupPassword').value;
            const confirmPassword = signupForm.querySelector('#confirmPassword').value;
            
            // Clear any existing messages
            messageArea.innerHTML = '';
            messageArea.style.display = 'none';

            // Validate passwords match
            if (password !== confirmPassword) {
                showErrorMessage(messageArea, 'Passwords do not match', signupForm.querySelector('#confirmPassword'));
                return;
            }

            // Show loading state
            button.innerHTML = 'Creating Account...';
            button.disabled = true;

            try {
                const formData = new FormData(signupForm);
                const data = Object.fromEntries(formData.entries());
                
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const responseData = await response.json();
                
                if (response.ok) {
                    // Show success message and redirect
                    showSuccessMessage(messageArea, 'Account created successfully! Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                } else {
                    showErrorMessage(messageArea, responseData.message || 'Failed to create account');
                    resetButton(button, 'Create Account');
                }
            } catch (error) {
                console.error('Signup error:', error);
                showErrorMessage(messageArea, 'Connection error. Please try again later');
                resetButton(button, 'Create Account');
            }
        });
    }
}

function showErrorMessage(element, message, focusElement = null) {
    element.innerHTML = message;
    element.className = 'alert alert-error error-message';
    element.style.display = 'block';
    
    if (focusElement) {
        focusElement.classList.add('invalid');
        focusElement.focus();
    }
}

function showSuccessMessage(element, message) {
    element.innerHTML = message;
    element.className = 'alert alert-success success-message';
    element.style.display = 'block';
}

function resetButton(button, text) {
    button.innerHTML = text;
    button.disabled = false;
}

function setupInputValidation() {
    // Remove invalid class on input change
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => input.classList.remove('invalid'));
    });
}

export default function initAuthPage() {
    // Check if on the correct page
    if (!document.querySelector('.auth-page-body')) return;

    handleFormToggle();
    handlePasswordVisibility();
    handleFormSubmissions();
    setupInputValidation();
    
    // Initialize Google Auth with a delay to ensure DOM and Google API are ready
    setTimeout(() => {
        initializeGoogleAuth();
    }, 500);
}
