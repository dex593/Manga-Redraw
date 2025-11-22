import React from 'react';
import { BrushIcon, QuestionMarkCircleIcon, LanguageIcon, DiscordIcon } from './icons';
import { useLanguage } from '../i18n/i18n';

interface HeaderProps {
    onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGuide }) => {
    const { language, setLanguage, t } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'vi' ? 'en' : 'vi');
    };

    return (
        <header className="w-full bg-white border-b-4 border-black sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center">
                        <BrushIcon className="w-8 h-8 mr-3 text-black" />
                        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-black transform -skew-x-6">
                            {t('header.title')}
                        </h1>
                    </div>
                    <div className="hidden md:block border-l-2 border-black h-8"></div>
                    <a
                        href="https://discord.gg/JUQFysXze2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center gap-2 text-black hover:text-indigo-600 transition-colors font-bold group"
                    >
                        <DiscordIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-sm">{t('footer.discord')}</span>
                    </a>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onOpenGuide}
                        className="flex items-center gap-2 text-black hover:underline transition-all text-sm font-bold border-2 border-transparent hover:border-black px-3 py-1 rounded"
                        title={t('header.guideTooltip')}
                    >
                        <QuestionMarkCircleIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">{t('header.guide')}</span>
                    </button>
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 text-black border-2 border-black px-3 py-1 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm font-black"
                        title={t('header.languageTooltip')}
                    >
                        <LanguageIcon className="w-6 h-6" />
                        <span className="">{language.toUpperCase()}</span>
                    </button>
                </div>
            </div>
        </header>
    );
};