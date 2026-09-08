#!/bin/bash
sed -i '/import { AntiCensorModal } from/i import { NonLatinModal } from "./components/NonLatinModal";' src/App.tsx
sed -i '/const \[isAntiCensorOpen, setIsAntiCensorOpen\] = useState(false);/a \  const [isNonLatinOpen, setIsNonLatinOpen] = useState(false);' src/App.tsx
sed -i '/onOpenAntiCensor={() => setIsAntiCensorOpen(true)}/a \        onOpenNonLatin={() => setIsNonLatinOpen(true)}' src/App.tsx
sed -i '/<AntiCensorModal/i \      <NonLatinModal isOpen={isNonLatinOpen} onClose={() => setIsNonLatinOpen(false)} words={words} />' src/App.tsx
