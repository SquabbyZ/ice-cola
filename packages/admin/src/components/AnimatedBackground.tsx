'use client';

import React from 'react';
import FloatingLines from './FloatingLines';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      <FloatingLines
        enabledWaves={['top', 'middle', 'bottom']}
        lineCount={6}
        animationSpeed={0.8}
        mouseDamping={0.04}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default React.memo(AnimatedBackground);