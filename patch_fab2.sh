#!/bin/bash
awk '/<div className="h-px bg=\[#334155\]\/50 my-1 mx-2" \/>/{
    if (!done) {
        print "          <button"
        print "            type=\"button\""
        print "            id=\"fab-action-anticensor\""
        print "            onClick={() => handleAction(onOpenAntiCensor)}"
        print "            className=\"w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group\""
        print "          >"
        print "            <div className=\"w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all\">"
        print "              <ShieldAlert className=\"w-4 h-4 stroke-[2.2]\" />"
        print "            </div>"
        print "            <div>"
        print "              <div className=\"text-sm font-semibold text-slate-200\">Anti-Censor Tool</div>"
        print "              <div className=\"text-[10px] text-slate-400\">Bypass filter otomatis</div>"
        print "            </div>"
        print "          </button>"
        done=1
    }
}1' src/components/FloatingAddButton.tsx > temp.tsx && mv temp.tsx src/components/FloatingAddButton.tsx
