/**
 * New Ad page functionality - Complete form handling for creating new ads
 */

let selectedFiles = [];
const MAX_FILES = 5;
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function initNewAdPage() {
    // Check if on the correct page
    if (!document.getElementById('productForm')) return;

    // Initialize page
    initializeNewAd();

    function initializeNewAd() {
        // Get DOM elements
        const form = document.getElementById('productForm');
        const categoryContainer = document.querySelector('.kategorierContainer');
        const formContainer = document.getElementById('productFormContainer');
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('Images');
        const previewContainer = document.getElementById('imagePreviewContainer');

        if (!form || !categoryContainer) {
            console.error('Required form elements not found');
            return;
        }

        // Setup event listeners
        setupEventListeners();

        // Load dynamic data and wait for them to complete
        Promise.all([
            loadCountries(),
            loadCarBrands()
        ]).then(() => {
            console.log('All dynamic data loaded');
        }).catch(error => {
            console.error('Error loading dynamic data:', error);
        });

        // Setup form auto-saving
        setupFormDataSaving();

        // Add clear form button
        addClearFormButton();

        // Add real-time validation
        addRealTimeValidation();

        // Setup dynamic event handlers
        setupDynamicEventHandlers();

        // Restore form data after all setup is complete
        restoreFormData();

        function setupEventListeners() {
            // Category selection
            categoryContainer.addEventListener('click', (e) => {
                const kategoriDiv = e.target.closest('.kategori');
                if (kategoriDiv) {
                    const category = kategoriDiv.dataset.category;
                    setCategory(category);
                }
            });

            // Image upload handling
            if (dropZone && fileInput) {
                setupImageUpload();
            }

            // Form submission
            form.addEventListener('submit', handleFormSubmit);
        }

        function setupImageUpload() {
            // Click to upload
            dropZone.addEventListener('click', () => fileInput.click());

            // File input change
            fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

            // Drag and drop events
            dropZone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                handleFiles(files);
            });
        }

        function setCategory(category) {
            console.log('Setting category:', category);
            
            // Update hidden category field
            document.getElementById('Category').value = category;
            
            // Show form container
            formContainer.style.display = 'block';

            // Hide all category sections
            const sections = ['productFields', 'jobFields', 'propertyFields', 'carFields', 'boatFields', 'mcFields'];
            sections.forEach(id => {
                const section = document.getElementById(id);
                if (section) section.style.display = 'none';
            });

            // Show relevant section and render its fields
            const sectionMap = {
                'Torget': 'productFields',
                'Bil': 'carFields', 
                'Eiendom': 'propertyFields',
                'Båt': 'boatFields',
                'MC': 'mcFields',
                'Jobb': 'jobFields'
            };

            const activeSection = document.getElementById(sectionMap[category]);
            if (activeSection) {
                activeSection.style.display = 'block';
                
                // Render dynamic fields for complex categories
                if (category === 'Jobb') {
                    renderJobFields();
                } else if (category === 'Eiendom') {
                    renderPropertyFields();
                } else if (category === 'Bil') {
                    renderCarFields();
                } else if (category === 'Båt') {
                    renderBoatFields();
                } else if (category === 'MC') {
                    renderMCFields();
                }
            }

            // Update required fields based on category
            updateRequiredFields(category);
        }

        function renderJobFields() {
            const jobSection = document.getElementById('jobFields');
            if (!jobSection) return;

            jobSection.innerHTML = `
                <h3 data-i18n="form.job_details">Job Details</h3>
                <div class="form-group">
                    <label for="JobTitle" data-i18n="form.job_title">Job Title <span class="required">*</span></label>
                    <input type="text" id="JobTitle" name="JobTitle" data-i18n="[placeholder]form.job_title_placeholder" placeholder="e.g., Software Engineer, Marketing Manager">
                    <div class="error-message" id="JobTitleError"></div>
                </div>
                <div class="form-group">
                    <label for="CompanyName" data-i18n="form.company_name">Company Name</label>
                    <input type="text" id="CompanyName" name="CompanyName" data-i18n="[placeholder]form.company_name_placeholder" placeholder="e.g., Tech Solutions Inc.">
                </div>
                <div class="form-group">
                    <label for="EmploymentType" data-i18n="form.employment_type">Employment Type</label>
                    <select id="EmploymentType" name="EmploymentType">
                        <option value="Fast" data-i18n="employment.full_time">Full Time</option>
                        <option value="Deltid" data-i18n="employment.part_time">Part Time</option>
                        <option value="Kontrakt" data-i18n="employment.contract">Contract</option>
                        <option value="Vikariat" data-i18n="employment.temporary">Temporary</option>
                        <option value="Lærling" data-i18n="employment.internship">Internship</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="Salary" data-i18n="form.salary">Salary Range</label>
                    <input type="text" id="Salary" name="Salary" data-i18n="[placeholder]form.salary_placeholder" placeholder="e.g., 450,000 - 550,000 per year">
                </div>
                <div class="form-group">
                    <label for="JobDescription" data-i18n="form.job_description">Job Description</label>
                    <textarea id="JobDescription" name="JobDescription" data-i18n="[placeholder]form.job_description_placeholder" placeholder="Describe the position and responsibilities..."></textarea>
                </div>
                <div class="form-group">
                    <label for="ApplicationDeadline" data-i18n="form.deadline">Application Deadline</label>
                    <input type="date" id="ApplicationDeadline" name="ApplicationDeadline">
                </div>
                <div class="form-group">
                    <label for="ContactEmail" data-i18n="form.contact_email">Contact Email</label>
                    <input type="email" id="ContactEmail" name="ContactEmail" data-i18n="[placeholder]form.email_placeholder" placeholder="applications@company.com">
                </div>
                <div class="form-group">
                    <label for="ApplicationLink" data-i18n="form.application_link">Application Link (optional)</label>
                    <input type="url" id="ApplicationLink" name="ApplicationLink" data-i18n="[placeholder]form.url_placeholder" placeholder="https://">
                </div>
            `;
        }

        function renderPropertyFields() {
            const propertySection = document.getElementById('propertyFields');
            if (!propertySection) return;

            propertySection.innerHTML = `
                <h3 data-i18n="property.details">Property Details</h3>
                <div class="form-group">
                    <label for="propertyTitle" data-i18n="form.title">Title <span class="required">*</span></label>
                    <input type="text" id="propertyTitle" name="ProductName" data-i18n="[placeholder]property.title_placeholder" placeholder="e.g., Modern Apartment Downtown, Cozy House with Garden">
                    <div class="error-message" id="propertyTitleError"></div>
                </div>
                <div class="form-group">
                    <label for="PropertyPrice" data-i18n="form.price">Price</label>
                    <input type="number" id="PropertyPrice" name="EiendomPrice" data-i18n="[placeholder]form.price_placeholder" placeholder="e.g., 3500000">
                    <div class="error-message" id="PropertyPriceError"></div>
                </div>
                <div class="form-group">
                    <label for="PropertyType" data-i18n="form.property_type">Property Type</label>
                    <select id="PropertyType" name="PropertyType">
                        <option value="" data-i18n="form.velg">Select</option>
                        <option value="House" data-i18n="property.house">House</option>
                        <option value="Apartment" data-i18n="property.apartment">Apartment</option>
                        <option value="Commercial" data-i18n="property.commercial">Commercial Property</option>
                        <option value="Land" data-i18n="property.land">Land</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="Bedrooms" data-i18n="property.bedrooms">Bedrooms</label>
                    <input type="number" id="Bedrooms" name="Bedrooms" min="0" placeholder="e.g., 3">
                </div>
                <div class="form-group">
                    <label for="Bathrooms" data-i18n="property.bathrooms">Bathrooms</label>
                    <input type="number" id="Bathrooms" name="Bathrooms" min="0" step="0.5" placeholder="e.g., 2.5">
                </div>
                <div class="form-group">
                    <label for="PropertyDescription" data-i18n="form.description">Description</label>
                    <textarea id="PropertyDescription" name="Description" data-i18n="[placeholder]property.description_placeholder" placeholder="Describe the property features, amenities, etc."></textarea>
                </div>
            `;
        }

        function renderCarFields() {
            const carSection = document.getElementById('carFields');
            if (!carSection) return;

            carSection.innerHTML = `
                <h3 data-i18n="form.car_details">Car Details</h3>
                <div class="form-group">
                    <label for="carTitle" data-i18n="form.title">Title <span class="required">*</span></label>
                    <input type="text" id="carTitle" name="ProductName" data-i18n="[placeholder]car.title_placeholder" placeholder="e.g., 2015 Toyota Camry, BMW X5">
                    <div class="error-message" id="carTitleError"></div>
                </div>
                <div class="form-group">
                    <label for="CarPrice" data-i18n="form.price">Price</label>
                    <input type="number" id="CarPrice" name="BilPrice" data-i18n="[placeholder]form.price_placeholder" placeholder="e.g., 250000">
                    <div class="error-message" id="CarPriceError"></div>
                </div>
                <div class="form-group">
                    <label for="CarBrand" data-i18n="car.brand">Brand</label>
                    <select id="CarBrand" name="brand_id">
                        <option value="" data-i18n="form.velg">Select</option>
                        <!-- Loaded dynamically -->
                    </select>
                    <div class="error-message" id="CarBrandError"></div>
                </div>
                <div class="form-group">
                    <label for="CarModel" data-i18n="car.model">Model</label>
                    <select id="CarModel" name="model_id" disabled>
                        <option value="" data-i18n="form.velg">Select Model</option>
                        <!-- Loaded dynamically -->
                    </select>
                    <div class="error-message" id="CarModelError"></div>
                </div>
                <div class="form-group">
                    <label for="CarYear" data-i18n="car.year">Year</label>
                    <input type="number" id="CarYear" name="CarYear" min="1950" max="${new Date().getFullYear() + 1}" placeholder="e.g., 2015">
                </div>
                <div class="form-group">
                    <label for="Mileage" data-i18n="car.mileage">Mileage (km)</label>
                    <input type="number" id="Mileage" name="Mileage" min="0" placeholder="e.g., 85000">
                </div>
                <div class="form-group">
                    <label for="FuelType" data-i18n="car.fuel_type">Fuel Type</label>
                    <select id="FuelType" name="FuelType">
                        <option value="Petrol" data-i18n="car.petrol">Petrol</option>
                        <option value="Diesel" data-i18n="car.diesel">Diesel</option>
                        <option value="Electric" data-i18n="car.electric">Electric</option>
                        <option value="Hybrid" data-i18n="car.hybrid">Hybrid</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="CarDescription" data-i18n="form.description">Description</label>
                    <textarea id="CarDescription" name="Description" data-i18n="[placeholder]car.description_placeholder" placeholder="Describe the car's condition, features, service history, etc."></textarea>
                </div>
            `;

            // Populate car brands if available, or wait for them to load
            if (window.carBrands) {
                populateCarBrands();
            } else {
                // If car brands aren't loaded yet, wait for them
                const waitForBrands = setInterval(() => {
                    if (window.carBrands) {
                        clearInterval(waitForBrands);
                        populateCarBrands();
                    }
                }, 100);
                
                // Stop waiting after 5 seconds
                setTimeout(() => clearInterval(waitForBrands), 5000);
            }
        }

        function renderBoatFields() {
            const boatSection = document.getElementById('boatFields');
            if (!boatSection) return;

            boatSection.innerHTML = `
                <h3 data-i18n="form.boat_details">Boat Details</h3>
                <div class="form-group">
                    <label for="boatTitle" data-i18n="form.title">Title <span class="required">*</span></label>
                    <input type="text" id="boatTitle" name="ProductName" data-i18n="[placeholder]boat.title_placeholder" placeholder="e.g., Fishing Boat, Yacht, Speedboat">
                    <div class="error-message" id="boatTitleError"></div>
                </div>
                <div class="form-group">
                    <label for="BoatPrice" data-i18n="form.price">Price</label>
                    <input type="number" id="BoatPrice" name="BåtPrice" data-i18n="[placeholder]form.price_placeholder" placeholder="e.g., 150000">
                    <div class="error-message" id="BoatPriceError"></div>
                </div>
                <div class="form-group">
                    <label for="BoatType" data-i18n="boat.type">Boat Type</label>
                    <select id="BoatType" name="BoatType">
                        <option value="Fishing" data-i18n="boat.fishing">Fishing Boat</option>
                        <option value="Sailing" data-i18n="boat.sailing">Sailing Boat</option>
                        <option value="Motor" data-i18n="boat.motor">Motor Boat</option>
                        <option value="Yacht" data-i18n="boat.yacht">Yacht</option>
                        <option value="Jet Ski" data-i18n="boat.jet_ski">Jet Ski</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="BoatLength" data-i18n="boat.length">Length (meters)</label>
                    <input type="number" id="BoatLength" name="BoatLength" min="0" step="0.1" placeholder="e.g., 8.5">
                </div>
                <div class="form-group">
                    <label for="BoatYear" data-i18n="boat.year">Year</label>
                    <input type="number" id="BoatYear" name="BoatYear" min="1950" max="${new Date().getFullYear() + 1}" placeholder="e.g., 2010">
                </div>
                <div class="form-group">
                    <label for="BoatDescription" data-i18n="form.description">Description</label>
                    <textarea id="BoatDescription" name="Description" data-i18n="[placeholder]boat.description_placeholder" placeholder="Describe the boat's condition, features, equipment, etc."></textarea>
                </div>
            `;
        }

        function renderMCFields() {
            const mcSection = document.getElementById('mcFields');
            if (!mcSection) return;

            mcSection.innerHTML = `
                <h3 data-i18n="form.mc_details">Motorcycle Details</h3>
                <div class="form-group">
                    <label for="mcTitle" data-i18n="form.title">Title <span class="required">*</span></label>
                    <input type="text" id="mcTitle" name="ProductName" data-i18n="[placeholder]mc.title_placeholder" placeholder="e.g., Harley Davidson, Kawasaki Ninja">
                    <div class="error-message" id="mcTitleError"></div>
                </div>
                <div class="form-group">
                    <label for="MCPrice" data-i18n="form.price">Price</label>
                    <input type="number" id="MCPrice" name="McPrice" data-i18n="[placeholder]form.price_placeholder" placeholder="e.g., 125000">
                    <div class="error-message" id="MCPriceError"></div>
                </div>
                <div class="form-group">
                    <label for="MCBrand" data-i18n="mc.brand">Brand</label>
                    <input type="text" id="MCBrand" name="MCBrand" placeholder="e.g., Honda, Yamaha, Harley Davidson">
                </div>
                <div class="form-group">
                    <label for="MCModel" data-i18n="mc.model">Model</label>
                    <input type="text" id="MCModel" name="MCModel" placeholder="e.g., CBR600RR, Ninja 650">
                </div>
                <div class="form-group">
                    <label for="MCYear" data-i18n="mc.year">Year</label>
                    <input type="number" id="MCYear" name="MCYear" min="1950" max="${new Date().getFullYear() + 1}" placeholder="e.g., 2018">
                </div>
                <div class="form-group">
                    <label for="MCMileage" data-i18n="mc.mileage">Mileage (km)</label>
                    <input type="number" id="MCMileage" name="MCMileage" min="0" placeholder="e.g., 25000">
                </div>
                <div class="form-group">
                    <label for="MCDescription" data-i18n="form.description">Description</label>
                    <textarea id="MCDescription" name="Description" data-i18n="[placeholder]mc.description_placeholder" placeholder="Describe the motorcycle's condition, features, modifications, etc."></textarea>
                </div>
            `;
        }

        function handleFiles(files) {
            const newFiles = Array.from(files);
            
            // Check total file count
            if (selectedFiles.length + newFiles.length > MAX_FILES) {
                showUploadError(`Maximum ${MAX_FILES} files allowed. You currently have ${selectedFiles.length} files.`);
                return;
            }

            // Validate each file
            for (const file of newFiles) {
                if (!file.type.startsWith('image/')) {
                    showUploadError(`${file.name} is not an image file.`);
                    return;
                }
                
                if (file.size > MAX_SIZE_BYTES) {
                    showUploadError(`${file.name} is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
                    return;
                }
            }

            // Add valid files
            selectedFiles.push(...newFiles);
            renderPreviews();
            updateFileInput();
            hideUploadMessages();
        }

        function renderPreviews() {
            if (selectedFiles.length === 0) {
                previewContainer.style.display = 'none';
                return;
            }

            previewContainer.style.display = 'block';
            previewContainer.innerHTML = '';

            selectedFiles.forEach((file, index) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview';
                previewDiv.innerHTML = `
                    <img src="${URL.createObjectURL(file)}" alt="Preview ${index + 1}">
                    <button type="button" class="remove-image" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                previewContainer.appendChild(previewDiv);
            });

            // Add remove listeners
            previewContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-image');
                if (removeBtn) {
                    const index = parseInt(removeBtn.dataset.index);
                    selectedFiles.splice(index, 1);
                    renderPreviews();
                    updateFileInput();
                }
            });
        }

        function updateFileInput() {
            const dataTransfer = new DataTransfer();
            selectedFiles.forEach(file => dataTransfer.items.add(file));
            fileInput.files = dataTransfer.files;
        }

        async function handleFormSubmit(e) {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Validate form
                if (!validateForm()) {
                    return;
                }

                // Disable submit button
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';

                // Create FormData
                const formData = new FormData();
                
                // Only add fields from visible sections to avoid conflicts
                const allFormElements = form.querySelectorAll('input, select, textarea');
                const category = document.getElementById('Category').value;
                
                allFormElements.forEach(element => {
                    const name = element.name;
                    const value = element.value;
                    
                    // Skip if no name or value (except for files)
                    if (!name || (!value && element.type !== 'file')) return;
                    
                    // For ProductName, only include the one from the active/visible section
                    if (name === 'ProductName') {
                        const isVisible = element.offsetParent !== null;
                        if (!isVisible) {
                            console.log(`Skipping hidden ProductName field: ${element.id}`);
                            return;
                        }
                        console.log(`Including visible ProductName field: ${element.id} = "${value}"`);
                    }
                    
                    // Add the field to formData
                    if (element.type === 'file' && element.files.length > 0) {
                        for (let file of element.files) {
                            formData.append(name, file);
                        }
                    } else {
                        formData.append(name, value);
                    }
                });
                
                // Debug: Log form data being submitted
                console.log('Form data being submitted:');
                for (const [key, value] of formData.entries()) {
                    console.log(`${key}: ${value}`);
                }
                
                // Additional debug: Check ProductName field specifically
                const productNameField = form.querySelector('[name="ProductName"]');
                console.log('ProductName field element:', productNameField);
                console.log('ProductName field ID:', productNameField ? productNameField.id : 'N/A');
                console.log('ProductName field value:', productNameField ? productNameField.value : 'Field not found');
                console.log('ProductName field visible:', productNameField ? productNameField.offsetParent !== null : 'N/A');
                console.log('ProductName field in form:', productNameField ? form.contains(productNameField) : 'N/A');
                
                // Extra debug: Check all ProductName fields in the form
                const allProductNameFields = form.querySelectorAll('[name="ProductName"]');
                console.log('All ProductName fields found:', allProductNameFields.length);
                allProductNameFields.forEach((field, index) => {
                    console.log(`Field ${index}:`, {
                        id: field.id,
                        value: field.value,
                        visible: field.offsetParent !== null,
                        type: field.type || field.tagName
                    });
                });

                // Submit form
                const response = await fetch('/api/products', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    let errorMessage = 'Submission failed';
                    try {
                        const errorData = await response.json();
                        if (errorData.errors && Array.isArray(errorData.errors)) {
                            // Format validation errors and remove duplicates
                            const uniqueErrors = [...new Set(errorData.errors.map(err => err.msg || err.message))];
                            errorMessage = uniqueErrors.join(', ');
                        } else if (errorData.error) {
                            errorMessage = errorData.error;
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (parseError) {
                        console.error('Could not parse error response:', parseError);
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                // Success
                const responseData = await response.json();
                
                // Track successful ad upload
                if (window.ishtri && window.ishtri.trackAdUpload) {
                    const category = document.getElementById('Category').value || 'unknown';
                    // Try to get the product ID from response if available
                    const productId = responseData?.productId || responseData?.ProductdID || null;
                    window.ishtri.trackAdUpload(category, productId);
                }
                
                showSuccessMessage('Ad submitted successfully!');
                
                if (window.ishtri.toast) {
                    window.ishtri.toast.show('Ad submitted successfully!', 'success');
                }

                // Clear saved data and redirect
                clearSavedFormData();
                setTimeout(() => {
                    window.location.href = '/mine-annonser';
                }, 1500);

            } catch (error) {
                console.error('Submission error:', error);
                showUploadError(`Submission failed: ${error.message}`);
                
                if (window.ishtri.toast) {
                    window.ishtri.toast.show(error.message, 'error');
                }
                
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }

        function validateForm() {
            let isValid = true;
            const category = document.getElementById('Category').value;

            // Clear previous errors
            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

            // Validate required fields
            const requiredFields = ['Country', 'City'];
            
            // Add category-specific required fields by ID
            if (category === 'Torget') {
                requiredFields.push('ProductName');
            } else if (category === 'Jobb') {
                requiredFields.push('JobTitle');
            } else if (category === 'Eiendom') {
                requiredFields.push('propertyTitle');
            } else if (category === 'Bil') {
                requiredFields.push('carTitle', 'CarBrand', 'CarModel');
            } else if (category === 'Båt') {
                requiredFields.push('boatTitle');
            } else if (category === 'MC') {
                requiredFields.push('mcTitle');
            }

            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    showFieldError(fieldId, 'This field is required');
                    isValid = false;
                }
            });

            return isValid;
        }

        function showFieldError(fieldId, message) {
            const errorElement = document.getElementById(fieldId + 'Error');
            if (errorElement) {
                errorElement.textContent = message;
            }
        }

        function showUploadError(message) {
            const errorContainer = document.getElementById('uploadError');
            const errorText = document.getElementById('errorText');
            if (errorContainer && errorText) {
                errorText.textContent = message;
                errorContainer.style.display = 'block';
            }
        }

        function showSuccessMessage(message) {
            const successContainer = document.getElementById('successMessageContainer');
            const successText = document.getElementById('successText');
            if (successContainer && successText) {
                successText.textContent = message;
                successContainer.style.display = 'block';
            }
        }

        function hideUploadMessages() {
            const errorContainer = document.getElementById('uploadError');
            const successContainer = document.getElementById('successMessageContainer');
            if (errorContainer) errorContainer.style.display = 'none';
            if (successContainer) successContainer.style.display = 'none';
        }

        async function loadCountries() {
            try {
                const response = await fetch('/api/utils/countriess');  // Use the simple endpoint
                if (!response.ok) throw new Error('Failed to load countries');
                
                const countries = await response.json();  // This is now a simple array of strings
                const countrySelect = document.getElementById('Country');
                
                if (countrySelect) {
                    countries.forEach(country => {
                        const option = document.createElement('option');
                        option.value = country;
                        option.textContent = country;
                        countrySelect.appendChild(option);
                    });
                }
                console.log('Countries loaded:', countries.length, 'countries'); // Debug log
            } catch (error) {
                console.error('Error loading countries:', error);
                throw error; // Re-throw to be caught by Promise.all
            }
        }

        async function loadCarBrands() {
            try {
                const response = await fetch('/api/utils/car-brands');
                if (!response.ok) throw new Error('Failed to load car brands');
                
                const brands = await response.json();
                console.log('Car brands loaded:', brands); // Debug log
                
                // Store globally for use when rendering car fields
                window.carBrands = brands;
                
                // If car fields are already rendered, populate them now
                if (document.getElementById('CarBrand')) {
                    populateCarBrands();
                }
            } catch (error) {
                console.error('Error loading car brands:', error);
                throw error; // Re-throw to be caught by Promise.all
            }
        }

        function populateCarBrands() {
            const carBrandSelect = document.getElementById('CarBrand');
            console.log('Populating car brands...', { carBrandSelect, carBrands: window.carBrands }); // Debug log
            
            if (carBrandSelect && window.carBrands) {
                // Clear existing options except the first one
                while (carBrandSelect.children.length > 1) {
                    carBrandSelect.removeChild(carBrandSelect.lastChild);
                }
                
                // Add car brands
                window.carBrands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand.brand_id; // Use brand ID, not name
                    option.textContent = brand.brand_name;
                    carBrandSelect.appendChild(option);
                });
                
                console.log('Car brands populated:', carBrandSelect.children.length - 1, 'brands added'); // Debug log
            } else {
                console.warn('Could not populate car brands:', { 
                    carBrandSelect: !!carBrandSelect, 
                    carBrands: !!window.carBrands 
                });
            }
        }

        function setupDynamicEventHandlers() {
            // Country selection event handler
            const countrySelect = document.getElementById('Country');
            if (countrySelect) {
                countrySelect.addEventListener('change', handleCountryChange);
            }

            // Car brand selection event handler (delegate to handle dynamically rendered elements)
            document.addEventListener('change', (e) => {
                if (e.target && e.target.id === 'CarBrand') {
                    handleCarBrandChange(e.target);
                }
            });
        }

        function handleCountryChange(event) {
            const selectedCountry = event.target.value;
            const citySelect = document.getElementById('City');
            const cityLabel = document.getElementById('cityLabel');
            
            // Reset city dropdown
            citySelect.disabled = true;
            
            if (selectedCountry) {
                // Show city dropdown
                cityLabel.style.display = 'block';
                citySelect.style.display = 'block';
                citySelect.innerHTML = '<option value="">Loading cities...</option>';
                
                // Load cities for selected country
                loadCitiesForCountry(selectedCountry);
            } else {
                // Hide city dropdown
                cityLabel.style.display = 'none';
                citySelect.style.display = 'none';
                citySelect.innerHTML = '<option value="">Select City</option>';
                citySelect.disabled = true;
            }
        }

        async function loadCitiesForCountry(country) {
            const citySelect = document.getElementById('City');
            
            try {
                const response = await fetch(`/api/utils/cities/${country}`);
                if (!response.ok) throw new Error('Failed to load cities');
                
                const cities = await response.json();
                
                // Clear and populate cities
                citySelect.innerHTML = '<option value="">Select City</option>';
                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelect.appendChild(option);
                });
                
                citySelect.disabled = false;
            } catch (error) {
                console.error('Error loading cities:', error);
                citySelect.innerHTML = '<option value="">Error loading cities</option>';
                citySelect.disabled = true;
            }
        }

        function handleCarBrandChange(brandSelect) {
            const brandId = brandSelect.value; // Now this is already the brand ID
            const modelSelect = document.getElementById('CarModel');
            
            // Reset model dropdown
            modelSelect.disabled = true;
            
            if (brandId) {
                loadModelsForBrand(brandId);
            } else {
                modelSelect.innerHTML = '<option value="">Select Model</option>';
            }
        }

        async function loadModelsForBrand(brandId) {
            const modelSelect = document.getElementById('CarModel');
            
            try {
                modelSelect.innerHTML = '<option value="">Loading models...</option>';
                
                const response = await fetch(`/api/utils/car-models/${brandId}`);
                if (!response.ok) throw new Error('Failed to load models');
                
                const models = await response.json();
                
                // Clear and populate models
                modelSelect.innerHTML = '<option value="">Select Model</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.model_id; // Use model ID, not name
                    option.textContent = model.model_name;
                    modelSelect.appendChild(option);
                });
                
                modelSelect.disabled = false;
            } catch (error) {
                console.error('Error loading models:', error);
                modelSelect.innerHTML = '<option value="">Error loading models</option>';
                modelSelect.disabled = true;
            }
        }

        function updateRequiredFields(category) {
            // Reset all required attributes
            document.querySelectorAll('[required]').forEach(field => {
                if (!['Country', 'City'].includes(field.id)) {
                    field.removeAttribute('required');
                }
            });

            // Set category-specific required fields
            const fieldMap = {
                'Torget': ['ProductName'],
                'Jobb': ['JobTitle'],
                'Eiendom': ['propertyTitle'],
                'Bil': ['carTitle', 'CarBrand', 'CarModel'],
                'Båt': ['boatTitle'],
                'MC': ['mcTitle']
            };

            const requiredFields = fieldMap[category] || [];
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.setAttribute('required', 'required');
            });
        }

        function setupFormDataSaving() {
            // Auto-save form data with debouncing
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', debounce(saveFormData, 1000));
                input.addEventListener('change', debounce(saveFormData, 500));
            });

            // Also listen for dynamically added form elements
            form.addEventListener('input', debounce(saveFormData, 1000));
            form.addEventListener('change', debounce(saveFormData, 500));
        }

        function saveFormData() {
            try {
                const formData = new FormData(form);
                const data = {};
                
                // Only save visible and accessible form fields
                for (const [key, value] of formData.entries()) {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field && field.offsetParent !== null) { // Only save visible fields
                        data[key] = value;
                    }
                }
                
                const categoryField = document.getElementById('Category');
                if (categoryField && categoryField.value) {
                    localStorage.setItem('newAdFormData', JSON.stringify(data));
                    localStorage.setItem('selectedCategory', categoryField.value);
                }
            } catch (error) {
                console.error('Error saving form data:', error);
            }
        }

        function restoreFormData() {
            try {
                const savedData = localStorage.getItem('newAdFormData');
                const savedCategory = localStorage.getItem('selectedCategory');
                
                if (savedCategory) {
                    setCategory(savedCategory);
                    
                    // Wait for category rendering to complete before restoring field data
                    setTimeout(() => {
                        restoreFieldData(savedData);
                    }, 100);
                } else if (savedData) {
                    restoreFieldData(savedData);
                }
            } catch (error) {
                console.error('Error restoring form data:', error);
            }
        }

        function restoreFieldData(savedData) {
            if (!savedData) return;
            
            try {
                const data = JSON.parse(savedData);
                console.log('Restoring form data:', data); // Debug log
                
                Object.entries(data).forEach(([key, value]) => {
                    try {
                        const field = form.querySelector(`[name="${key}"]`);
                        if (field && field.offsetParent !== null) { // Check if field is visible
                            if (field.type === 'checkbox' || field.type === 'radio') {
                                field.checked = value === 'on' || value === true;
                            } else {
                                field.value = value;
                                
                                // Trigger change event for dropdowns that need to load dependent data
                                if (field.id === 'Country' && value) {
                                    setTimeout(() => {
                                        field.dispatchEvent(new Event('change', { bubbles: true }));
                                    }, 200);
                                }
                                
                                // Trigger change event for car brand selection to load models
                                if (field.id === 'CarBrand' && value) {
                                    setTimeout(() => {
                                        field.dispatchEvent(new Event('change', { bubbles: true }));
                                    }, 300);
                                }
                            }
                        }
                    } catch (fieldError) {
                        // Skip this field if there's an error
                        console.warn(`Could not restore field ${key}:`, fieldError);
                    }
                });
            } catch (parseError) {
                console.error('Error parsing saved form data:', parseError);
                // Clear corrupted data
                localStorage.removeItem('newAdFormData');
            }
        }

        function clearSavedFormData() {
            try {
                localStorage.removeItem('newAdFormData');
                localStorage.removeItem('selectedCategory');
            } catch (error) {
                console.error('Error clearing saved data:', error);
            }
        }

        function addClearFormButton() {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (!submitBtn || !submitBtn.parentNode) return;

            let clearBtn = submitBtn.parentNode.querySelector('.clear-button');
            if (clearBtn) return; // Already exists

            clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.textContent = 'Clear Form';
            clearBtn.className = 'clear-button btn btn-secondary';
            clearBtn.addEventListener('click', clearForm);

            submitBtn.parentNode.insertBefore(clearBtn, submitBtn);
        }

        function clearForm() {
            if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
                clearSavedFormData();
                form.reset();
                selectedFiles = [];
                renderPreviews();
                updateFileInput();
                hideUploadMessages();
                document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
                formContainer.style.display = 'none';
                document.querySelector('.kategorierContainer')?.scrollIntoView({ behavior: 'smooth' });
            }
        }

        function addRealTimeValidation() {
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    if (input.hasAttribute('required') && !input.value.trim()) {
                        showFieldError(input.id, 'This field is required');
                    } else {
                        const errorElement = document.getElementById(input.id + 'Error');
                        if (errorElement) errorElement.textContent = '';
                    }
                });
            });
        }

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Expose setCategory globally for any onclick handlers that might still exist
        window.setCategory = setCategory;
    }
}