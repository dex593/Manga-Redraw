import React from 'react';
import { DownloadIcon } from './icons';
import { useLanguage } from '../i18n/i18n';

interface DownloadButtonProps {
  onClick: () => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold transition-colors duration-200"
    >
      <DownloadIcon className="w-5 h-5 mr-2" />
      {t('common.downloadImage')}
    </button>
  );
};