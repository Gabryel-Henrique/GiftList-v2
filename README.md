<p align="center">
  <img src="public/icon-192.png" alt="Gifts of Love" width="96" />
</p>

<h1 align="center">Gifts of Love</h1>

<p align="center">Presentes, dates e planos do casal, num lugar só.</p>

---

O Gifts of Love é um app privado para um casal organizar junto os presentes, os lugares e programas que querem fazer e a agenda dos dois. Esta é a segunda versão: a primeira se chamava GiftList, era em .NET/Blazor e foi reescrita como PWA, para funcionar bem no celular.

Funciona no navegador e pode ser instalado no celular como app (PWA).

## O que dá pra fazer

- **Vínculo de casal**: cada um cria sua conta e um convida o outro pelo nome de usuário. Quase tudo no app exige estar vinculado.
- **Presentes**: sua wishlist, os presentes que você planeja dar (surpresa, o parceiro nunca vê), a wishlist do parceiro(a) para marcar o que você comprou e o histórico de comprados. Até 6 fotos por presente.
- **Restaurantes** e **Ideias para Dates**: o que vocês querem conhecer e as avaliações (0 a 10) de cada um sobre o que já foram/fizeram.
- **Filmes e Séries**: avaliações de 1 a 5 estrelas, com meia estrela.
- **Agenda**: cada um marca os dias em que está disponível e propõe um date ou restaurante; o outro confirma ou recusa e, depois do dia, vocês avaliam.
- **Tema claro e escuro**.

## Tecnologias

React 19, TypeScript, Vite, Tailwind CSS, Recharts e Supabase (Postgres, autenticação e Storage), com deploy na Netlify.

## Rodando na sua máquina

```bash
npm install
npm run dev
```

O app abre em `http://localhost:5174`.

Crie um arquivo `.env.local` na raiz com as credenciais do projeto Supabase (Project Settings → API):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

Diferente do Finza, o modo de desenvolvimento também usa o Supabase: as regras do casal (quem vê o quê, agenda, compras) vivem no banco e precisam de duas contas vinculadas.

## Banco de dados

O schema está na pasta `supabase/`. Numa instalação nova, rode no SQL Editor do Supabase, em ordem:

1. `migration.sql` — o schema inicial. Antes, troque o `<CHANGE-ME>` pelo código de convite: só quem tem esse código consegue criar conta.
2. `002_item_images.sql` — fotos de restaurantes e filmes.
3. `003_activity_and_profile.sql` — notificações e edição do perfil.
4. `004_memory_photos.sql` — fotos dos encontros na Nossa história.

Mudanças futuras viram novos arquivos numerados. O `import_legacy.sql` e os scripts em `scripts/` serviram uma única vez, para trazer os dados da versão .NET; ficam no repositório como registro.

As contas não têm e-mail: o login é só com usuário e senha, e não existe recuperação de senha.

Toda tabela usa Row Level Security: cada casal só enxerga os próprios dados, e os presentes "surpresa" só aparecem para quem os cadastrou. As regras que envolvem mais de uma linha (aceitar convite, marcar presente como comprado, confirmar um plano na agenda) ficam em funções do Postgres chamadas pelo app.

## Como o código está organizado

Cada funcionalidade tem sua pasta em `src/features/` (tela, tipos e repositório), e o que é compartilhado fica em `src/shared/`. As telas usam a interface `Repository<T>` (`src/shared/lib/storage.ts`) para as tabelas simples e `callRpc` (`src/shared/lib/rpc.ts`) para as funções do banco. O casal logado é carregado uma vez no `Layout` e fica disponível em qualquer tela pelo `useCouple()`.
