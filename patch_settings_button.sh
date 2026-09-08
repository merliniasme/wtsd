#!/bin/bash
sed -i '/import { getCustomCluePrompt/i import { usePWAInstall } from "../hooks/usePWAInstall";' src/components/SettingsView.tsx
sed -i '/export const SettingsView/i \
const InstallSettingsButton = () => {\
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();\
  const [showIOSGuide, setShowIOSGuide] = useState(false);\
  if (isInstalled) return <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg">App is Installed</div>;\
  if (isInstallable) return <button onClick={install} className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0">Install App</button>;\
  if (isIOS) return <button onClick={() => setShowIOSGuide(!showIOSGuide)} className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0">{showIOSGuide ? "See above guide" : "Install on iOS"}</button>;\
  return <div className="text-xs text-slate-500">Not available on this browser</div>;\
};\
' src/components/SettingsView.tsx
