import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '@/i18n';

interface I18nState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string) => string;
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set, get) => ({
            language: 'ko', // Default fallback language
            setLanguage: (lang: Language) => set({ language: lang }),
            t: (path: string) => {
                const { language } = get();
                const currentTranslation = translations[language];

                const keys = path.split('.');
                // Use any here because currentTranslation is typed exactly as the ko.json structure
                let result: any = currentTranslation;

                for (const key of keys) {
                    if (result && typeof result === 'object' && key in result) {
                        result = result[key];
                    } else {
                        // Fallback to path string if not found
                        return path;
                    }
                }

                return typeof result === 'string' ? result : path;
            },
        }),
        {
            name: 'i18n-storage', // name of the item in the storage (must be unique)
        }
    )
);
