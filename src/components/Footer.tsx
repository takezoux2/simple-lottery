export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <a
          href="https://takezoux2.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
        >
          takezoux2.com
        </a>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <a
          href="https://bambooq.takezoux2.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
        >
          香川の民泊 Bamboo Q
        </a>
      </div>
      <div>takezoux2 all rights reserved &copy; {new Date().getFullYear()}</div>
    </footer>
  );
}
