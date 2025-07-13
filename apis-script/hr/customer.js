import { handleManualFormSubmission, validationRules } from '../../../utils/utils.js';
import { hrService } from '../../../services/hr-service.js';


document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('add-customer-form');
    const button = document.getElementById('add-customer-btn');
    const statusMessage = document.getElementById('addCustomerStatusMessage');

    if (!form) return;

    handleManualFormSubmission({
        form,
        button,
        statusMessage,
        onValidate: (data) => {
            validationRules.required(data.name, 'Full Name');
            validationRules.required(data.email, 'Email');
            validationRules.email(data.email);
            validationRules.required(data.phone, 'Phone');
            validationRules.required(data.company, 'Company');
            validationRules.required(data.address, 'Address');
            return data;
        },
        onSubmit: async (data) => {
            const payload = {
                full_name: data.name,
                email: data.email,
                phone: data.phone,
                company: data.company,
                address: data.address
            };
            return await hrService.createCustomer(JSON.stringify(payload));
        },
        loadingText: 'Saving...',
        defaultText: 'Save',
        successMessage: 'Customer created successfully!',
        resetForm: true,
        onSuccess: () => {
            const modalEl = form.closest('.modal');
            if (modalEl && window.bootstrap) {
                const modal = window.bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
        }
    });

    // Auto-fill email when customer is selected
    const customerSelect = document.getElementById('customerSelect');
    const emailInput = document.getElementById('customerEmail');

    if (customerSelect && emailInput) {
        customerSelect.addEventListener('change', function () {
            const selectedOption = customerSelect.options[customerSelect.selectedIndex];
            const email = selectedOption.getAttribute('data-email') || '';
            emailInput.value = email;
        });
    }
});

