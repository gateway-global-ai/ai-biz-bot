import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface VantaBackgroundProps {
  effect?: 'net' | 'waves' | 'halo' | 'cells';
  children?: React.ReactNode;
  className?: string;
}

export default function VantaBackground({ 
  effect = 'net', 
  children, 
  className = '' 
}: VantaBackgroundProps) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);

  useEffect(() => {
    let effectInstance: any = null;

    const loadVanta = async () => {
      if (!vantaRef.current) return;

      try {
        (window as any).THREE = THREE;
        
        let VANTA: any;
        
        switch (effect) {
          case 'waves':
            VANTA = (await import('vanta/dist/vanta.waves.min')).default;
            effectInstance = VANTA({
              el: vantaRef.current,
              THREE,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              scale: 1.0,
              scaleMobile: 1.0,
              color: 0x1a1a2e,
              shininess: 35.0,
              waveHeight: 15.0,
              waveSpeed: 0.75,
              zoom: 0.85
            });
            break;
          case 'halo':
            VANTA = (await import('vanta/dist/vanta.halo.min')).default;
            effectInstance = VANTA({
              el: vantaRef.current,
              THREE,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              baseColor: 0x1a1a2e,
              backgroundColor: 0x0a0a14,
              amplitudeFactor: 1.5,
              size: 1.2
            });
            break;
          case 'cells':
            VANTA = (await import('vanta/dist/vanta.cells.min')).default;
            effectInstance = VANTA({
              el: vantaRef.current,
              THREE,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              scale: 1.0,
              color1: 0x1a1a2e,
              color2: 0x4c1d95,
              size: 1.5,
              speed: 1.0
            });
            break;
          case 'net':
          default:
            VANTA = (await import('vanta/dist/vanta.net.min')).default;
            effectInstance = VANTA({
              el: vantaRef.current,
              THREE,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              scale: 1.0,
              scaleMobile: 1.0,
              color: 0x8b5cf6,
              backgroundColor: 0x0f0a1e,
              points: 10.0,
              maxDistance: 25.0,
              spacing: 18.0,
              showDots: true
            });
            break;
        }
        
        setVantaEffect(effectInstance);
      } catch (error) {
        console.warn('Vanta effect failed to load:', error);
      }
    };

    loadVanta();

    return () => {
      if (effectInstance) {
        effectInstance.destroy();
      }
    };
  }, [effect]);

  return (
    <div ref={vantaRef} className={`min-h-screen ${className}`}>
      {children}
    </div>
  );
}
