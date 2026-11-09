// Login page (no layout). Uses react-hook-form and the auth store.
// The login is fake for now: see shared/stores/authStore.js.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import Icon from '../shared/components/Icon';
import { useTranslation } from '../shared/i18n/useTranslation';
import { useAuthStore } from '../shared/stores/authStore';
import { useThemeStore } from '../shared/stores/themeStore';
import { toast } from '../shared/stores/toastStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { username: '', password: '' } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      // Go back to the page the user wanted (saved by ProtectedRoute), or home.
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <button className="btn btn-secondary fixed top-4 end-4 px-2" onClick={toggleTheme}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-sm p-8 shadow-sm" noValidate>
        <span className="mb-4 flex size-10 items-center justify-center rounded-md bg-primary text-primary-fg">
          <Icon name="box" />
        </span>
        <h1 className="text-xl font-semibold">{t('auth.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t('auth.subtitle')}</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              {t('auth.username')}
            </label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              {...register('username', { required: t('common.required') })}
            />
            {errors.username && <p className="mt-1 text-xs text-danger">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              {...register('password', { required: t('common.required') })}
            />
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={submitting}>
          {submitting ? t('common.loading') : t('auth.submit')}
        </button>
        <p className="mt-4 text-center text-xs text-fg-muted">{t('auth.fakeNote')}</p>
      </form>
    </div>
  );
}