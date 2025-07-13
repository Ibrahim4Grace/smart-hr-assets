document.addEventListener('DOMContentLoaded', async () => {

    const countrySelect = document.getElementById('countrySelect');
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');

    // Get user's previous values from form data attributes
    const profileForm = document.getElementById('profileForm');
    const userCountry = profileForm ? profileForm.dataset.userCountry || '' : '';
    const userState = profileForm ? profileForm.dataset.userState || '' : '';
    const userCity = profileForm ? profileForm.dataset.userCity || '' : '';

    // Caches
    const stateCache = {};
    const cityCache = {};

    // 1. Populate countries
    try {
        const countriesRes = await fetch('https://countriesnow.space/api/v0.1/countries/');
        const countriesData = await countriesRes.json();

        countriesData.data.forEach(country => {
            const option = document.createElement('option');
            option.value = country.country;
            option.textContent = country.country;
            if (country.country === userCountry) option.selected = true;
            countrySelect.appendChild(option);
        });

        // Refresh Select2 after adding countries
        $(countrySelect).select2('destroy');
        $(countrySelect).select2();
    } catch (error) {
        console.error('Error fetching countries:', error);
    }

    // 2. populate states (with cache)
    $(countrySelect).on('change', async function () {

        stateSelect.innerHTML = '<option value="">Select</option>';
        $(stateSelect).select2('destroy');
        $(stateSelect).select2();

        citySelect.innerHTML = '<option value="">Select</option>';
        $(citySelect).select2('destroy');
        $(citySelect).select2();

        if (!this.value) return;

        // Use cache if available
        if (stateCache[this.value]) {
            populateStates(stateCache[this.value]);
            return;
        }

        try {
            const statesRes = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: this.value })
            });
            const statesData = await statesRes.json();


            if (statesData.data && Array.isArray(statesData.data.states)) {
                stateCache[this.value] = statesData.data.states;
                populateStates(statesData.data.states);
            } else {
                console.error('No states found for this country');
            }
        } catch (err) {
            console.error('Error fetching states:', err);
        }
    });

    function populateStates(states) {
        stateSelect.innerHTML = '<option value="">Select</option>';
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.name;
            option.textContent = state.name;
            if (state.name === userState) option.selected = true;
            stateSelect.appendChild(option);
        });
        $(stateSelect).select2('destroy').select2();

        // If user has a saved state, trigger state change to load cities
        if (userState) {
            $(stateSelect).trigger('change');
        }
    }

    // 3.populate cities (with cache)
    $(stateSelect).on('change', async function () {

        citySelect.innerHTML = '<option value="">Select</option>';
        $(citySelect).select2('destroy');
        $(citySelect).select2();

        if (!this.value || !$(countrySelect).val()) return;

        const cacheKey = $(countrySelect).val() + '|' + this.value;
        if (cityCache[cacheKey]) {
            populateCities(cityCache[cacheKey]);
            return;
        }

        try {
            const citiesRes = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: $(countrySelect).val(),
                    state: this.value
                })
            });
            const citiesData = await citiesRes.json();

            if (citiesData.data && Array.isArray(citiesData.data)) {
                cityCache[cacheKey] = citiesData.data;
                populateCities(citiesData.data);

            }
        } catch (err) {
            console.error('Error fetching cities:', err);
        }
    });

    function populateCities(cities) {
        citySelect.innerHTML = '<option value="">Select</option>';
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            if (city === userCity) option.selected = true;
            citySelect.appendChild(option);
        });
        $(citySelect).select2('destroy').select2();
    }

    // If user has a saved country, trigger country change to load states
    if (userCountry) {
        $(countrySelect).trigger('change');
    }
});
