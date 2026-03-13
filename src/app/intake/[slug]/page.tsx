import IntakePageClient from './IntakePageClient';

type Props = { params: Promise<{ slug?: string | string[] }> };

export default async function IntakePage({ params }: Props) {
  const resolved = await params;
  return <IntakePageClient params={resolved} />;
}
