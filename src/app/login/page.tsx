'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
  const router = useRouter();

  // Generate a new captcha question
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 20) + 1; // Random number 1-20
    const num2 = Math.floor(Math.random() * 20) + 1; // Random number 1-20
    const answer = num1 + num2;
    setCaptchaQuestion({ num1, num2, answer });
    setCaptchaAnswer(''); // Clear previous answer
  };

  // Generate captcha on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate captcha first
    if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
      setError('Incorrect captcha answer. Please try again.');
      generateCaptcha(); // Generate new captcha
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        generateCaptcha(); // Generate new captcha on login failure
      } else {
        // Get session to check user role
        const session = await getSession();
        if (session?.user?.role === 'admin') {
          router.push('/dashboard');
        } else if (session?.user?.role === 'accountant') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      generateCaptcha(); // Generate new captcha on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">TOM Login</h1>
          </div>
          <p className="mt-6 text-center text-lg text-gray-900 font-semibold">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-700 focus:border-green-700 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-700 focus:border-green-700 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="captcha" className="sr-only">
                Captcha
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    id="captcha"
                    name="captcha"
                    type="number"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-700 focus:border-green-700 focus:z-10 sm:text-sm"
                    placeholder="Enter the sum"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-gray-700">
                    {captchaQuestion.num1} + {captchaQuestion.num2} = ?
                  </span>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-1 text-green-700 hover:text-green-800 focus:outline-none"
                    title="Generate new captcha"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
