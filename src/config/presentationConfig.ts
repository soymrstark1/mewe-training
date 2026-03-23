import { PresentationConfig } from '@/types/presentation';

export const mewePresentationConfig: PresentationConfig = {
  totalImageSlides: 10,
  finalWebApp: "/dashboard",
  actionsConfig: {
    2: {
      video: 'https://vimeo.com/EXAMPLE',
      videoLabel: 'Video Intro',
      videoVertical: true,
    },
    5: {
      web: 'https://mewetraining.com',
      tool: '/dashboard',
      dashboard: true,
    },
    7: {
      type: 'question',
      key: 'q1',
      text: '¿Te gustaría saber más?',
    },
  },
};
