import { useSearchParams } from 'react-router-dom';
import { Card, LinkButton, PageHeader } from '../../shared/components/ui';
import { useCouple } from '../../shared/lib/useCouple';
import { partnerLabels } from '../../shared/lib/partnerLabels';

// Opened by the phone's Share menu (manifest `share_target`). Apps don't
// agree on where they put the link: some send `url`, others bury it in
// `text` ("Olha isso! https://..."), so look in all three.
function extractLink(params: URLSearchParams): string {
  for (const value of [params.get('url'), params.get('text'), params.get('title')]) {
    const match = value?.match(/https?:\/\/\S+/);
    if (match) return match[0];
  }
  return '';
}

function extractName(params: URLSearchParams, link: string): string {
  const title = params.get('title')?.trim() ?? '';
  if (title && !title.includes(link)) return title.slice(0, 200);
  const text = (params.get('text') ?? '').replace(link, '').trim();
  return text.slice(0, 200);
}

export default function ShareTarget() {
  const [params] = useSearchParams();
  const { partner } = useCouple();
  const labels = partnerLabels(partner?.gender);
  const link = extractLink(params);
  const name = extractName(params, link);
  const prefill = new URLSearchParams({ novo: '1', ...(link && { link }), ...(name && { nome: name }) }).toString();

  return (
    <div className="max-w-md">
      <PageHeader title="Adicionar presente 🎁" subtitle="Onde você quer guardar isso?" />
      <Card className="anim-fade-up p-5">
        {name && <p className="font-medium text-[var(--color-ink)] break-words">{name}</p>}
        {link ? (
          <p className="text-xs text-[var(--color-muted)] break-all mt-1">{link}</p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Não encontrei um link no que foi compartilhado — você pode preencher à mão.</p>
        )}
        <div className="grid gap-2 mt-5">
          <LinkButton to={`/my-wishlist?${prefill}`} replace>
            🎀 Na minha wishlist
          </LinkButton>
          <LinkButton to={`/gifts-for-partner?${prefill}`} replace variant="soft">
            🤫 Surpresa para {labels.heLower}
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
