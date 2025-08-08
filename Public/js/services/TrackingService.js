// TrackingService.js
// Centralized Google Ads/Analytics tracking utilities

let initialized = false;
let defaultConversionId = null;

export function initTracking({
  adsId = 'AW-17043604198',
  ga4Id = null,
  conversionLabel = 'a7mbCPT9tr8aEOaFg78_',
  debug = false
} = {}) {
  if (initialized) return;

  // Determine which ID to load gtag with
  const idForLoader = adsId || ga4Id;
  if (!idForLoader) return;

  // Inject gtag.js once
  if (!document.getElementById('gtag-script')) {
    const s = document.createElement('script');
    s.id = 'gtag-script';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(idForLoader)}`;
    document.head.appendChild(s);
  }

  // Set up dataLayer and gtag function (queues until library fully loads)
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());

  if (adsId) {
    gtag('config', adsId);
    if (conversionLabel) {
      defaultConversionId = `${adsId}/${conversionLabel}`;
    }
  }

  if (ga4Id) {
    gtag('config', ga4Id, { debug_mode: !!debug });
  }

  // Initial page view (for SPA, also call on route changes)
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href
  });

  initialized = true;
}

export function trackEvent(eventName, parameters = {}) {
  if (typeof window.gtag === 'function') {
    console.log('Tracking event:', eventName, parameters);
    window.gtag('event', eventName, parameters);
  } else {
    console.warn('gtag not initialized. Skipping event:', eventName, parameters);
  }
}

export function trackConversion(conversionId = defaultConversionId) {
  if (typeof window.gtag === 'function' && conversionId) {
    console.log('Tracking conversion:', conversionId);
    window.gtag('event', 'conversion', { send_to: conversionId });
  } else {
    console.warn('gtag not initialized or conversionId missing. Skipping conversion.');
  }
}

// Convenience wrappers matching current public API
export function trackProductView(productId, category, price) {
  trackEvent('view_item', {
    item_id: productId,
    item_category: category,
    value: price,
    currency: 'USD'
  });
}

export function trackSearch(searchTerm, category = null) {
  trackEvent('search', {
    search_term: searchTerm,
    ...(category && { search_category: category })
  });
}

export function trackAdClick(productId, category) {
  trackEvent('select_content', {
    content_type: 'product',
    item_id: productId,
    item_category: category
  });
}

export function trackAdUpload(category, productId = null) {
  trackEvent('ad_upload', {
    ad_category: category,
    content_type: 'classified_ad',
    ...(productId && { item_id: productId })
  });
}

export function trackAdEdit(productId, category) {
  trackEvent('ad_edit', {
    item_id: productId,
    ad_category: category,
    content_type: 'classified_ad'
  });
}

export function trackAdDelete(productId, category) {
  trackEvent('ad_delete', {
    item_id: productId,
    ad_category: category,
    content_type: 'classified_ad'
  });
}

export function trackContactSeller(productId, category = null) {
  trackEvent('contact_seller', {
    content_type: 'message',
    item_id: productId,
    ...(category && { item_category: category })
  });
}

export function trackFavoriteToggle(productId, action, category = null) {
  trackEvent(action === 'add' ? 'add_to_favorites' : 'remove_from_favorites', {
    content_type: 'product',
    item_id: productId,
    ...(category && { item_category: category })
  });
}
