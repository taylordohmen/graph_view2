Obsidian plugin that provides an alternative to the built-in graph view.

Designed to handle very large vaults (containing tens of thousands of files or more) that the built-in graph view functionality has trouble with. The built-in graph view uses a force-based graph drawing algorithm, which takes forever to render and bogs down the entire application when the vault is large.

This plugin uses non-force-based graph layouts and graph drawing algorithms, relying on [Graphology](https://graphology.github.io) and [sigma.js](https://www.sigmajs.org) under the hood.
