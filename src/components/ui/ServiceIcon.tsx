interface ServiceIconProps {
  path: string
  bg: string
  stroke: string
  size?: number
  iconSize?: number
  radius?: number
}

export default function ServiceIcon({
  path,
  bg,
  stroke,
  size = 36,
  iconSize = 18,
  radius = 10,
}: ServiceIconProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path.split(' M').map((segment, i) => {
          const d = i === 0 ? segment : 'M' + segment
          return <path key={i} d={d} />
        })}
      </svg>
    </div>
  )
}
