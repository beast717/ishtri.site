// shared.js
function checkUnreadMessages() {
    fetch('/api/messages/unread-count')
        .then(response => response.json())
        .then(data => {
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
                if (data.unreadCount > 0) {
                    badge.setAttribute('title', i18next.t('meldinger.unread_count', { count: data.unreadCount }));
                }
            } else {
                console.error(i18next.t('errors.element_not_found', { element: 'unreadBadge' }));
            }
        })
        .catch(error => console.error(i18next.t('errors.fetch_failed', { error: error.message })));
}

// Function to update all translatable content on the page
function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18next.t(key);
        if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) {
            element.placeholder = translation;
        } else {
            element.innerHTML = translation;
        }
    });
}

// Function to handle language changes
function changeLanguage(lng) {
    if (!lng) return;
    
    localStorage.setItem('selectedLanguage', lng);
    i18next.changeLanguage(lng, (err) => {
        if (err) {
            console.error(i18next.t('errors.init_failed', { error: err }));
            return;
        }
        
        // Update content and UI
        updateContent();
        updateLanguageUI(lng);
    });
}

// Function to update language-specific UI elements
function updateLanguageUI(lng) {
    // Update document direction
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    
    // Update language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && languageSelect.value !== lng) {
        languageSelect.value = lng;
    }
}

// Initialize translations
document.addEventListener('DOMContentLoaded', () => {
    // Get saved language or detect from browser
    const savedLanguage = localStorage.getItem('selectedLanguage');
    const browserLanguage = navigator.language.split('-')[0];
    const defaultLanguage = savedLanguage || ((['no', 'en', 'ar'].includes(browserLanguage)) ? browserLanguage : 'no');

    // Initialize i18next
    i18next
        .use(i18nextHttpBackend)
        .use(i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: defaultLanguage,
            supportedLngs: ['no', 'en', 'ar'],
            load: 'languageOnly',
            backend: {
                loadPath: '/locales/{{lng}}.json',
            }
        }, (err, t) => {
            if (err) {
                console.error('Translation initialization failed:', err);
                return;
            }
            
            // Update UI with initial language
            updateLanguageUI(i18next.language);
            updateContent();
            
            // Check for unread messages
            checkUnreadMessages();
            
            // Dispatch event when translations are loaded
            document.dispatchEvent(new Event('i18next.loaded'));
        });

    // Add language change event listener
    i18next.on('languageChanged', (lng) => {
        updateLanguageUI(lng);
        updateContent();
    });
});