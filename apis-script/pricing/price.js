
import { getPlans } from '../../../services/pricing-service.js';

function formatCurrency(price, currency) {
    if (currency === 'NGN') return `₦${Number(price).toLocaleString()}`;
    if (currency === 'USD') return `$${Number(price).toLocaleString()}`;
    return `${currency} ${Number(price).toLocaleString()}`;
}

function renderPlans(plans) {
    const container = document.getElementById('pricing-plans');
    container.innerHTML = '';
    plans.forEach(plan => {
        const features = plan.features.split(',').map(f => `<li>${f.trim()}</li>`).join('');
        const isEnterprise = plan.plan_name.toLowerCase().includes('enterprise');
        const isFree = Number(plan.price) === 0;
        const btnClass = isEnterprise ? 'btn btn-lg' : isFree ? 'btn btn-lg btn-outline-custom' : 'btn btn-lg btn-custom';
        const btnText = isEnterprise ? 'Contact us' : isFree ? 'Sign up for free' : 'Get started';

        const card = document.createElement('div');
        card.className = 'col';
        card.innerHTML = `
            <div class="card mb-4 rounded-3 ${isEnterprise ? 'card-enterprise' : ''}">
                <div class="card-header py-3">
                    <h4 class="my-0 fw-normal">${plan.plan_name}</h4>
                </div>
                <div class="card-body">
                    <h1 class="card-title pricing-card-title">
                        ${formatCurrency(plan.price, plan.currency)}<small class="fw-light">/${plan.duration}</small>
                    </h1>
                    <ul class="list-unstyled mt-3 mb-4">
                        ${features}
                    </ul>
                    <button type="button" class="w-100 ${btnClass}" data-plan="${plan.id}">
                        ${btnText}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('button[data-plan]').forEach(btn => {
        btn.addEventListener('click', function () {
            const planId = btn.getAttribute('data-plan');
            window.location.href = `/auth/register?plan=${planId}`;
        });
    });
}

async function loadPlans(region) {
    try {
        const result = await getPlans(region);
        let plans = result.data;

        renderPlans(plans);
    } catch (err) {
        document.getElementById('pricing-plans').innerHTML = `<div class="col"><div class="alert alert-danger">${err.message}</div></div>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Default: USD/INTERNATIONAL
    loadPlans('INTERNATIONAL');

    document.getElementById('usd').addEventListener('change', function () {
        if (this.checked) loadPlans('INTERNATIONAL');
    });
    document.getElementById('ngn').addEventListener('change', function () {
        if (this.checked) loadPlans('AFRICA');
    });
});


