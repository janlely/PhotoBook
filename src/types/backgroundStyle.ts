export type BackgroundType = 'solid' | 'gradient' | 'image';

export type GradientType = 'linear' | 'radial';
export type Direction = 
  | 'to bottom' 
  | 'to top' 
  | 'to right' 
  | 'to left'
  | 'to bottom right'
  | 'to bottom left'
  | 'to top right'
  | 'to top left'
  | number; // 0-360 degrees

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface GradientStyle {
  type: 'gradient';
  gradientType: GradientType;
  direction: Direction;
  stops: GradientStop[];
  opacity?: number;
}

export interface SolidStyle {
  type: 'solid';
  color: string;
  opacity?: number;
}

export interface ImageStyle {
  type: 'image';
  url: string;
  size?: 'cover' | 'contain' | 'auto';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  repeat?: boolean;
  opacity?: number;
}

export type BackgroundStyle = SolidStyle | GradientStyle | ImageStyle;

export interface BackgroundSettings {
  background: BackgroundStyle;
  scope: 'page' | 'album';
}
