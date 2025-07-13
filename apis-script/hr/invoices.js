
import { handleManualFormSubmission, validationRules } from '../../../utils/utils.js';
import { hrService } from '../../../services/hr-service.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('add-invoice-form');
    const button = document.getElementById('add-invoice-btn');
    const statusMessage = document.getElementById('invoiceStatusMessage');

    if (!form) return;

    handleManualFormSubmission({
        form,
        button,
        statusMessage,
        onValidate: (data) => {
            validationRules.required(data.customer_id, 'Customer');
            validationRules.required(data.due_date, 'Due Date');
            validationRules.required(data.invoice_date, 'Invoice Date');
            validationRules.required(data.payment_type, 'Payment Type');
            validationRules.required(data.bank_name, 'Bank Name');
            return data;
        },
        onSubmit: async (data) => {
            // Collect all item fields as arrays
            const descriptions = Array.from(document.getElementsByName('description[]')).map(i => i.value);
            const quantities = Array.from(document.getElementsByName('quantity[]')).map(i => i.value);
            const discounts = Array.from(document.getElementsByName('discount[]')).map(i => i.value);
            const rates = Array.from(document.getElementsByName('rate[]')).map(i => i.value);

            // Build the items array
            const items = [];
            for (let i = 0; i < descriptions.length; i++) {
                if (descriptions[i]) {
                    items.push({
                        description: descriptions[i],
                        quantity: Number(quantities[i]) || 0,
                        discount: Number(discounts[i]) || 0,
                        rate: Number(rates[i]) || 0
                    });
                }
            }

            // Prepare payload for backend
            const payload = {
                customer_id: data.customer_id,
                invoice_title: data.invoice_title,
                invoice_date: data.invoice_date,
                due_date: data.due_date,
                payment_type: data.payment_type,
                bank_account_name: data.bank_account_name,
                notes: data.notes,
                items: items
            };

            return await hrService.createInvoice(JSON.stringify(payload));
        },
        loadingText: 'Saving...',
        defaultText: 'Save & Send',
        successMessage: 'Invoice created successfully!',
        resetForm: true,
        onSuccess: () => {
            window.location.href = '/hr/invoices';
        }
    });
});

// Handle status filter
document.querySelectorAll('.dropdown-item[data-status]').forEach(function (item) {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        const status = this.getAttribute('data-status');
        const url = new URL(window.location.href);
        url.searchParams.set('status', status);
        url.searchParams.set('page', 1);
        window.location.href = url.toString();
    });
});

// Created Date filter
document.getElementById('createdDateFilter').addEventListener('change', function () {
    const url = new URL(window.location.href);
    url.searchParams.set('createdDate', this.value);
    url.searchParams.set('page', 1);
    window.location.href = url.toString();
});

// Due Date filter
document.getElementById('dueDateFilter').addEventListener('change', function () {
    const url = new URL(window.location.href);
    url.searchParams.set('dueDate', this.value);
    url.searchParams.set('page', 1);
    window.location.href = url.toString();
});

