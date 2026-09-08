#!/bin/bash
sed -i '/const \[isDeleteModalOpen/i \  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");\
  const handleSaveApiKey = () => {\
    localStorage.setItem("gemini_api_key", apiKey);\
    onToast("Gemini API Key saved.", "success");\
  };' src/components/SettingsView.tsx

sed -i '/{\/\* App Install Section \*\/}/i \
      {/* API Configuration */}\
      <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm">\
        <div className="flex items-center gap-2 text-sky-400 mb-2">\
          <SettingsIcon className="w-4 h-4" />\
          <h3 className="text-sm font-semibold text-slate-100">API Configuration</h3>\
        </div>\
        <p className="text-xs text-slate-400">\
          Enter your Gemini API key to enable AI features like clue generation.\
        </p>\
        <div className="flex items-center gap-2">\
          <input\
            type="password"\
            value={apiKey}\
            onChange={(e) => setApiKey(e.target.value)}\
            placeholder="AIzaSy..."\
            className="flex-1 px-3 py-2 bg-[#0F172A] text-slate-200 text-xs rounded-lg border border-[#334155] focus:outline-none focus:border-sky-500"\
          />\
          <button\
            onClick={handleSaveApiKey}\
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors"\
          >\
            Save Key\
          </button>\
        </div>\
      </section>\
' src/components/SettingsView.tsx
