import { ButtonComponent, DropdownComponent, ItemView, Notice, SearchComponent, TextComponent, TFile, WorkspaceLeaf, LinkCache } from 'obsidian';
import Graph from 'graphology';
import { circlepack, circular, random } from 'graphology-layout';
import louvain, { type DetailedLouvainOutput } from 'graphology-communities-louvain';
import * as gexf from 'graphology-gexf';
// import { hits } from 'graphology-metrics/centrality';
// import { connectedComponents, stronglyConnectedComponents } from 'graphology-components'
import Sigma from 'sigma';
import { animateNodes } from 'sigma/utils';
import { fitViewportToNodes } from '@sigma/utils';
import iwanthue from 'iwanthue';
import { SigmaDetailsView, VIEW_TYPE_SIGMA_DETAILS } from 'sigma-details-view';

export const VIEW_TYPE_SIGMA = 'sigma-graph-view';

const layouts = {
	random: 0,
	circular: 1,
	circlepack: 2
};

export class SigmaGraphView extends ItemView {
	private graphContainer: HTMLElement;
	private controlsContainer: HTMLElement;
	private graph: Graph;
	private renderer: Sigma;
	private cancelCurrentAnimation: (() => void) | null;
	private searchBar: SearchComponent;
	private layoutControls: DropdownComponent;
	private redrawButton: ButtonComponent;
	private fitButton: ButtonComponent;
	private searchContainer: HTMLElement;
	private scaleControls: TextComponent;
	private resolutionControls: TextComponent;
	private currentLayout: number;
	private detailsView: SigmaDetailsView;
	private louvainResolution: number;
	private layoutScale: number;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
		this.graphContainer = this.contentEl.createDiv({
			cls: 'sigma-graph-container'
		});
		this.controlsContainer = this.contentEl.createDiv({
			cls: 'sigma-controls-container'
		});
		this.cancelCurrentAnimation = null;
		this.icon = 'dot-network';
		this.louvainResolution = 3;
		this.layoutScale = 2;
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA;
	}

	getDisplayText(): string {
		return 'Sigma Graph View';
	}

	async onOpen(): Promise<void> {
		await this.buildGraph();
		await this.renderGraph();
		this.configureControls();
	}

	async onClose(): Promise<void> {
		if (this.renderer) {
			this.renderer.kill();
		}
	}

	private async buildGraph(): Promise<void> {
		this.graph = new Graph({ type: 'undirected' });

		const files: Array<TFile> = this.app.vault.getMarkdownFiles();

		// Add nodes for each file
		for (const file of files) {
			const name: string = file.basename;

			this.graph.addNode(file.path, {
				label: name,
				size: 1
			});
		}

		// Add edges based on links between files
		for (const file of files) {
			const links: Array<LinkCache> = this.app.metadataCache.getFileCache(file)?.links || [];
			for (const link of links) {
				const targetFile: TFile | null = this.app.metadataCache.getFirstLinkpathDest(
					link.link,
					file.path
				);
				if (targetFile) {
					try {
						this.graph.addEdge(file.path, targetFile.path, {
							weight: 1,
							color: '#00000000'
							// color: '#bababa'
						});
					} catch (e) {
						// Handle cases where the edge already exists
					}
					this.updateNodeSize(file.path);
					this.updateNodeSize(targetFile.path);
				}
			}
		}
	}

	private updateNodeSize(node: string): void {
		this.graph.updateNodeAttribute(node, 'size', (n: number): number => n + 1 / n ** 1.5);
	}

	private async renderGraph(): Promise<void> {
		// Clear the container
		this.graphContainer.empty();

		// compute communities and assign one to each node as an attribute
		louvain.assign(this.graph, {
			fastLocalMoves: true,
			resolution: this.louvainResolution
		});
		const details: DetailedLouvainOutput = louvain.detailed(this.graph);
		const communities = new Set<string>();
		this.graph.forEachNode((_, attrs): Set<string> => communities.add(attrs.community));
		const communitiesArray: Array<string> = Array.from(communities);

		// Determine colors, and color each node accordingly
		const palette: Record<string, string> = iwanthue(communities.size).reduce(
			(iter, color, i) => ({ ...iter, [communitiesArray[i]]: color }),
			{}
		);
		this.graph.forEachNode((node, attr) =>
			this.graph.setNodeAttribute(node, 'color', palette[attr.community])
		);

		// assign an (x, y) coordinate each node that respects the louvain communties
		circlepack.assign(this.graph, {
			hierarchyAttributes: ['community'],
			scale: this.layoutScale
		});
		this.currentLayout = layouts.circlepack;

		// Configure and initialize Sigma renderer
		this.renderer = new Sigma(this.graph, this.graphContainer, {
			allowInvalidContainer: true,
			// autocenter: true,
			renderEdgeLabels: false,
			renderLabels: false,
			minCameraRatio: 0.01,
			maxCameraRatio: 100,
			// This function tells sigma to grow sizes linearly with the zoom, instead of relatively to the zoom ratio's square root:
			// zoomToSizeRatioFunction: (x) => x,
			// If set to false, this disables the default sigma rescaling, so that by default, positions and sizes are preserved on screen (in pixels):
			autoRescale: false,
			// This flag tells sigma to disable the nodes and edges sizes interpolation and instead scales them in the same way it handles positions:
			itemSizesReference: 'positions',
			zIndex: true
		});

		// define event listeners for hover behavior
		this.enableHoverEffects();

		// Define event listeners for opening the corresponding note when right-clicking a node
		this.enableRightClick();

		this.fitToView();

		this.activateDetailsView(details);
	}

	private enableHoverEffects(): void {
		this.renderer.on('enterNode', ({ node }): void => {
			this.graph.setNodeAttribute(node, 'highlighted', true);
		});

		this.renderer.on('leaveNode', ({ node }): void => {
			this.graph.setNodeAttribute(node, 'highlighted', false);
		});
	}

	private enableRightClick(): void {
		this.renderer.on('rightClickNode', async ({ node }): Promise<void> => {
			const newTab: WorkspaceLeaf = this.app.workspace.getLeaf('tab');
			const nodeFile: TFile | null = this.app.vault.getFileByPath(node);
			if (nodeFile) {
				await newTab.openFile(nodeFile);
			} else {
				console.log(`File not found for node: ${node}`);
			}
		});
	}

	private intializeSearch(): void {
		this.searchContainer = this.controlsContainer.createDiv({
			cls: 'sigma-search-container'
		});
		this.searchBar = new SearchComponent(this.searchContainer);
		this.searchBar.inputEl.id = 'sigma-search';
		this.searchBar.setPlaceholder('Search nodes...');
		this.searchBar.clearButtonEl.id = 'sigma-search-clear-button';

		// Add search functionality
		this.searchBar.onChange((searchTerm: string): void => {
			if (searchTerm) {
				this.searchBar.setPlaceholder('');
			} else {
				this.searchBar.setPlaceholder('Search nodes...');
			}

			if (!searchTerm || searchTerm.length < 4) {
				// Reset all nodes to default state if search is empty
				this.graph.forEachNode((node: string): void => {
					this.graph.setNodeAttribute(node, 'highlighted', false);
				});
				return;
			}

			// Highlight nodes that match the search term
			this.graph.forEachNode((node: string): void => {
				const label = this.graph.getNodeAttribute(node, 'label');
				const matches = label.toLowerCase().includes(searchTerm.toLowerCase());
				this.graph.setNodeAttribute(node, 'highlighted', matches);
			});
		});
	}

	private initializeLayoutDropdown(): void {
		this.layoutControls = new DropdownComponent(this.controlsContainer);
		this.layoutControls.selectEl.id = 'sigma-layout-select';
		this.layoutControls.addOptions({
			circlepack: 'Circle Pack',
			random: 'Random',
			circular: 'Circular'
		});
		this.layoutControls.onChange(async (value: string): Promise<void> => {
			if (value === 'circlepack') {
				await this.circlepackLayout();
				this.currentLayout = layouts.circlepack;
				this.scaleControls.setValue('1.75');
			}
			if (value === 'random') {
				await this.randomLayout();
				this.currentLayout = layouts.random;
				this.scaleControls.setValue('1000');
			}
			if (value === 'circular') {
				await this.circularLayout();
				this.currentLayout = layouts.circular;
				this.scaleControls.setValue('500');
			}
		});
	}

	private initializeRedrawButton(): void {
		this.redrawButton = new ButtonComponent(this.controlsContainer);
		this.redrawButton.setButtonText('Redraw Graph');
		this.redrawButton.setClass('sigma-redraw-button');
		this.redrawButton.onClick(async (): Promise<void> => {
			await this.onClose();
			await this.renderGraph();
			new Notice('Redraw Complete');
		});
	}

	private initializeFitButton(): void {
		this.fitButton = new ButtonComponent(this.controlsContainer);
		this.fitButton.setButtonText('Fit To View');
		this.fitButton.setClass('sigma-fit-button');
		this.fitButton.onClick((): void => {
			this.fitToView();
		});
	}

	private initializeScaleControls(): void {
		this.scaleControls = new TextComponent(this.controlsContainer);
		this.scaleControls.inputEl.id = 'sigma-scale-input';
		this.scaleControls.setValue(this.layoutScale.toString());
		this.scaleControls.onChange(async (value: string): Promise<void> => {
			this.layoutScale = parseFloat(value);
			if (this.currentLayout === layouts.random) {
				await this.randomLayout(this.layoutScale);
			}
			if (this.currentLayout === layouts.circular) {
				await this.circularLayout(this.layoutScale);
			}
			if (this.currentLayout === layouts.circlepack) {
				await this.circlepackLayout(this.layoutScale);
			}
		});
	}

	private initializeResolutionControls(): void {
		this.resolutionControls = new TextComponent(this.controlsContainer);
		this.resolutionControls.inputEl.id = 'sigma-resolution-input';
		this.resolutionControls.setValue(this.louvainResolution.toString());
		this.resolutionControls.onChange(async (value: string): Promise<void> => {
			this.louvainResolution = parseFloat(value);
			await this.onClose();
			await this.renderGraph();
		});
	}

	private configureControls(): void {
		// Create and configure search bar
		this.intializeSearch();

		// Create and configure scale controls
		this.initializeScaleControls();

		this.initializeResolutionControls();

		// Create and configure layout selection dropdown
		this.initializeLayoutDropdown();

		// Create and configure various control buttons
		this.initializeRedrawButton();
		this.initializeFitButton();
	}

	private async fitToView(): Promise<void> {
		fitViewportToNodes(this.renderer, this.graph.nodes());
	}

	gexfString(): string {
		return gexf.write(this.graph);
	}

	private async circularLayout(scale?: number): Promise<void> {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}

		//since we want to use animations we need to process positions before applying them through animateNodes
		let circularPositions;
		if (typeof scale === 'undefined') {
			circularPositions = circular(this.graph);
		} else {
			circularPositions = circular(this.graph, { scale: scale });
		}

		this.cancelCurrentAnimation = animateNodes(this.graph, circularPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}

	private async randomLayout(scale?: number): Promise<void> {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}

		//since we want to use animations we need to process positions before applying them through animateNodes
		let randomPositions;
		if (typeof scale === 'undefined') {
			randomPositions = random(this.graph);
		} else {
			randomPositions = random(this.graph, { scale: scale });
		}

		this.cancelCurrentAnimation = animateNodes(this.graph, randomPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}

	private async circlepackLayout(scale?: number): Promise<void> {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}

		//since we want to use animations we need to process positions before applying them through animateNodes
		let circlepackPositions;
		if (typeof scale === 'undefined') {
			circlepackPositions = circlepack(this.graph, {
				hierarchyAttributes: ['community']
			});
		} else {
			circlepackPositions = circlepack(this.graph, {
				hierarchyAttributes: ['community'],
				scale: scale
			});
		}

		this.cancelCurrentAnimation = animateNodes(this.graph, circlepackPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}

	private async activateDetailsView(louvainDetails: DetailedLouvainOutput): Promise<void> {
		let leaf: WorkspaceLeaf | null = null;
		const leaves: Array<WorkspaceLeaf> = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIGMA_DETAILS);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_SIGMA_DETAILS,
					active: true
				});
			} else {
				console.error('Failed to get a leaf for Sigma Details View');
				return;
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		await this.app.workspace.revealLeaf(leaf);

		this.detailsView = leaf.view as SigmaDetailsView;
		// const { hubs, authorities } = hits(this.graph, {
		// 	maxIterations: 150,
		// 	tolerance: 1.e-6
		// });
		// const hubs = null;
		// const authorities = null;

		// const CCs = connectedComponents(this.graph);
		// console.log(CCs);

		// const SCCs = stronglyConnectedComponents(this.graph);
		// console.log(SCCs);

		louvainDetails.resolution = this.louvainResolution;
		this.detailsView.populate(louvainDetails);//, hubs, authorities);
	}
}
