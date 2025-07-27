// /Public/js/pages/reise.js

let departureIataCode = '';
let arrivalIataCode = '';
let searchTimeout;

function fetchAirportSuggestions(inputElement, suggestionsElement) {
    const query = inputElement.value.trim();

    if (query.length < 2) { // Don't search for less than 2 characters
        suggestionsElement.innerHTML = '';
        suggestionsElement.style.display = 'none';
        return;
    }

    // Use the new server endpoint
    fetch(`/api/airports/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            displaySuggestions(data, suggestionsElement, inputElement.id === 'departure');
        })
        .catch(error => {
            console.error('Error fetching airport suggestions:', error);
        });
}

// Display the suggestions returned from the server
function displaySuggestions(suggestions, suggestionsElement, isDeparture) {
    suggestionsElement.innerHTML = '';

    if (suggestions.length > 0) {
        suggestions.forEach(airport => {
            const suggestionItem = document.createElement('li');
            suggestionItem.textContent = `${airport.name} (${airport.iata}) - ${airport.city}`;
            suggestionItem.onclick = () => {
                selectAirport(airport, isDeparture);
            };
            suggestionsElement.appendChild(suggestionItem);
        });
        suggestionsElement.style.display = 'block';
    } else {
        suggestionsElement.style.display = 'none';
    }
}

function selectAirport(airport, isDeparture) {
    const input = document.getElementById(isDeparture ? 'departure' : 'arrival');
    const suggestionsList = document.getElementById(isDeparture ? 'departure-suggestions' : 'arrival-suggestions');

    input.value = `${airport.name} (${airport.iata}) - ${airport.city}`;
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';

    if (isDeparture) {
        departureIataCode = airport.iata;
    } else {
        arrivalIataCode = airport.iata;
    }
}

function setupEventListeners() {
    const departureInput = document.getElementById('departure');
    const arrivalInput = document.getElementById('arrival');
    const departureSuggestions = document.getElementById('departure-suggestions');
    const arrivalSuggestions = document.getElementById('arrival-suggestions');

    if (!departureInput || !arrivalInput) return;

    // Attach debounced event listeners to the input fields
    departureInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAirportSuggestions(departureInput, departureSuggestions);
        }, 300); // Debounce: wait 300ms after user stops typing
    });

    arrivalInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAirportSuggestions(arrivalInput, arrivalSuggestions);
        }, 300);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!departureInput.contains(e.target)) departureSuggestions.style.display = 'none';
        if (!arrivalInput.contains(e.target)) arrivalSuggestions.style.display = 'none';
    });

    // Form submission logic 
    const flightSearchForm = document.getElementById('flightSearchForm');
    if (flightSearchForm) {
        flightSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!departureIataCode || !arrivalIataCode) {
                alert('Please select a valid departure and arrival airport from the suggestions.');
                return;
            }

            const tripType = document.getElementById('tripType').value;
            const departureDate = document.getElementById('departureDate').value.replace(/-/g, '');
            const returnDate = tripType === 'roundtrip' ? document.getElementById('returnDate').value.replace(/-/g, '') : '';
            const passengers = document.getElementById('passengers').value;

            let skyscannerUrl = `https://www.skyscanner.com/transport/flights/${departureIataCode}/${arrivalIataCode}/${departureDate}/`;
            if (tripType === 'roundtrip' && returnDate) {
                skyscannerUrl += `${returnDate}/`;
            }
            skyscannerUrl += `?adults=${passengers}`;
            window.open(skyscannerUrl, '_blank');
        });
    }

    // Trip type toggle logic 
    const tripTypeSelect = document.getElementById('tripType');
    const returnDateGroup = document.getElementById('returnDateGroup');
    if (tripTypeSelect && returnDateGroup) {
        tripTypeSelect.addEventListener('change', (e) => {
            returnDateGroup.style.display = e.target.value === 'roundtrip' ? 'block' : 'none';
        });
    }
}

export default function initReisePage() {
    console.log('Initializing reise (flight search) page...');
    
    // Check if on the correct page
    if (!document.querySelector('.reise-container')) return;

    setupEventListeners();
    
    console.log('Reise page initialized successfully');
}