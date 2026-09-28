export type PosterElementType = 
  | 'business_name'
  | 'qr_code'
  | 'logo'
  | 'food_photo'
  | 'hero_title'
  | 'subtitle'
  | 'english_text'
  | 'table_number'
  | 'working_hours'
  | 'contact_bar'
  | 'location_text'
  | 'rating_badge'
  | 'platform_branding'
  | 'custom_text'
  | 'custom_image'
  | 'shape_wave'
  | 'shape_rect'
  | 'shape_circle'
  | 'shape_badge'
  | 'shape_path'
  | 'divider';

export interface PosterElement {
  id: string;
  type: PosterElementType;
  name: string;
  x: number; // in pixels (relative to base canvas e.g. 794x1123)
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
  zIndex: number;
  opacity?: number; // 0 to 1
  locked?: boolean;
  hidden?: boolean;

  // Typography
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  textAlign?: 'right' | 'center' | 'left';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';

  // Box & Visual styling
  backgroundColor?: string;
  backgroundGradient?: {
    from: string;
    to: string;
    direction?: string;
  };
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  borderRadiusTopLeft?: number;
  borderRadiusTopRight?: number;
  borderRadiusBottomRight?: number;
  borderRadiusBottomLeft?: number;
  boxShadow?: string;
  padding?: number;

  // Image & Shape attributes
  src?: string;
  objectFit?: 'cover' | 'contain';
  clipShape?: 'none' | 'circle' | 'rounded';
  logoFilter?: 'original' | 'white' | 'black' | 'gold' | 'grayscale' | 'invert' | string;
  
  // QR Specific
  qrColor?: string;
  qrBgColor?: string;
  qrCenterLogo?: boolean;
  qrFrameBorder?: boolean;

  // SVG / Wave Specific
  svgPath?: string;
  svgFill?: string;
  flipX?: boolean;
  flipY?: boolean;
}

export type CanvasFormat = 
  | 'a4_portrait' 
  | 'a4_landscape' 
  | 'a5_portrait' 
  | 'table_tent' 
  | 'square_sticker';

export interface PosterTemplate {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  format: CanvasFormat;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundGradient?: {
    from: string;
    to: string;
    direction?: string;
  };
  elements: PosterElement[];
  isSystemPreset?: boolean;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
