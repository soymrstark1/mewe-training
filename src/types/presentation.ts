export interface ActionConfig {
  type?: 'question';
  key?: string;
  text?: string;
  tool?: string;
  tool2?: string;
  tool3?: string;
  web?: string;
  web2?: string;
  web3?: string;
  dashboard?: boolean;
  video?: string;
  video2?: string;
  video3?: string;
  video4?: string;
  videoLabel?: string;
  videoLabel2?: string;
  videoLabel3?: string;
  videoLabel4?: string;
  videoVertical?: boolean;
  videoVertical2?: boolean;
  videoVertical3?: boolean;
  videoVertical4?: boolean;
  isSpecialSlide?: boolean;
  embeddedUrl?: string;
}

export interface PresentationConfig {
  totalImageSlides: number;
  finalWebApp: string;
  actionsConfig: Record<number, ActionConfig>;
}

export interface SlideData {
  id: string;
  index: number;
  backgroundImage?: string;
  isWelcome: boolean;
  interactiveConfig?: ActionConfig;
}
