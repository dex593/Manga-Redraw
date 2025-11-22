import React from 'react';
import { useLanguage } from '../i18n/i18n';
import { ClearIcon } from './icons';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-indigo-400 mb-3">{title}</h3>
        <div className="text-slate-300 space-y-3">{children}</div>
    </div>
);

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800/80 backdrop-blur-sm rounded-t-xl z-10">
                    <h2 className="text-2xl font-bold text-slate-100">{t('guide.title')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
                        aria-label={t('common.close')}
                    >
                        <ClearIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="overflow-y-auto p-6">
                    <GuideSection title={t('guide.intro.title')}>
                        <p>{t('guide.intro.p1')}</p>
                    </GuideSection>

                    <GuideSection title={t('guide.video.title')}>
                        <p>{t('guide.video.p1')}</p>
                        <a 
                            href="https://www.youtube.com/watch?v=5tV1s8Qthco" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block relative group w-full aspect-video bg-black rounded-lg overflow-hidden mt-4"
                        >
                            <img 
                                src="https://img.youtube.com/vi/5tV1s8Qthco/hqdefault.jpg" 
                                alt={t('guide.video.alt')}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white/80 group-hover:text-white/95 transition-colors">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.748 1.295 2.536 0 3.284L7.279 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </a>
                    </GuideSection>

                    <GuideSection title={t('guide.upload.title')}>
                        <p>{t('guide.upload.p1')}</p>
                    </GuideSection>
                    
                    <GuideSection title={t('guide.coreConcept.title')}>
                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2">
                            <p><strong>{t('guide.coreConcept.area.title')}</strong> {t('guide.coreConcept.area.p1')}</p>
                            <p><strong>{t('guide.coreConcept.text.title')}</strong> {t('guide.coreConcept.text.p1')}</p>
                            <p><strong>{t('guide.coreConcept.mask.title')}</strong> {t('guide.coreConcept.mask.p1')}</p>
                        </div>
                    </GuideSection>

                    <GuideSection title={t('guide.basicWorkflow.title')}>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                          <li>{t('guide.basicWorkflow.step1')}</li>
                          <li>{t('guide.basicWorkflow.step2')}</li>
                          <li>{t('guide.basicWorkflow.step3')}</li>
                        </ol>
                    </GuideSection>
                    
                    <GuideSection title={t('guide.layers.title')}>
                        <p>{t('guide.layers.p1')}</p>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><strong>{t('guide.layers.visibility.title')}</strong> {t('guide.layers.visibility.p1')}</li>
                            <li><strong>{t('guide.layers.lock.title')}</strong> {t('guide.layers.lock.p1')}</li>
                            <li><strong>{t('guide.layers.delete.title')}</strong> {t('guide.layers.delete.p1')}</li>
                            <li><strong>{t('guide.layers.redraw.title')}</strong> {t('guide.layers.redraw.p1')}</li>
                        </ul>
                    </GuideSection>
                    
                     <GuideSection title={t('guide.refinement.title')}>
                        <p>{t('guide.refinement.p1')}</p>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                           <li>{t('guide.refinement.step1')}</li>
                           <li>{t('guide.refinement.step2')}</li>
                           <li>{t('guide.refinement.step3')}</li>
                        </ol>
                    </GuideSection>
                    
                    <GuideSection title={t('guide.batchProcessing.title')}>
                        <p>{t('guide.batchProcessing.p1')}</p>
                    </GuideSection>

                    <GuideSection title={t('guide.finalize.title')}>
                         <p><strong>{t('guide.finalize.download.title')}</strong> {t('guide.finalize.download.p1')}</p>
                         <p><strong>{t('guide.finalize.edit.title')}</strong> {t('guide.finalize.edit.p1')}</p>
                    </GuideSection>
                </div>
            </div>
        </div>
    );
};