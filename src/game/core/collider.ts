export type Collider =
  | { shape: 'circle'; x: number; y: number; radius: number }
  | { shape: 'rect'; x: number; y: number; width: number; height: number }
