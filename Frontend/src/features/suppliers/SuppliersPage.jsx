import PageContainer from '../layout/PageContainer';
import MasterComponent from '../shared/components/MasterComponent/MasterComponent';
import { useTranslation } from '../shared/i18n/useTranslation';
import { supplierConfig } from './suppliers.config';

export default function SuppliersPage() {
  const { t } = useTranslation();
  return (
    <PageContainer title={t('suppliers.title')}>
      <MasterComponent config={supplierConfig} />
    </PageContainer>
  );
}
