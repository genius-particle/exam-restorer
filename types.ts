
export type AppStep = 'upload' | 'crop' | 'restoring' | 'result';

export interface ImageFile {
  url: string;
  name: string;
  type: string;
}

export interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
