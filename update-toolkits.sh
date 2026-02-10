#!/bin/bash
# Script to update remaining toolkit sessions with UX improvements

# List of toolkits to update
TOOLKITS=(
  "MentalModelMapperSession"
  "FlowBoardSession"
  "ExperimentBriefSession"
  "StrategySketchbookSession"
  "UXScorecardSession"
  "PersuasionCanvasSession"
  "PerformanceGridSession"
)

# Common imports to add
IMPORTS='import { 
  FloatingGenerateButton,
  ProgressIndicator,
  InputQualityIndicator,
  SmartPrompt,
  ContextualExample,
  WizardModeControls,
  CompletionCelebration
} from '\''@/components/ui/ToolkitUX'\'';
import { TOOLKIT_EXAMPLES } from '\''@/lib/examples'\'';'

# Common state to add
STATE='
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);'

echo "UX update instructions generated"
echo "Please manually add:"
echo "1. Imports for UX components"
echo "2. New state variables"
echo "3. Update generateContent to trigger celebration"
echo "4. Add floating button, progress indicator, wizard controls"
echo "5. Add quality indicators to inputs"
echo "6. Make output panel collapsible"
