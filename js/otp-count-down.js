document.addEventListener('DOMContentLoaded', () => {

});

// Initialize timer immediately
(function () {
  const duration = 900;
  const timerDisplay = document.querySelector('.badge.bg-danger-transparent p');
  const submitButton = document.getElementById('verifyOtpButton') || document.getElementById('resetOtpButton');

  if (!timerDisplay || !submitButton) return;

  let timer = duration;

  // Update timer immediately
  function updateTimer() {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.innerHTML = `<i class="ti ti-clock me-1"></i> ${formattedTime}`;
  }

  // Initial update
  updateTimer();

  // Set up interval for updates
  const countdown = setInterval(() => {
    timer--;
    updateTimer();

    // Change color to warning when 1 minute or less remains
    if (timer <= 60 && timerDisplay.parentElement.classList.contains('bg-danger-transparent')) {
      timerDisplay.parentElement.classList.remove('bg-danger-transparent');
      timerDisplay.parentElement.classList.add('bg-warning-transparent');
    }

    // When timer reaches 0
    if (timer < 0) {
      clearInterval(countdown);
      timerDisplay.innerHTML = `<i class="ti ti-clock me-1"></i> OTP expired`;
      timerDisplay.parentElement.classList.remove('bg-warning-transparent');
      timerDisplay.parentElement.classList.add('bg-danger');

      // Disable the form inputs and submit button
      const inputs = document.querySelectorAll('.otp-input input');
      inputs.forEach(input => input.disabled = true);
      submitButton.disabled = true;

      // Add a resend button
      const resendContainer = document.createElement('div');
      resendContainer.className = 'mt-2 text-center';

      const resendText = document.createElement('p');
      resendText.className = 'mb-2';
      resendText.textContent = "Didn't receive the code?";

      const resendButton = document.createElement('button');
      resendButton.type = 'button';
      resendButton.className = 'btn btn-outline-primary btn-sm';
      resendButton.textContent = 'Resend OTP';
      resendButton.addEventListener('click', () => {
        window.location.reload();
      });

      resendContainer.appendChild(resendText);
      resendContainer.appendChild(resendButton);
      timerDisplay.parentElement.parentElement.appendChild(resendContainer);
    }
  }, 1000);
})();