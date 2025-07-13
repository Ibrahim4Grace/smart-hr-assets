import { verifyPaymentByReference } from '../../../services/pricing-service.js';

document.addEventListener('DOMContentLoaded', function () {
    async function verifyPayment() {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference');
        if (!reference) {
            Swal.fire('Error', 'No payment reference found.', 'error');
            return;
        }
        try {
            // Use the service function to verify payment
            const data = await verifyPaymentByReference(reference);
            if (data.success || data.status === 'ACTIVE' || data.payment_status === 'SUCCESSFUL') {
                Swal.fire({
                    title: 'Payment Successful!',
                    text: data.message || 'Your subscription is now active.',
                    icon: 'success',
                    confirmButtonText: 'Go to Dashboard'
                }).then(() => {
                    window.location.href = '/hr/index';
                });
            } else {
                Swal.fire({
                    title: 'Payment Failed',
                    text: data.message || 'We could not verify your payment.',
                    icon: 'error',
                    confirmButtonText: 'Back to Pricing'
                }).then(() => {
                    window.location.href = '/hr/pricing';
                });
            }
        } catch (err) {
            Swal.fire('Error', err.message || 'Could not verify payment.', 'error');
        }
    }
    verifyPayment();
});