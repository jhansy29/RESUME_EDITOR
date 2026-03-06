interface Props {
  title: string;
  style?: React.CSSProperties;
}

export function SectionHeading({ title, style }: Props) {
  return <div className="section-heading" style={style}>{title}</div>;
}
