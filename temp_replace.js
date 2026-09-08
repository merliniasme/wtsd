const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const oldSection = `<div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-sky-400">{words.length}</span>
            <span className="text-xs text-slate-400">Total Words</span>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-emerald-400">{words.reduce((acc, w) => acc + Object.keys(w.relations || {}).length, 0) / 2}</span>
            <span className="text-xs text-slate-400">Total Pairs</span>
          </div>
        </div>`;

const newSection = `<div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-sky-400">{words.length}</span>
            <span className="text-xs text-slate-400">Total Words</span>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-emerald-400">{words.reduce((acc, w) => acc + Object.keys(w.relations || {}).length, 0) / 2}</span>
            <span className="text-xs text-slate-400">Total Pairs</span>
          </div>
        </div>
        
        {/* Pairs By Tag */}
        <div className="pt-2">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pairs by Category</h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RELATION_TAGS.map(tag => {
              const meta = TAG_METADATA[tag];
              const count = words.reduce((acc, w) => acc + (w.relations?.filter(r => r.tag === tag).length || 0), 0) / 2;
              return (
                <div key={tag} className="bg-[#0F172A] border border-[#334155] rounded-lg p-2 flex flex-col items-center justify-center text-center gap-1">
                  <span className={\`text-lg font-bold \${meta.badgeText}\`}>{count}</span>
                  <span className="text-[9px] leading-tight text-slate-400 font-medium">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>`;

code = code.replace(oldSection, newSection);
fs.writeFileSync('src/components/SettingsView.tsx', code);
