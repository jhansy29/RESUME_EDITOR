import { parseBoldText } from '../../utils/boldParser';

interface Props {
  text: string;
}

export function BulletItem({ text }: Props) {
  return <li>{parseBoldText(text)}</li>;
}
