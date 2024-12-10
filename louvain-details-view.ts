import { ItemView, ValueComponent, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_LOUVAIN = 'louvain-details-view';

export class LouvainDetailsView extends ItemView {
	private detailsContainer: HTMLElement;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.detailsContainer = this.contentEl.createDiv({
			cls: 'louvain-details-container'
		});
        this.icon = 'dot-network';
	}

	getViewType(): string {
		return VIEW_TYPE_LOUVAIN;
	}

	getDisplayText(): string {
		return 'Sigma Communities Details View';
	}

	async onOpen(): Promise<void> {}

	async onClose(): Promise<void> {}

	public populate(details) {
        this.detailsContainer.empty();

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
		} = details;
        
		const numberContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
        });
        numberContainer.createEl('span', {
			text: 'Number of Communities: ',
            cls: 'louvain-detail-key'
		});
        numberContainer.createEl('span', {
            text: `${count}`,
            cls: 'louvain-detail-value'
        });
		
        const deltaContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        deltaContainer.createEl('span', {
            text: 'Number of 𝚫 Computations: ',
            cls: 'louvain-detail-key'
        });
        deltaContainer.createEl('span', {
            text: `${deltaComputations}`,
            cls: 'louvain-detail-value'
        });

		const levelContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        levelContainer.createEl('span', {
            text: 'Level: ',
            cls: 'louvain-detail-key'
        });
        levelContainer.createEl('span', {
            text: `${level}`,
            cls: 'louvain-detail-value'
        });

		const modularityContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        modularityContainer.createEl('span', {
            text: 'Modularity: ',
            cls: 'louvain-detail-key'
        });
        modularityContainer.createEl('span', {
            text: `${modularity}`,
            cls: 'louvain-detail-value'
        });

		const movesContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        movesContainer.createEl('span', {
            text: 'Moves: ',
            cls: 'louvain-detail-key'
        });
        movesContainer.createEl('span', {
            text: moves.join(',\t'),
            cls: 'louvain-detail-value'
        });
		
        const visitedContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        visitedContainer.createEl('span', {
            text: 'Visits per Node: ',
            cls: 'louvain-detail-key'
        });
        visitedContainer.createEl('span', {
            text: `${nodesVisited}`,
            cls: 'louvain-detail-value'
        });

		const resolutionContainer = this.detailsContainer.createEl('div', {
            cls: 'louvain-detail'
		});
        resolutionContainer.createEl('span', {
            text: 'Resolution: ',
            cls: 'louvain-detail-key'
        });
        resolutionContainer.createEl('span', {
            text: `${resolution}`,
            cls: 'louvain-detail-value'
        });
	}
}
