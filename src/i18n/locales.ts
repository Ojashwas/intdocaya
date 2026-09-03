import type { Locale } from '../types'

export const messages = {
  en: {
    home: 'Home',
    documents: 'Document Center',
    workflows: 'My Workflows',
    notifications: 'Notifications',
    admin: 'Admin Center',
    search: 'Search documents, workflows, policies…',
    help: 'Help Center',
    settings: 'Settings',
    language: 'العربية',
    skip: 'Skip to main content',
  },
  ar: {
    home: 'الرئيسية',
    documents: 'مركز الوثائق',
    workflows: 'سير العمل',
    notifications: 'الإشعارات',
    admin: 'مركز الإدارة',
    search: 'ابحث في الوثائق وسير العمل والسياسات…',
    help: 'مركز المساعدة',
    settings: 'الإعدادات',
    language: 'English',
    skip: 'تخطي إلى المحتوى الرئيسي',
  },
} as const

export function t(locale: Locale, key: keyof typeof messages.en) {
  return messages[locale][key]
}
