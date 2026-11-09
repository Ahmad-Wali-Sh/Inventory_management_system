// Products page: the whole CRUD screen is MasterComponent + a config.
import PageContainer from '../layout/PageContainer';
import MasterComponent from '../shared/components/MasterComponent/MasterComponent';
import { useTranslation } from '../shared/i18n/useTranslation';
import { productConfig } from './products.config';

export default function ProductsPage() {
  const { t } = useTranslation();

  return (
    <PageContainer title={t('products.title')}>
      <MasterComponent config={productConfig} />
    </PageContainer>
  );
}