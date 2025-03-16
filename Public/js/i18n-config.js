// Initialize i18next
if (!window.i18nextInitialized) {
    window.i18nextInitialized = true;

    // Get saved language or default to 'en'
    const savedLanguage = localStorage.getItem('language') || 'en';

    i18next
        .use(i18nextHttpBackend)
        .use(i18nextBrowserLanguageDetector)
        .init({
            debug: false,
            fallbackLng: 'en',
            supportedLngs: ['en', 'no'], // Add your supported languages here
            lng: savedLanguage, // Set initial language
            ns: ['translation'], // Namespace
            defaultNS: 'translation',
            backend: {
                loadPath: '/locales/{{lng}}.json',
            },
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage']
            }
        })
        .then(() => {
            // Update content only after i18next is initialized
            updateContent();
            // Save the language preference
            localStorage.setItem('language', i18next.language);
        })
        .catch(err => {
            console.error('i18next initialization error:', err);
        });
}

// Update Translatable Content
function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (!key) return;

        try {
            const translation = i18next.t(key);
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.innerHTML = translation;
            }
        } catch (err) {
            console.warn(`Translation error for key "${key}":`, err);
        }
    });
}

// Event listener for language change
document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        // Set initial value
        languageSelect.value = i18next.language;

        languageSelect.addEventListener('change', (e) => {
            const selectedLanguage = e.target.value;
            i18next.changeLanguage(selectedLanguage)
                .then(() => {
                    updateContent();
                    localStorage.setItem('language', selectedLanguage);
                })
                .catch(err => {
                    console.error('Language change error:', err);
                });
        });
    }
}); 