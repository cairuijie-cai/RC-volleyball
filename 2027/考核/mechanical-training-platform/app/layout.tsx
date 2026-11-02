import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '机械新人训练营 · ROBOCON 2027',
  description: '机械新人培训、合集学习任务、进度记录与考核评分管理台。',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
