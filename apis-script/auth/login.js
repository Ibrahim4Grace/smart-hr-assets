import { login } from '../../../services/auth/auth-service.js';
import { handleFormSubmission, validationRules } from '../../../utils/utils.js';
import { subscriptionService } from '../../../services/subscription-service.js';

// Precompile redirect mappings for better performance
const REDIRECT_ACTIONS = {
    ACCESS_DASHBOARD: (data) => data.canAccessDashboard ? '/hr/index' : '/hr/pricing',
    CHOOSE_PLAN: () => '/hr/pricing',
    PAYMENT: (data) => data.paymentUrl || '/hr/pricing',
    UPGRADE_TRIAL: () => '/hr/pricing',
    RENEW_SUBSCRIPTION: () => '/hr/pricing',
    RETRY_PAYMENT: () => '/hr/pricing',
    CONTACT_SUPPORT: () => {
        alert('Please contact support for assistance.');
        return '/hr/contact';
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    const button = document.getElementById('submitButton');
    const statusMessage = document.getElementById('statusMessage');

    function validateLogin(data) {
        if (!data.email || !data.password) {
            throw new Error('Email and password are required');
        }

        validationRules.email(data.email);
        validationRules.minLength(data.password, 'Password', 6);
    }

    // redirect handler
    function getRedirectUrl(subscriptionData) {
        if (!subscriptionData?.action) {
            return '/hr/index'; // Default fallback
        }

        const handler = REDIRECT_ACTIONS[subscriptionData.action];
        return handler ? handler(subscriptionData) : '/hr/pricing';
    }

    // Progressive redirect 
    function performRedirect(url, message = '') {
        if (message) {
            // Show brief message before redirect
            if (statusMessage) {
                statusMessage.textContent = message;
                statusMessage.className = 'status-message success';
            }
        }

        // Small delay for better UX, 
        setTimeout(() => {
            window.location.href = url;
        }, message ? 800 : 0);
    }

    // login process
    async function performLogin(formData) {
        try {
            // Start login immediately
            const loginPromise = login({
                email: formData.email,
                password: formData.password
            });

            // Wait for login to complete
            const loginResult = await loginPromise;

            // Update status to show subscription check
            if (statusMessage) {
                statusMessage.textContent = 'Checking subscription status...';
                statusMessage.className = 'status-message info';
            }

            // Now check subscription 
            const subscriptionResponse = await subscriptionService.checkLoginStatus();

            return {
                login: loginResult,
                subscription: subscriptionResponse
            };

        } catch (error) {
            //  error handling
            console.error('Login process failed:', error);

            if (error.message?.includes('subscription')) {
                // Subscription check failed, but login succeeded
                // Allow user to proceed with warning
                console.warn('Subscription check failed, proceeding to default dashboard');
                return {
                    login: { success: true },
                    subscription: null
                };
            }

            throw error;
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: validateLogin,
                onSubmit: performLogin,
                loadingText: 'Signing In...',
                defaultText: 'Sign In',
                successMessage: 'Login successful!',
                redirectUrl: null, // We handle redirect manually
                redirectDelay: 0,
                onSuccess: (response) => {
                    try {
                        // Determine redirect URL
                        const redirectUrl = response.subscription
                            ? getRedirectUrl(response.subscription)
                            : '/hr/index';

                        // Provide user feedback based on action
                        let message = '';
                        if (response.subscription?.action === 'CHOOSE_PLAN') {
                            message = 'Redirecting to select your plan...';
                        } else if (response.subscription?.action === 'PAYMENT') {
                            message = 'Redirecting to complete payment...';
                        } else if (response.subscription?.action === 'ACCESS_DASHBOARD') {
                            message = 'Welcome back! Loading dashboard...';
                        }

                        performRedirect(redirectUrl, message);

                    } catch (redirectError) {
                        console.error('Redirect handling failed:', redirectError);
                        // Fallback to safe redirect
                        performRedirect('/hr/index', 'Redirecting to dashboard...');
                    }
                },
                onError: (error) => {
                    // Custom error handling for login-specific issues
                    console.error('Login error:', error);
                    let errorMessage = 'Login failed. Please try again.';

                    if (error.message?.includes('Invalid credentials')) {
                        errorMessage = 'Invalid email or password.';
                    } else if (error.message?.includes('Account locked')) {
                        errorMessage = 'Account temporarily locked. Please try again later.';
                    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                        errorMessage = 'Connection error. Please check your internet and try again.';
                    }

                    if (statusMessage) {
                        statusMessage.textContent = errorMessage;
                        statusMessage.className = 'status-message error';
                    }
                }
            });
        });
    }
});

