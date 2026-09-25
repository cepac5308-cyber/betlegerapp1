import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

/* Tek çizgi kalınlığı, tutarlı 24×24 ızgara. Dolu varyant menüde
   seçili sekme için kullanılıyor. */
const P = ({ d, c, w = 1.9, fill = 'none' }) => (
  <Path d={d} stroke={c} strokeWidth={w} fill={fill} strokeLinecap="round" strokeLinejoin="round" />
);

export function Icon({ name, color = '#0F1729', size = 22, filled = false }) {
  const c = color;
  const box = { width: size, height: size, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home': return (
      <Svg {...box}>
        <P c={c} d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"
          fill={filled ? c : 'none'} />
        {!filled && <P c={c} d="M9.5 20.5v-6h5v6" />}
      </Svg>
    );
    case 'list': return (
      <Svg {...box}>
        <Rect x="4" y="3.5" width="16" height="17" rx="2.5" stroke={c} strokeWidth="1.9"
          fill={filled ? c : 'none'} />
        {!filled && <><P c={c} d="M8 8.5h8M8 12.5h8M8 16.5h5" /></>}
      </Svg>
    );
    case 'chart': return (
      <Svg {...box}>
        <P c={c} d="M4 20h16" />
        <Rect x="6" y="12" width="3.4" height="6" rx="1.2" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.9" />
        <Rect x="10.8" y="8" width="3.4" height="10" rx="1.2" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.9" />
        <Rect x="15.6" y="4.5" width="3.4" height="13.5" rx="1.2" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.9" />
      </Svg>
    );
    case 'user': return (
      <Svg {...box}>
        <Circle cx="12" cy="8.5" r="3.8" stroke={c} strokeWidth="1.9" fill={filled ? c : 'none'} />
        <P c={c} d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" fill={filled ? c : 'none'} />
      </Svg>
    );
    case 'plus': return <Svg {...box}><P c={c} w="2.4" d="M12 5.5v13M5.5 12h13" /></Svg>;
    case 'close': return <Svg {...box}><P c={c} d="M6 6l12 12M18 6L6 18" /></Svg>;
    case 'camera': return (
      <Svg {...box}>
        <P c={c} d="M4 8.5h3.2l1.4-2h6.8l1.4 2H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z" />
        <Circle cx="12" cy="13.5" r="3.4" stroke={c} strokeWidth="1.9" fill="none" />
      </Svg>
    );
    case 'alert': return (
      <Svg {...box}>
        <P c={c} d="M12 3.6 2.8 19.4h18.4z" />
        <P c={c} d="M12 9.5v4.2" /><Circle cx="12" cy="16.6" r="1.1" fill={c} />
      </Svg>
    );
    case 'clock': return (
      <Svg {...box}>
        <Circle cx="12" cy="12" r="8.4" stroke={c} strokeWidth="1.9" fill="none" />
        <P c={c} d="M12 7.4V12l3 1.8" />
      </Svg>
    );
    case 'shield': return (
      <Svg {...box}><P c={c} d="M12 3.2 5 6v5.6c0 4 2.9 7.6 7 9.2 4.1-1.6 7-5.2 7-9.2V6z" />
        <P c={c} d="M9.2 12.2l2 2 3.6-3.8" /></Svg>
    );
    case 'wallet': return (
      <Svg {...box}>
        <Rect x="3" y="6" width="18" height="13" rx="2.6" stroke={c} strokeWidth="1.9" fill="none" />
        <P c={c} d="M3 10.5h18" /><Circle cx="16.6" cy="14.6" r="1.3" fill={c} />
      </Svg>
    );
    case 'pen': return (
      <Svg {...box}><P c={c} d="M4 20l4.6-1.2L19.3 8.1a2 2 0 0 0 0-2.8l-.6-.6a2 2 0 0 0-2.8 0L5.2 15.4z" /></Svg>
    );
    case 'check': return <Svg {...box}><P c={c} w="2.3" d="M5 12.6l4.6 4.4L19 6.6" /></Svg>;
    case 'refresh': return (
      <Svg {...box}>
        <P c={c} d="M20 12a8 8 0 1 1-2.6-5.9" /><P c={c} d="M20 4.4V9h-4.6" />
      </Svg>
    );
    case 'trophy': return (
      <Svg {...box}>
        <P c={c} d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
        <P c={c} d="M7.5 5.5H5A2 2 0 0 0 5 9.5h2.5M16.5 5.5H19a2 2 0 0 1 0 4h-2.5M10 20h4M12 13.6V20" />
      </Svg>
    );
    case 'gauge': return (
      <Svg {...box}>
        <P c={c} d="M4.2 17a8.6 8.6 0 1 1 15.6 0" />
        <P c={c} d="M12 16.4 15.6 10" />
      </Svg>
    );
    default: return <Svg {...box}><Circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.9" fill="none" /></Svg>;
  }
}
