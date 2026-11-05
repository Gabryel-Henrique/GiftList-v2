import { formatShortDate, parseISODate } from '../../shared/lib/format';
import type { Notice } from '../../shared/lib/notices';

// "sex, 07/11" — short and readable in a one-line notice.
function shortDay(isoDate?: string): string {
  if (!isoDate) return '';
  const weekday = parseISODate(isoDate).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${weekday}, ${formatShortDate(isoDate).slice(0, 5)}`;
}

export function noticeEmoji(notice: Notice): string {
  switch (notice.kind) {
    case 'gift_added': return '🎁';
    case 'restaurant_added': case 'restaurant_reviewed': return '🍽️';
    case 'date_idea_added': case 'date_idea_reviewed': return '💡';
    case 'movie_added': case 'movie_reviewed': return '🎬';
    case 'availability_opened': return '🙋';
    case 'availability_closed': return '🙅';
    case 'entry_proposed': return '📅';
    case 'entry_confirmed': return '💞';
    case 'entry_declined': return '😕';
    case 'entry_cancelled': return '❌';
    case 'entry_done': return '✨';
    case 'couple_linked': return '💑';
  }
}

export function noticeText(notice: Notice, actor: string): string {
  const item = notice.title ? `"${notice.title}"` : '';
  const day = shortDay(notice.refDate);
  switch (notice.kind) {
    case 'gift_added': return `${actor} adicionou ${item} à wishlist`;
    case 'restaurant_added': return `${actor} adicionou o restaurante ${item}`;
    case 'date_idea_added': return `${actor} adicionou a ideia de date ${item}`;
    case 'movie_added': return `${actor} adicionou ${item} em Filmes e Séries`;
    case 'restaurant_reviewed': case 'date_idea_reviewed': case 'movie_reviewed': return `${actor} avaliou ${item}`;
    case 'availability_opened': return `${actor} está disponível em ${day}`;
    case 'availability_closed': return `${actor} não está mais disponível em ${day}`;
    case 'entry_proposed': return `${actor} propôs ${item} para ${day}`;
    case 'entry_confirmed': return `${actor} confirmou ${item} em ${day}`;
    case 'entry_declined': return `${actor} recusou ${item} em ${day}`;
    case 'entry_cancelled': return `O plano ${item} de ${day} foi cancelado`;
    case 'entry_done': return `${actor} marcou ${item} como feito — avalie também!`;
    case 'couple_linked': return 'Vocês estão vinculados! Bem-vindos ao Gifts of Love 💞';
  }
}

// Where tapping the notice takes you.
export function noticeLink(notice: Notice): string {
  switch (notice.kind) {
    case 'gift_added': return '/partner-wishlist';
    case 'restaurant_added': case 'restaurant_reviewed': return '/restaurants';
    case 'date_idea_added': case 'date_idea_reviewed': return '/date-ideas';
    case 'movie_added': case 'movie_reviewed': return '/movies';
    case 'couple_linked': return '/partner';
    default: return notice.refDate ? `/agenda?dia=${notice.refDate}` : '/agenda';
  }
}

export function timeAgo(timestamp: string): string {
  const minutes = Math.round((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
