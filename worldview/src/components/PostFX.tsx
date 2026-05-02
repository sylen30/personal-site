import { useLayerStore } from '../store/layers';

export function PostFX() {
  const postFx = useLayerStore((s) => s.postFx);
  if (postFx === 'crt') return <div className="crt-overlay" />;
  if (postFx === 'nightvision') return <div className="nv-overlay" />;
  return null;
}
