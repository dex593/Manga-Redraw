import React from 'react';
import { useLanguage } from '../i18n/i18n';
import { DiscordIcon } from './icons';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="w-full bg-white border-t-4 border-black mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-black space-y-2 font-bold">
        <a
          href="https://discord.gg/JUQFysXze2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-black hover:text-indigo-600 transition-colors"
        >
          <DiscordIcon className="w-6 h-6" />
          <span>{t('footer.discord')}</span>
        </a>
        <p className="text-sm opacity-80">{t('footer.poweredBy')}</p>
      </div>
    </footer>
  );
};