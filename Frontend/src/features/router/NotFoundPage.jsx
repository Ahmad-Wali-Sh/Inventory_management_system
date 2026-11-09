// Shown for any URL that is not in routes.config.jsx
import { Link } from 'react-router';
import { useTranslation } from '../shared/i18n/useTranslation';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="btn btn-primary">
        {t('notFound.back')}
      </Link>
    </div>
  );
}