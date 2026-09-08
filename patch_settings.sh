#!/bin/bash
sed -i '/{\/\* Raw Plain Text Import Section \*\/}/i \
      {/* App Install Section */}\
      <section\
        id="section-app-install"\
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm"\
      >\
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">\
          <div className="space-y-1">\
            <div className="flex items-center gap-2 text-sky-400">\
              <FileUp className="w-4 h-4" />\
              <h3 className="text-sm font-semibold text-slate-100">App Installation</h3>\
            </div>\
            <p className="text-xs text-slate-400">\
              Install Who Is The Spy Manual on your device for quick access and offline support.\
            </p>\
          </div>\
          <InstallSettingsButton />\
        </div>\
      </section>\
' src/components/SettingsView.tsx
