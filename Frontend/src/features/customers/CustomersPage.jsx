import MasterComponent from '../shared/components/MasterComponent/MasterComponent';
import { useTranslation } from '../shared/i18n/useTranslation';
import { customerConfig } from './customers.config';

export default function CustomersPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('customers.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t('customers.subtitle')}</p>
      </div>
      <MasterComponent config={customerConfig} />
    </div>
  );
}
