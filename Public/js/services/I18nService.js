/**
 * Internationalization (i18n) Service
 * Handles language switching and translation functionality
 */

class I18nService {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.isRTL = false;
    }

    /**
     * Initialize the i18n service
     */
    async init() {
        // Load saved language preference or detect from browser
        const savedLang = localStorage.getItem('preferredLanguage') || 
                         navigator.language.split('-')[0] || 'en';
        
        // Validate the language
        const validLangs = ['en', 'ar'];
        this.currentLanguage = validLangs.includes(savedLang) ? savedLang : 'en';

        // Load translations for the current language
        await this.loadTranslations(this.currentLanguage);
        
        // Apply initial language
        this.applyLanguage(this.currentLanguage);
        
        // Setup language selector
        this.setupLanguageSelector();
    }

    /**
     * Load translation file for a specific language
     * @param {string} lang - Language code
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${lang}`);
            }
            const data = await response.json();
            this.translations[lang] = data.translation;
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            // Fallback to English if not already trying English
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key (e.g., 'navbar.notifications')
     * @param {string} lang - Language code (optional, uses current language)
     * @returns {string} Translated text or key if not found
     */
    t(key, lang = this.currentLanguage) {
        const translations = this.translations[lang];
        if (!translations) return key;

        const keys = key.split('.');
        let result = translations;
        
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return typeof result === 'string' ? result : key;
    }

    /**
     * Set the active language
     * @param {string} lang - Language code
     */
    async setLanguage(lang) {
        if (lang === this.currentLanguage) return;

        // Load translations if not already loaded
        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        this.currentLanguage = lang;
        this.isRTL = lang === 'ar';

        // Save preference
        try {
            localStorage.setItem('preferredLanguage', lang);
        } catch (e) {
            console.error('Could not save language preference:', e);
        }

        // Apply the language
        this.applyLanguage(lang);
    }

    /**
     * Apply language to the DOM
     * @param {string} lang - Language code
     */
    applyLanguage(lang) {
        // Update document language and direction
        document.documentElement.lang = lang;
        document.documentElement.dir = this.isRTL ? 'rtl' : 'ltr';
        
        // Add/remove RTL class for styling
        if (this.isRTL) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }

        // Update all elements with data-i18n attributes
        this.updateTranslatedElements();
        
        // Update language selector
        this.updateLanguageSelector(lang);

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang, isRTL: this.isRTL } 
        }));
    }

    /**
     * Update all elements with data-i18n attributes
     */
    updateTranslatedElements() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const dataValue = element.getAttribute('data-i18n');
            
            // Check if it's an attribute-specific translation like [placeholder]key
            const attributeMatch = dataValue.match(/^\[(\w+)\](.+)$/);
            
            if (attributeMatch) {
                const [, attribute, key] = attributeMatch;
                const translation = this.t(key);
                
                // Set the specific attribute
                element.setAttribute(attribute, translation);
            } else {
                // Standard text content translation
                const translation = this.t(dataValue);
                
                // Update text content (preserve HTML structure)
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    // Only update text nodes, preserve child elements
                    const textNode = Array.from(element.childNodes)
                        .find(node => node.nodeType === Node.TEXT_NODE);
                    if (textNode) {
                        textNode.textContent = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            }
        });
    }

    /**
     * Setup language selector event listener
     */
    setupLanguageSelector() {
        const languageSelect = document.getElementById('languageSelect');
        if (!languageSelect) return;

        languageSelect.addEventListener('change', async (e) => {
            const selectedLang = e.target.value;
            await this.setLanguage(selectedLang);
        });
    }

    /**
     * Update language selector to reflect current language
     * @param {string} lang - Language code
     */
    updateLanguageSelector(lang) {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && languageSelect.value !== lang) {
            languageSelect.value = lang;
        }
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Check if current language is RTL
     * @returns {boolean} True if RTL
     */
    isRightToLeft() {
        return this.isRTL;
    }
}

// Export singleton instance
export const i18nService = new I18nService();
