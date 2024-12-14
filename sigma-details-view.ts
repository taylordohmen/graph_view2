import { ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_SIGMA_DETAILS = 'sigma-louvainDetails-view';

export class SigmaDetailsView extends ItemView {
	private detailsContainer: HTMLElement;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.detailsContainer = this.contentEl.createDiv({
			cls: 'sigma-louvainDetails-container'
		});
		this.icon = 'dot-network';
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA_DETAILS;
	}

	getDisplayText(): string {
		return 'Sigma Graph Details';
	}

	async onOpen(): Promise<void> {}

	async onClose(): Promise<void> {}

	public async populateLouvainDetails(louvainDetails) {
		const {
			communities,
			count,
			deltaComputations,
			dendrogram,
			level,
			modularity,
			moves,
			nodesVisited,
			resolution
		} = louvainDetails;

		const numberContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		numberContainer.createEl('span', {
			text: 'Number of Communities: ',
			cls: 'sigma-detail-key'
		});
		numberContainer.createEl('span', {
			text: `${count}`,
			cls: 'sigma-detail-value'
		});

		const deltaContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		deltaContainer.createEl('span', {
			text: 'Number of 𝚫 Computations: ',
			cls: 'sigma-detail-key'
		});
		deltaContainer.createEl('span', {
			text: `${deltaComputations}`,
			cls: 'sigma-detail-value'
		});

		const levelContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		levelContainer.createEl('span', {
			text: 'Level: ',
			cls: 'sigma-detail-key'
		});
		levelContainer.createEl('span', {
			text: `${level}`,
			cls: 'sigma-detail-value'
		});

		const modularityContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		modularityContainer.createEl('span', {
			text: 'Modularity: ',
			cls: 'sigma-detail-key'
		});
		modularityContainer.createEl('span', {
			text: `${modularity}`,
			cls: 'sigma-detail-value'
		});

		const movesContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		movesContainer.createEl('span', {
			text: 'Moves: ',
			cls: 'sigma-detail-key'
		});
		movesContainer.createEl('span', {
			text: moves.join(',\t'),
			cls: 'sigma-detail-value'
		});

		const visitedContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		visitedContainer.createEl('span', {
			text: 'Visits per Node: ',
			cls: 'sigma-detail-key'
		});
		visitedContainer.createEl('span', {
			text: `${nodesVisited}`,
			cls: 'sigma-detail-value'
		});

		const resolutionContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		resolutionContainer.createEl('span', {
			text: 'Resolution: ',
			cls: 'sigma-detail-key'
		});
		resolutionContainer.createEl('span', {
			text: `${resolution}`,
			cls: 'sigma-detail-value'
		});
	}

	public async populateHITSDetails(hubs, authorities) {
		let topHubs = Object.entries(hubs)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 25);
		topHubs = topHubs.map(([path, score]) => {
			const lastSlash = path.lastIndexOf('/');
			const name = lastSlash > -1 ? path.substring(lastSlash + 1, path.length - 3) : path;
			return `${name}: ${score}`;
		});
		console.log(topHubs);

		const hubsContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		hubsContainer.createEl('div', {
			text: 'Hub Nodes',
			cls: 'sigma-detail-key'
		});
		for (const hub of topHubs) {
			hubsContainer.createEl('div', {
				text: hub,
				cls: 'sigma-hub'
			});
		}

		let topAuthorities = Object.entries(authorities)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 25);
		topAuthorities = topAuthorities.map(([path, score]) => {
			const lastSlash = path.lastIndexOf('/');
			const name = lastSlash > -1 ? path.substring(lastSlash + 1, path.length - 3) : path;
			return `${name}: ${score}`;
		});
		console.log(topAuthorities);

		const authortiesContainer = this.detailsContainer.createEl('div', {
			cls: 'sigma-detail'
		});
		authortiesContainer.createEl('div', {
			text: 'Authority Nodes',
			cls: 'sigma-detail-key'
		});
		for (const authority of topAuthorities) {
			authortiesContainer.createEl('div', {
				text: authority,
				cls: 'sigma-authority'
			});
		}
	}

	public async populate(louvainDetails, hubs, authorities) {
		this.detailsContainer.empty();
		await this.populateLouvainDetails(louvainDetails);
		// await this.populateHITSDetails(hubs, authorities);
	}
}
