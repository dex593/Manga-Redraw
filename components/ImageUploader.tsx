import React, { useCallback, useState } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './icons';
import { useLanguage } from '../i18n/i18n';

interface ImageUploaderProps {
  onImageUpload: (imageFile: ImageFile) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload({ file, base64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, []);

  return (
    <div className="w-full max-w-3xl text-center mx-auto">
      <div 
        className={`relative border-4 border-dashed rounded-xl p-10 md:p-16 transition-all duration-300 ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-black bg-white manga-shadow-lg'}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/png, image/jpeg, image/webp"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center space-y-6 pointer-events-none">
          <UploadIcon className="w-20 h-20 text-black"/>
          <p className="text-2xl font-black uppercase text-black tracking-tight">
            {t('uploader.title')}
          </p>
          <p className="text-black font-bold text-lg">{t('uploader.or')}</p>
          <label
            htmlFor="file-upload"
            className="px-8 py-3 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-wider border-2 border-transparent cursor-pointer transition-all hover:scale-105 pointer-events-auto shadow-[4px_4px_0px_0px_rgba(100,100,100,1)]"
          >
            {t('uploader.browse')}
          </label>
           <p className="text-sm text-gray-600 font-bold pt-2 border-t-2 border-gray-100 w-1/2">{t('uploader.supports')}</p>
        </div>
      </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 bg-white border-4 border-black manga-shadow">
                <h3 className="font-black text-xl uppercase text-black mb-4 border-b-4 border-black pb-2 inline-block">{t('uploader.videoGuide.title')}</h3>
                <a 
                    href="https://www.youtube.com/watch?v=5tV1s8Qthco" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block relative group w-full aspect-video bg-black border-2 border-black overflow-hidden"
                >
                    <img 
                        src="https://img.youtube.com/vi/5tV1s8Qthco/hqdefault.jpg" 
                        alt={t('uploader.videoGuide.alt')} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white drop-shadow-lg group-hover:scale-110 transition-transform">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.748 1.295 2.536 0 3.284L7.279 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                        </svg>
                    </div>
                </a>
                <p className="text-sm text-black font-bold mt-3">{t('uploader.videoGuide.description')}</p>
            </div>

            <div className="p-6 bg-white border-4 border-black manga-shadow">
                <h3 className="font-black text-xl uppercase text-black mb-4 border-b-4 border-black pb-2 inline-block">{t('uploader.howItWorks.title')}</h3>
                <ul className="list-decimal list-inside text-black font-bold space-y-2 text-left text-sm">
                    <li>{t('uploader.howItWorks.step1')}</li>
                    <li>{t('uploader.howItWorks.step2')}</li>
                    <li>{t('uploader.howItWorks.step3')}</li>
                    <li>{t('uploader.howItWorks.step4')}</li>
                    <li>{t('uploader.howItWorks.step5')}</li>
                </ul>
            </div>
        </div>
    </div>
  );
};