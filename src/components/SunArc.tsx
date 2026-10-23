import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { fonts, usePalette } from '@/theme/tokens';

type Props = {
  /** 0 at sunrise, 1 at sunset; null at night (shows the moon). */
  progress: number | null;
  sunrise: string;
  middle: string;
  sunset: string;
};

const CX = 130;
const CY = 112;
const R = 100;

/** Sun path from sunrise (right, east in RTL reading order) to sunset (left). */
export function SunArc({ progress, sunrise, middle, sunset }: Props) {
  const palette = usePalette();
  const night = progress === null;
  const angle = Math.PI * (progress ?? 0);
  const sunX = CX + R * Math.cos(angle);
  const sunY = CY - R * Math.sin(angle);

  return (
    <Svg width={250} height={128} viewBox="0 0 260 132">
      <Path
        d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke={palette.line}
        strokeWidth={night ? 2 : 1.5}
        strokeDasharray={night ? undefined : '3 5'}
      />
      {!night && (
        <>
          <Path
            d={`M${CX + R} ${CY} A${R} ${R} 0 0 0 ${sunX} ${sunY}`}
            fill="none"
            stroke={palette.sun}
            strokeWidth={2.5}
          />
          <Circle cx={sunX} cy={sunY} r={8} fill={palette.sun} />
        </>
      )}
      {night && (
        <>
          <Circle cx={CX} cy={58} r={11} fill={palette.ink} />
          <Circle cx={CX + 6} cy={53} r={10} fill={palette.paper} />
          <Circle cx={88} cy={40} r={1.3} fill={palette.muted} />
          <Circle cx={176} cy={34} r={1.3} fill={palette.muted} />
          <Circle cx={100} cy={82} r={1} fill={palette.muted} />
        </>
      )}
      <Line x1={14} y1={CY} x2={246} y2={CY} stroke={palette.line} />
      <SvgText x={CX + R} y={CY + 16} textAnchor="middle" fontSize={10} fill={palette.muted} fontFamily={fonts.sans}>
        {sunrise}
      </SvgText>
      <SvgText x={CX} y={CY + 16} textAnchor="middle" fontSize={10} fill={palette.muted} fontFamily={fonts.sans}>
        {middle}
      </SvgText>
      <SvgText x={CX - R} y={CY + 16} textAnchor="middle" fontSize={10} fill={palette.muted} fontFamily={fonts.sans}>
        {sunset}
      </SvgText>
    </Svg>
  );
}
