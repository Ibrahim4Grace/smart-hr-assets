import { getPlans } from '../../../services/pricing-service.js';
import { subscriptionService } from '../../../services/subscription-service.js';

let currentPlans = [];
let isYearly = false;

function formatCurrency(price, currency) {
    if (currency === 'NGN') return `₦${Number(price).toLocaleString()}`;
    if (currency === 'USD') return `$${Number(price).toLocaleString()}`;
    return `${currency} ${Number(price).toLocaleString()}`;
}

function updateCurrencyButtonState(selectedCurrency) {
    // Reset both buttons to outline style
    const usdLabel = document.querySelector('label[for="hr-usd"]');
    const ngnLabel = document.querySelector('label[for="hr-ngn"]');

    if (usdLabel) {
        usdLabel.classList.remove('btn-primary');
        usdLabel.classList.add('btn-outline-primary');
    }
    if (ngnLabel) {
        ngnLabel.classList.remove('btn-primary');
        ngnLabel.classList.add('btn-outline-primary');
    }

    // Set the selected button to filled style
    if (selectedCurrency === 'USD' && usdLabel) {
        usdLabel.classList.remove('btn-outline-primary');
        usdLabel.classList.add('btn-primary');
    } else if (selectedCurrency === 'NGN' && ngnLabel) {
        ngnLabel.classList.remove('btn-outline-primary');
        ngnLabel.classList.add('btn-primary');
    }
}

function renderHRPlans(plans) {
    const container = document.getElementById('hr-pricing-plans');
    if (!container) return;

    container.innerHTML = '';

    plans.forEach(plan => {
        const features = plan.features ? plan.features.split(',').map(f => f.trim()) : [];

        // Calculate price based on monthly/yearly toggle
        let displayPrice = plan.price;
        let displayDuration = plan.duration;

        if (isYearly && plan.price > 0) {
            displayPrice = plan.price * 12;
            displayDuration = 'yearly';
        }

        // Create feature HTML
        let featuresHTML = '';
        if (plan.max_employees) {
            featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>${plan.max_employees} Employees</span>`;
        }
        if (plan.max_projects) {
            featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>${plan.max_projects} Projects</span>`;
        }
        if (plan.max_clients) {
            featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>${plan.max_clients} Clients</span>`;
        }
        if (plan.storage_limit) {
            featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>${plan.storage_limit}</span>`;
        }

        // Add custom features from the features field
        features.forEach(feature => {
            if (feature.toLowerCase().includes('voice') || feature.toLowerCase().includes('video')) {
                featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>Voice & Video Chat</span>`;
            } else if (feature.toLowerCase().includes('crm')) {
                featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>CRM</span>`;
            } else if (feature && feature.trim()) {
                featuresHTML += `<span class="text-dark d-flex align-items-center mb-3"><i class="ti ti-discount-check-filled text-success me-2"></i>${feature}</span>`;
            }
        });

        const planCard = document.createElement('div');
        planCard.className = 'col-lg-4 col-md-6 col-sm-12';
        planCard.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="card">
                        <div class="card-body">
                            <h4>${plan.plan_name}</h4>
                            <h1>${formatCurrency(displayPrice, plan.currency)}<span class="fs-14 fw-normal text-gray">/${displayDuration}</span></h1>
                        </div>
                    </div>
                    <div class="pricing-content rounded bg-light mb-3">
                        <div class="price-hdr">
                            <h6 class="fs-14 fw-medium text-gray w-100">Features Includes</h6>
                        </div>
                        <div>
                            ${featuresHTML}
                        </div>
                    </div>
                    <button type="button" class="btn btn-dark w-100" onclick="subscribeToPlan('${plan.id}', event)">Choose Plan</button>
                </div>
            </div>
        `;

        container.appendChild(planCard);
    });
}

async function loadHRPlans(region = 'INTERNATIONAL') {
    try {
        // Show loading state
        const container = document.getElementById('hr-pricing-plans');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading pricing plans...</p>
                </div>
            `;
        }

        const result = await getPlans(region);

        let plans = result.data;

        // Store the plans and render them
        currentPlans = plans;
        renderHRPlans(plans);

        // Update button state based on region
        const selectedCurrency = region === 'AFRICA' ? 'NGN' : 'USD';
        updateCurrencyButtonState(selectedCurrency);

    } catch (err) {
        console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            url: err.url
        });

        const container = document.getElementById('hr-pricing-plans');
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="ti ti-alert-circle me-2"></i>
                        Failed to load pricing plans: ${err.message}
                    </div>
                </div>
            `;
        }
    }
}

// Global function to handle plan subscription
window.subscribeToPlan = async function (planId, event) {
    try {
        // Show loading state on the button
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;

        const planData = { plan_id: planId };

        // Call the subscription service
        const result = await subscriptionService.subscribeToPlan(planData);

        if (result.isTrial) {
            Swal.fire({
                title: 'Free Trial Activated!',
                text: result.message,
                icon: 'success',
                confirmButtonText: 'Go to Dashboard'
            }).then(() => {
                window.location.href = '/hr/index';
            });
        } else if (result.paymentUrl) {
            Swal.fire({
                title: 'Complete Payment',
                text: result.message,
                icon: 'info',
                confirmButtonText: 'Proceed to Payment'
            }).then(() => {
                window.location.href = result.paymentUrl;
            });
        } else {
            Swal.fire({
                title: 'Already Subscribed',
                text: result.message,
                icon: 'info',
                confirmButtonText: 'OK'
            }).then(() => {
                window.location.href = '/hr/index';
            });
        }

    } catch (error) {
        console.error('Subscription error:', error);
        Swal.fire({
            title: 'Error!',
            text: error.message || 'Failed to subscribe to plan. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
        });

        // Reset button
        const button = event.target;
        button.textContent = originalText;
        button.disabled = false;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Load plans with default region (USD/INTERNATIONAL)
    loadHRPlans('INTERNATIONAL');

    // Handle currency toggle
    document.getElementById('hr-usd').addEventListener('change', function () {
        if (this.checked) {
            loadHRPlans('INTERNATIONAL');
        }
    });

    document.getElementById('hr-ngn').addEventListener('change', function () {
        if (this.checked) {
            loadHRPlans('AFRICA');
        }
    });

    // Handle monthly/yearly toggle
    const toggleSwitch = document.getElementById('flexSwitchCheckDefault');
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', function () {
            isYearly = this.checked;
            // Re-render plans with updated pricing
            if (currentPlans.length > 0) {
                renderHRPlans(currentPlans);
            }
        });
    }
}); 