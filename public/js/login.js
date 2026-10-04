document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitButton = document.getElementById('login-submit');
  const errorMessage = document.getElementById('login-error');
  const togglePassword = document.getElementById('toggle-password');

  document.documentElement.setAttribute(
    'data-theme',
    localStorage.getItem('campus_pulse_theme') || 'light'
  );

  if (API.hasAuthenticatedSession()) {
    try {
      await API.getMe();
      window.location.replace('/app');
      return;
    } catch (err) {
      API.clearAuth();
    }
  }

  document.querySelectorAll('.demo-account').forEach((accountButton) => {
    accountButton.addEventListener('click', () => {
      emailInput.value = accountButton.dataset.email;
      passwordInput.value = accountButton.dataset.password;
      passwordInput.focus();
      errorMessage.hidden = true;
    });
  });

  togglePassword.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    togglePassword.setAttribute('aria-pressed', String(!showing));
    togglePassword.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    togglePassword.innerHTML = `<i class="bi ${showing ? 'bi-eye' : 'bi-eye-slash'}"></i>`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    submitButton.disabled = true;
    submitButton.querySelector('span').textContent = 'Signing in...';

    try {
      await API.login(emailInput.value.trim(), passwordInput.value);
      window.location.replace('/app');
    } catch (err) {
      errorMessage.textContent = err.message;
      errorMessage.hidden = false;
      submitButton.disabled = false;
      submitButton.querySelector('span').textContent = 'Sign in';
    }
  });
});
