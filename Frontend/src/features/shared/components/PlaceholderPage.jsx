// Placeholder for pages that are not built yet (sales, purchases, ...).
// Students: replace it in router/routes.config.jsx with your real page.
import PageContainer from '../../layout/PageContainer';
import { useTranslation } from '../i18n/useTranslation';

export default function PlaceholderPage({ titleKey }) {
  const { t } = useTranslation();

  return (
    <PageContainer title={t(titleKey)}>
      <div className="card flex flex-col items-center gap-2 p-12 text-center">
        <h2 className="text-lg font-semibold">{t('placeholder.title')}</h2>
        <p className="max-w-md text-sm text-fg-muted">{t('placeholder.text')}</p>
      </div>
    </PageContainer>
  );
}