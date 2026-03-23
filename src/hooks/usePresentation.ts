import { useState, useCallback, useEffect } from 'react';
import { PresentationConfig } from '@/types/presentation';

export function usePresentation(config: PresentationConfig) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);

  const totalSteps = config.totalImageSlides + 1; // +1 for welcome

  useEffect(() => {
    setCurrentStep(0);
  }, []);

  const loadStep = useCallback((stepIndex: number) => {
    if (stepIndex >= totalSteps) {
      window.location.href = config.finalWebApp;
      return;
    }
    setCurrentStep(stepIndex);
    setIsActionMenuVisible(false);
  }, [totalSteps, config.finalWebApp]);

  const nextStep = useCallback(() => {
    loadStep(currentStep + 1);
  }, [currentStep, loadStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) loadStep(currentStep - 1);
  }, [currentStep, loadStep]);

  const currentActionConfig = currentStep > 0 ? config.actionsConfig[currentStep] : undefined;
  const showActionMenu = currentActionConfig && currentActionConfig.type !== 'question';

  const toggleActionMenu = useCallback(() => {
    if (showActionMenu) setIsActionMenuVisible(prev => !prev);
  }, [showActionMenu]);

  const hideActionMenu = useCallback(() => {
    setIsActionMenuVisible(false);
  }, []);

  const answerQuestion = useCallback((key: string, answer: string) => {
    localStorage.setItem(`mewe_answer_${key}`, answer);
    setTimeout(() => nextStep(), 500);
  }, [nextStep]);

  return {
    currentStep,
    totalSteps,
    isActionMenuVisible,
    currentActionConfig,
    showActionMenu: !!showActionMenu,
    nextStep,
    prevStep,
    toggleActionMenu,
    hideActionMenu,
    answerQuestion,
  };
}
