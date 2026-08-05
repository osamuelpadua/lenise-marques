# Lenise Marques Interiores — site estático

Versão estática de `lenisemarquesinteriores.com`, convertida a partir do site
WordPress/Elementor original. Não depende de PHP, banco de dados, WordPress nem de
qualquer requisição a servidor externo: são apenas HTML, CSS, imagens e um único
arquivo JavaScript próprio.

## Publicar

Qualquer hospedagem de arquivos estáticos serve (GitHub Pages, Netlify, Vercel,
Apache, nginx, S3). Basta apontar a raiz do domínio para a raiz deste repositório.

Para testar localmente, qualquer servidor estático que envie o `Content-Type`
correto para `.webp` e `.woff2`:

```bash
npx serve .
```

Abrir os arquivos direto por `file://` não funciona bem: os caminhos relativos
entre páginas assumem um servidor.

## Estrutura

```
index.html               página inicial
projetos/                lista de projetos
apartamento-jp/  apartamento-sb/  casa-ae/
casa-mp/  pdv-entre-terras/  studio-rp/  suite-filha/
assets/
  css/fonts.css          Montserrat auto-hospedada (400/500/600/700)
  fonts/                 arquivos .woff2 da Montserrat
  js/site.js             menu, carrosséis e FAQ (única dependência de JS)
  plugins/  themes/  wp-includes/   CSS original do tema e dos plugins
  uploads/               imagens do site
```

## O que mudou em relação ao original

- **JavaScript**: jQuery, Elementor, Swiper, Owl Carousel e Essential Addons
  (≈1,2 MB) foram substituídos por `assets/js/site.js`, que reimplementa só o que
  estas páginas usam: menu mobile, carrossel de depoimentos, carrossel de projetos
  e o accordion do FAQ.
- **Fontes**: o WordPress pedia ao Google Fonts três famílias × 18 variantes cada.
  Apenas Montserrat é de fato aplicada; ela agora é servida do próprio site.
- **Tags do WordPress**: feeds RSS, oEmbed, `api.w.org`, `xmlrpc`, `canonical`,
  `shortlink` e `generator` foram removidos — apontavam para a instalação WP.
- **Data dos posts**: deixou de linkar para o arquivo por data do WordPress (página
  que não existe no estático) e aponta para o próprio post.

## Manutenção

O conteúdo é HTML estático — editar textos e trocar imagens é edição direta de
arquivo. As classes e a estrutura do Elementor foram preservadas, então o CSS
original continua valendo sem alteração.