//  Preload critical resources
document.addEventListener('DOMContentLoaded', function () {
    // Preload the dashboard page 
    const dashboardLink = document.createElement('link');
    dashboardLink.rel = 'prefetch';
    dashboardLink.href = '/hr/index';
    document.head.appendChild(dashboardLink);

    // Preload pricing page as it's commonly accessed
    const pricingLink = document.createElement('link');
    pricingLink.rel = 'prefetch';
    pricingLink.href = '/hr/pricing';
    document.head.appendChild(pricingLink);
});


// import { login } from '../../../services/auth-service.js';
// import { handleFormSubmission, validationRules } from '../../../utils/utils.js';
// import { subscriptionService } from '../../../services/subscription-service.js';

// document.addEventListener('DOMContentLoaded', function () {
//     const form = document.getElementById('loginForm');
//     const button = document.getElementById('submitButton');
//     const statusMessage = document.getElementById('statusMessage');

//     // Login-specific validation
//     function validateLogin(data) {
//         validationRules.email(data.email);
//         validationRules.minLength(data.password, 'Password', 6);
//     }

//     // Handle subscription-based redirect
//     function handleSubscriptionRedirect(subscriptionData) {
//         const { status, action, canAccessDashboard, paymentUrl } = subscriptionData;

//         switch (action) {
//             case 'ACCESS_DASHBOARD':
//                 if (canAccessDashboard) {
//                     window.location.href = '/hr/index';
//                 } else {
//                     window.location.href = '/hr/pricing';
//                 }
//                 break;

//             case 'CHOOSE_PLAN':
//                 window.location.href = '/hr/pricing';
//                 break;

//             case 'PAYMENT':
//                 if (paymentUrl) {
//                     window.location.href = paymentUrl;
//                 } else {
//                     window.location.href = '/hr/pricing';
//                 }
//                 break;

//             case 'UPGRADE_TRIAL':
//             case 'RENEW_SUBSCRIPTION':
//             case 'RETRY_PAYMENT':
//                 window.location.href = '/hr/pricing';
//                 break;

//             case 'CONTACT_SUPPORT':
//                 alert('Please contact support for assistance.');
//                 window.location.href = '/hr/contact';
//                 break;

//             default:
//                 // Default fallback
//                 window.location.href = '/hr/pricing';
//                 break;
//         }
//     }

//     if (form) {
//         form.addEventListener('submit', async (e) => {
//             e.preventDefault();

//             await handleFormSubmission({
//                 form,
//                 button,
//                 statusMessage,
//                 onValidate: validateLogin,
//                 onSubmit: async (formData) => {
//                     // First, login to get token
//                     const loginResult = await login({
//                         email: formData.email,
//                         password: formData.password
//                     });

//                     // Then check subscription status
//                     const subscriptionResponse = await subscriptionService.checkLoginStatus();

//                     return {
//                         login: loginResult,
//                         subscription: subscriptionResponse
//                     };
//                 },
//                 loadingText: 'Signing In...',
//                 defaultText: 'Sign In',
//                 successMessage: 'Login successful! Checking subscription...',
//                 redirectUrl: null, // We'll handle redirect manually
//                 redirectDelay: 0,
//                 onSuccess: (response) => {
//                     // Handle subscription-based redirect
//                     if (response.subscription) {
//                         handleSubscriptionRedirect(response.subscription);
//                     } else {
//                         // Fallback to default redirect
//                         window.location.href = '/hr/index';
//                     }
//                 }
//             });
//         });
//     }
// });
