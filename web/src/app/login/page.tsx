import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  );
}
