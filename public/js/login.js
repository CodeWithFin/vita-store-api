async function checkSession() {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (response.ok) {
    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('next') || '/dashboard';
  }
}

function showError(message) {
  const el = document.getElementById('login-error');
  el.textContent = message;
  el.classList.add('is-visible');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submit = document.getElementById('login-submit');
  const error = document.getElementById('login-error');
  error.classList.remove('is-visible');
  submit.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Sign in failed');
    }

    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('next') || '/dashboard';
  } catch (err) {
    showError(err.message);
    submit.disabled = false;
  }
});

checkSession();
