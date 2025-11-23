const baseUrl = process.env.APP_BASE_URL || 'https://ishtri.site';

const DEFAULTS = {
  title: 'Ishtri | Buy, Sell, Travel & More - Your Universe Of Products',
  description: 'Discover Ishtri — the marketplace to buy and sell cars, property, jobs, travel deals, and unique finds across the Middle East and beyond.',
  keywords: 'Ishtri, marketplace, buy, sell, classifieds, travel deals, cars, boats, property listings'
};

const absoluteUrl = (pathOrUrl = '/') => {
  if (!pathOrUrl) return baseUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  try {
    return new URL(normalized, baseUrl).toString();
  } catch (err) {
    return `${baseUrl}${normalized}`;
  }
};

const slugify = (value = '') => value
  .toString()
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')           // Replace spaces with -
  .replace(/[^\w\u0600-\u06FF\-]+/g, '') // Remove all non-word chars (except Arabic and -)
  .replace(/\-\-+/g, '-')         // Replace multiple - with single -
  .replace(/^-+/, '')             // Trim - from start of text
  .replace(/-+$/, '')             // Trim - from end of text
  .substring(0, 80);

const sanitize = (text = '') => text
  .toString()
  .replace(/\s+/g, ' ')
  .trim();

function buildSeo(options = {}) {
  const {
    title = DEFAULTS.title,
    description = DEFAULTS.description,
    keywords = DEFAULTS.keywords,
    path = '/',
    canonical,
    ogImage,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    robots = 'index,follow',
    alternates = [],
    extraMeta = [],
    structuredData = [],
    includeSiteSchema,
    ogLocale = 'en_US',
    ogLocaleAlternates = []
  } = options;

  const resolvedCanonical = canonical ? absoluteUrl(canonical) : absoluteUrl(path);
  const resolvedOgImage = ogImage ? absoluteUrl(ogImage) : `${baseUrl}/ishtri1.png`;

  return {
    title,
    description: sanitize(description) || DEFAULTS.description,
    keywords,
    canonical: resolvedCanonical,
    ogImage: resolvedOgImage,
    ogType,
    twitterCard,
    robots,
    alternates,
    extraMeta,
    structuredData,
    includeSiteSchema,
    ogLocale,
    ogLocaleAlternates
  };
}

function getHomeSeo() {
  return buildSeo({
    path: '/',
    title: 'Ishtri | Marketplace & Travel Deals In One App',
    description: 'Marketplace for cars, property, jobs, travel, and unique finds across MENA. Browse verified listings and plan your next trip with Ishtri.',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Ishtri Marketplace',
        'url': baseUrl,
        'description': 'All-in-one classifieds and travel marketplace for the Middle East and beyond.'
      }
    ]
  });
}

function getSearchSeo(query = '') {
  const cleanQuery = query?.toString().trim();
  const hasQuery = Boolean(cleanQuery);
  const path = hasQuery ? `/search?query=${encodeURIComponent(cleanQuery)}` : '/search';
  return buildSeo({
    path,
    title: hasQuery ? `${cleanQuery} listings | Ishtri search` : 'Search listings | Ishtri',
    description: hasQuery
      ? `Live listings, travel packages, and jobs related to "${cleanQuery}" across the Ishtri marketplace.`
      : 'Filter thousands of Ishtri listings by price, location, and category to find your next purchase.',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        'name': 'Ishtri search results',
        'url': absoluteUrl(path),
        'query': cleanQuery || undefined,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${baseUrl}/search?query={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ].filter(Boolean)
  });
}

function getProductSeo(product) {
  if (!product) {
    return buildSeo({
      title: 'Product details | Ishtri',
      description: 'Browse detailed marketplace listings on Ishtri.',
      path: '/product',
      ogType: 'product',
      robots: 'noindex,follow'
    });
  }

  const slug = slugify(product.ProductName || 'product');
  const path = `/product/${product.ProductdID || product.productdID}/${slug}`;
  const imageList = typeof product.Images === 'string'
    ? product.Images.split(',').map(img => img.trim()).filter(Boolean)
    : [];
  const firstImage = imageList[0];
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.ProductName,
      'image': imageList.length
        ? imageList.map(img => absoluteUrl(`/img/1200/${img}`))
        : [`${baseUrl}/images/default.svg`],
      'description': sanitize(product.Description),
      'sku': product.ProductdID || product.productdID,
      'mpn': product.ProductdID || product.productdID,
      'brand': product.brand_name
        ? {
            '@type': 'Brand',
            'name': product.brand_name
          }
        : undefined,
      'offers': {
        '@type': 'Offer',
        'url': absoluteUrl(path),
        'priceCurrency': 'USD',
        'price': product.Price,
        'availability': product.Sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        'itemCondition': 'https://schema.org/UsedCondition'
      },
      'areaServed': product.country || product.Location || undefined
    }
  ];

  return buildSeo({
    path,
    title: `${product.ProductName} ${product.Location ? `in ${product.Location}` : ''} | Ishtri`,
    description: product.Description
      ? sanitize(product.Description).slice(0, 155)
      : `View details for ${product.ProductName} on Ishtri.`,
    ogImage: firstImage ? `/img/1200/${firstImage}` : undefined,
    ogType: 'product',
    structuredData,
    robots: 'index,follow'
  });
}

module.exports = {
  baseUrl,
  absoluteUrl,
  slugify,
  buildSeo,
  getHomeSeo,
  getSearchSeo,
  getProductSeo
};
