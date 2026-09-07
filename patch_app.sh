#!/bin/bash
# Insert import
sed -i '/import { FloatingAddButton } from/i import { AntiCensorModal } from "./components/AntiCensorModal";' src/App.tsx

# Insert state
sed -i '/const \[isAddWordOpen, setIsAddWordOpen\] = useState(false);/i \
  const [isAntiCensorOpen, setIsAntiCensorOpen] = useState(false);\
' src/App.tsx

# Update FAB
sed -i 's/onGoToSettings={() => setActiveTab('\''settings'\'')}/onGoToSettings={() => setActiveTab('\''settings'\'')}\n        onOpenAntiCensor={() => setIsAntiCensorOpen(true)}/g' src/App.tsx

# Insert Modal before the final </div>
sed -i '/      {isAddWordOpen &&/i \
      <AntiCensorModal\
        isOpen={isAntiCensorOpen}\
        onClose={() => setIsAntiCensorOpen(false)}\
        onNotify={addToast}\
      />\
' src/App.tsx
