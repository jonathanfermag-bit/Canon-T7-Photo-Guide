
export interface CameraSettings {
  mode: string;
  iso: string;
  aperture: string;
  shutterSpeed: string;
  whiteBalance: string;
  focusMode: string;
  lensSuggestion: string;
  tips: string[];
  explanation: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  description: string;
  image?: string;
  result: CameraSettings;
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  result: CameraSettings | null;
}

export interface UserLens {
  id: string;
  name: string;
}
