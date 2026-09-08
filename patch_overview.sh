#!/bin/bash
sed -i '/{\/\* App Install Section \*\/}/i \
      {/* Database Overview */}\
      <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm">\
        <div className="flex items-center gap-2 text-emerald-400 mb-2">\
          <h3 className="text-sm font-semibold text-slate-100">Database Overview</h3>\
        </div>\
        <div className="grid grid-cols-2 gap-4">\
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">\
            <span className="text-2xl font-bold text-sky-400">{words.length}</span>\
            <span className="text-xs text-slate-400">Total Words</span>\
          </div>\
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">\
            <span className="text-2xl font-bold text-emerald-400">{words.reduce((acc, w) => acc + Object.keys(w.relations || {}).length, 0) / 2}</span>\
            <span className="text-xs text-slate-400">Total Pairs</span>\
          </div>\
        </div>\
      </section>\
' src/components/SettingsView.tsx
