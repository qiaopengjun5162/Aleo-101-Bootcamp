export default {
  logo: (
    <div className="aleo-logo-nav">
      <span className="aleo-logo-text" role="img" aria-label="Aleo" />
      <a href="/learn/what-is-aleo/background">Learn</a>
      <a href="/build/getting-started">Build</a>
      <a href="/participate/wallets">Participate</a>
    </div>
  ),
  logoLink: false,
  project: {
    link: 'https://github.com/openbuildxyz/Aleo-101-Bootcamp',
  },
  docsRepositoryBase: 'https://github.com/openbuildxyz/Aleo-101-Bootcamp/tree/main/docs_v2',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Aleo 文档 v2',
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Aleo 文档 v2 - Learn, Build, Participate" />
    </>
  ),
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} © Aleo 文档 v2.
      </span>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
}
