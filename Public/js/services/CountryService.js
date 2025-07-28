/**
 * Country Service - Handles country and car brand data loading
 */

import { queryEl } from '../utils/domUtils.js';

export class CountryService {
    /**
     * Initialize countries and cities
     */
    async initializeCountries() {
        const countryList = queryEl('.country-list');
        if (!countryList || countryList.dataset.initialized) return;

        try {
            const response = await fetch('/api/utils/countries');
            const countries = await response.json();
            
            countries.forEach(countryData => {
                const countryItem = document.createElement('li');
                countryItem.innerHTML = `
                    <input type="checkbox" id="${countryData.country}" value="${countryData.country}" class="country-checkbox">
                    <label for="${countryData.country}">${countryData.country}</label>
                    <ul class="city-list" id="${countryData.country}-cities" style="display: none;"></ul>`;
                
                const cityList = countryItem.querySelector('.city-list');
                countryData.cities.forEach((cityName, index) => {
                    const cityId = countryData.city_ids[index];
                    cityList.innerHTML += `<li><input type="checkbox" id="city_${cityId}" value="${cityId}" class="city-checkbox"><label for="city_${cityId}">${cityName}</label></li>`;
                });
                countryList.appendChild(countryItem);
            });
            countryList.dataset.initialized = 'true';
        } catch (error) {
            console.error("Error loading countries:", error);
            countryList.innerHTML = '<li>Error loading filters.</li>';
        }
    }

    /**
     * Initialize car brands
     */
    async initializeCarBrands() {
        const carBrandList = queryEl('.car-brand-list');
        if (!carBrandList || carBrandList.dataset.initialized) return;

        try {
            const response = await fetch('/api/utils/car-brands');
            const brands = await response.json();
            
            brands.forEach(brand => {
                const brandItem = document.createElement('li');
                brandItem.innerHTML = `
                    <input type="checkbox" id="brand_${brand.brand_id}" value="${brand.brand_id}" class="brand-checkbox">
                    <label for="brand_${brand.brand_id}">${brand.brand_name}</label>`;
                carBrandList.appendChild(brandItem);
            });
            carBrandList.dataset.initialized = 'true';
        } catch (error) {
            console.error("Error loading car brands:", error);
            carBrandList.innerHTML = '<li>Error loading car brands.</li>';
        }
    }
}
