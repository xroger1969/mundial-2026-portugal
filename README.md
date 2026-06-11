# Calendário Mundial 2026 — Portugal

Projeto em HTML, CSS e JavaScript para consultar o calendário do Mundial 2026 com horários em Portugal Continental, canais de transmissão em Portugal e preparação para resultados automáticos.

## Ficheiros principais

- `index.html` — estrutura da página
- `style.css` — layout mobile-first para iPhone
- `script.js` — filtros, pesquisa, resultados, exportação CSV, impressão/PDF e carregamento dos dados
- `data-part-1.js` a `data-part-4.js` — dados dos 104 jogos do calendário
- `results.json` — resultados e estado dos jogos
- `scripts/update-results.js` — script que atualiza os resultados via API
- `.github/workflows/update-results.yml` — automação GitHub Actions que corre a cada 15 minutos
- `livemode-link.js` — transforma LiveModeTV em ligação para o YouTube

## Como publicar no GitHub Pages

1. Vai a **Settings > Pages**.
2. Em **Build and deployment**, escolhe **Deploy from a branch**.
3. Escolhe a branch `main` e a pasta `/root`.
4. Guarda e aguarda o link público do GitHub Pages.

## Resultados automáticos

O site está preparado para mostrar:

- Por disputar
- Ao vivo
- Finalizado
- Resultado final, quando disponível

A atualização automática usa o serviço `football-data.org` através do workflow do GitHub Actions.

### Configuração necessária

1. Criar uma conta/chave em `football-data.org`.
2. Copiar a chave da API.
3. No GitHub, abrir este repositório.
4. Ir a **Settings > Secrets and variables > Actions**.
5. Escolher **New repository secret**.
6. Nome do segredo: `FOOTBALL_DATA_TOKEN`.
7. Valor do segredo: a chave copiada da API.
8. Guardar.

Depois disso, o workflow **Atualizar resultados do Mundial 2026** passa a atualizar o ficheiro `results.json` automaticamente.

Também pode ser executado manualmente em **Actions > Atualizar resultados do Mundial 2026 > Run workflow**.

## Nota importante

A rotina fica em modo de espera fora da janela principal do Mundial 2026 para evitar chamadas desnecessárias à API. Durante o torneio, o workflow corre de 15 em 15 minutos.

Algumas transmissões da fase a eliminar podem ser ajustadas pelas televisões até ao torneio. O ficheiro inclui notas quando a atribuição concreta ainda está a confirmar.
