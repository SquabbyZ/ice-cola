import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900">404</h1>
        <p className="mt-4 text-lg text-zinc-600">
          {t('notFound.pageNotFound', 'Page not found')}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          {t('notFound.pageNotFoundDesc', 'The page you are looking for does not exist or has been moved.')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          {t('notFound.backToHome', 'Back to Home')}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
